import os
import re
import uuid
import datetime
import json
import io
import csv
import time
import logging
from typing import List
import requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import pypdfium2 as pdfium
from PIL import Image
from paddleocr import PaddleOCR

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ocr-extraction")

# ─── Load .env ────────────────────────────────────────────────────────────────
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip()
                if k not in os.environ:
                    os.environ[k] = v

# ─── Config ───────────────────────────────────────────────────────────────────
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
MAX_FILE_MB     = int(os.getenv("MAX_FILE_SIZE_MB", "20"))
MAX_FILES       = int(os.getenv("MAX_FILES", "20"))
GROQ_MODEL      = "llama-3.3-70b-versatile"   # best available on Groq

# ─── FastAPI ──────────────────────────────────────────────────────────────────
app = FastAPI(title="OCR extraction API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── PaddleOCR singleton ──────────────────────────────────────────────────────
_ocr = None

def get_ocr() -> PaddleOCR:
    global _ocr
    if _ocr is None:
        logger.info("Initialising PaddleOCR …")
        _ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        logger.info("PaddleOCR ready.")
    return _ocr


def run_ocr(image: Image.Image) -> str:
    """Return concatenated text lines from a PIL image using PaddleOCR."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    result = get_ocr().ocr(buf.getvalue(), cls=True)
    lines = []
    if result and result[0]:
        for item in result[0]:
            text, confidence = item[1]
            if confidence > 0.4:          # skip very low confidence tokens
                lines.append(text)
    return "\n".join(lines)


# ─── Groq LLM structuring ─────────────────────────────────────────────────────

GROQ_PROMPTS = {
    "invoice": """You are an expert invoice parser. Given raw OCR text from an invoice or bill, extract every relevant field accurately.
Return ONLY a valid JSON object with these exact keys:
{
  "document_type": "Invoice" or "Bill",
  "invoice_number": "...",
  "date": "DD/MM/YYYY or as found",
  "due_date": "...",
  "vendor_name": "...",
  "vendor_address": "...",
  "vendor_gstin": "...",
  "customer_name": "...",
  "customer_address": "...",
  "customer_gstin": "...",
  "line_items": [{"description":"...","quantity":"...","unit_price":"...","total_price":"..."}],
  "subtotal": "...",
  "discount": "...",
  "tax_percentage": "...",
  "tax_amount": "...",
  "total_amount": "...",
  "amount_in_words": "...",
  "payment_terms": "...",
  "bank_details": "...",
  "currency": "INR or as found",
  "notes": "..."
}
If a field is not found, use null. Do NOT add markdown, code fences, or explanation.""",

    "business_card": """You are an expert business card reader. Given raw OCR text from a business card, extract all contact details.
Return ONLY a valid JSON object with these exact keys:
{
  "document_type": "Business Card",
  "full_name": "...",
  "job_title": "...",
  "department": "...",
  "company_name": "...",
  "email": "...",
  "phone_primary": "...",
  "phone_secondary": "...",
  "website": "...",
  "address": "...",
  "linkedin": "...",
  "other_social": "..."
}
If a field is not found, use null. Do NOT add markdown, code fences, or explanation.""",

    "table": """You are an expert table extractor. Given raw OCR text that contains one or more tables, extract all tables with full structure.
Return ONLY a valid JSON object with these exact keys:
{
  "document_type": "Table Document",
  "tables": [
    {
      "table_index": 1,
      "table_title": "... or null",
      "headers": ["col1", "col2", "..."],
      "rows": [["val1","val2","..."], ["val1","val2","..."]]
    }
  ],
  "summary": "brief description of what the table(s) contain"
}
If a field is not found, use null. Do NOT add markdown, code fences, or explanation.""",

    "aadhaar": """You are an expert Aadhaar card parser for Indian identity documents. Given raw OCR text, extract details accurately.
Return ONLY a valid JSON object with these exact keys:
{
  "document_type": "Aadhaar Card",
  "aadhaar_number": "XXXX XXXX XXXX formatted",
  "full_name": "...",
  "date_of_birth": "DD/MM/YYYY",
  "year_of_birth": "YYYY if full DOB not visible",
  "gender": "Male or Female or Transgender",
  "address": {
    "house": "...",
    "street": "...",
    "locality": "...",
    "district": "...",
    "state": "...",
    "pincode": "..."
  },
  "enrolled_at": "... or null",
  "vid": "Virtual ID if present or null"
}
If a field is not found, use null. Do NOT add markdown, code fences, or explanation.""",

    "pan": """You are an expert PAN card parser for Indian tax documents. Given raw OCR text, extract details accurately.
Return ONLY a valid JSON object with these exact keys:
{
  "document_type": "PAN Card",
  "pan_number": "ABCDE1234F format",
  "full_name": "...",
  "fathers_name": "...",
  "date_of_birth": "DD/MM/YYYY",
  "issuing_authority": "Income Tax Department, Government of India",
  "signature_present": true or false
}
If a field is not found, use null. Do NOT add markdown, code fences, or explanation.""",

    "general": """You are an expert document analyst. Given raw OCR text from any document, extract its structure intelligently.
Return ONLY a valid JSON object with these exact keys:
{
  "document_type": "descriptive label like 'Medical Report', 'Government Letter', 'Receipt', etc.",
  "document_title": "...",
  "issuing_authority": "...",
  "date": "...",
  "reference_number": "...",
  "key_fields": [{"label": "...", "value": "..."}],
  "summary": "2-3 sentence summary of what this document is and contains",
  "sections": [{"heading": "...", "content": "..."}],
  "important_numbers": ["any important numeric values, IDs, amounts"],
  "action_required": "any action or deadline mentioned, or null"
}
If a field is not found, use null. Do NOT add markdown, code fences, or explanation.""",
}


def call_groq(raw_text: str, doc_type: str, retries: int = 2) -> dict:
    """Call Groq API to structure raw OCR text. Retries on transient errors."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not configured on the server. Add it to your .env file.",
        )

    prompt = GROQ_PROMPTS.get(doc_type, GROQ_PROMPTS["general"])

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": (
                    f"Here is the raw OCR text extracted by PaddleOCR:\n\n"
                    f"```\n{raw_text}\n```\n\n"
                    "Now return the structured JSON:"
                ),
            },
        ],
        "temperature": 0.05,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
    }

    last_err = None
    for attempt in range(retries + 1):
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=90,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            # Strip accidental markdown fences if any
            content = re.sub(r"^```json\s*|^```\s*|\s*```$", "", content, flags=re.M).strip()
            return json.loads(content)
        except requests.HTTPError as e:
            last_err = e
            if resp.status_code == 429 and attempt < retries:
                logger.warning("Groq rate limit hit — waiting 3s before retry …")
                time.sleep(3)
            else:
                raise HTTPException(status_code=502, detail=f"Groq API error: {e}")
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(1)
            else:
                raise HTTPException(status_code=500, detail=f"Groq parsing failed: {e}")

    raise HTTPException(status_code=500, detail=f"All Groq retries failed: {last_err}")


# ─── Regex fallback (used if Groq is unavailable) ─────────────────────────────

def _find(pattern, text, flags=0, group=0):
    m = re.search(pattern, text, flags)
    return m.group(group).strip() if m else None

def regex_fallback(raw_text: str, doc_type: str) -> dict:
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    if doc_type == "aadhaar":
        return {
            "document_type": "Aadhaar Card",
            "aadhaar_number": _find(r"\b\d{4}\s?\d{4}\s?\d{4}\b", raw_text),
            "date_of_birth":  _find(r"\b\d{2}[/\-]\d{2}[/\-]\d{4}\b", raw_text),
            "gender":         _find(r"\b(Male|Female|Transgender)\b", raw_text, re.I),
            "all_text_lines": lines,
        }
    if doc_type == "pan":
        return {
            "document_type": "PAN Card",
            "pan_number":    _find(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", raw_text),
            "date_of_birth": _find(r"\b\d{2}/\d{2}/\d{4}\b", raw_text),
            "all_text_lines": lines,
        }
    if doc_type == "business_card":
        return {
            "document_type": "Business Card",
            "email":         _find(r"\b[\w.%+\-]+@[\w.\-]+\.[a-zA-Z]{2,}\b", raw_text),
            "phone_primary": _find(r"(?:\+91[-\s]?)?[6-9]\d{9}", raw_text),
            "website":       _find(r"(?:www\.|https?://)[^\s,]+", raw_text, re.I),
            "all_text_lines": lines,
        }
    return {"document_type": "General Document", "all_text_lines": lines}


# ─── File helpers ─────────────────────────────────────────────────────────────

def load_pages(file_bytes: bytes, filename: str) -> list:
    pages = []
    fname = (filename or "").lower()
    if fname.endswith(".pdf"):
        pdf = pdfium.PdfDocument(file_bytes)
        for i in range(len(pdf)):
            img = pdf[i].render(scale=2).to_pil()
            pages.append((f"{filename} (Page {i + 1})", img))
    else:
        pages.append((filename, Image.open(io.BytesIO(file_bytes)).convert("RGB")))
    return pages


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return HTMLResponse(
        "<h1>OCR extraction API v3 — PaddleOCR + Groq</h1>"
        "<p>Frontend: <a href='http://localhost:3000'>localhost:3000</a></p>"
        "<p><a href='/health'>/health</a></p>"
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "PaddleOCR + Groq",
        "model": GROQ_MODEL,
        "groq_configured": bool(GROQ_API_KEY),
    }


@app.post("/api/extract")
async def extract(
    files: List[UploadFile] = File(...),
    mode:     str = Form("merge"),
    doc_type: str = Form("general"),
):
    if len(files) > MAX_FILES:
        raise HTTPException(400, f"Max {MAX_FILES} files per request.")

    logger.info(f"Extract — doc_type={doc_type} mode={mode} files={len(files)}")

    # Load all pages from every uploaded file
    all_pages: list = []
    for f in files:
        raw = await f.read()
        if len(raw) / (1024 * 1024) > MAX_FILE_MB:
            raise HTTPException(400, f"'{f.filename}' exceeds {MAX_FILE_MB} MB limit.")
        try:
            all_pages.extend(load_pages(raw, f.filename))
        except Exception as e:
            raise HTTPException(400, f"Cannot open '{f.filename}': {e}")

    if not all_pages:
        raise HTTPException(400, "No valid pages found.")

    results = []

    if mode == "merge":
        # OCR all pages → merge text → one Groq call
        parts = []
        for label, img in all_pages:
            logger.info(f"OCR (merge): {label}")
            text = run_ocr(img)
            parts.append(f"=== {label} ===\n{text}")
        combined = "\n\n".join(parts)

        try:
            structured = call_groq(combined, doc_type)
        except HTTPException:
            logger.warning("Groq unavailable — using regex fallback")
            structured = regex_fallback(combined, doc_type)

        results.append({
            "id":            str(uuid.uuid4()),
            "timestamp":     datetime.datetime.utcnow().isoformat(),
            "filename":      files[0].filename if len(files) == 1 else f"Merged ({len(files)} files)",
            "document_type": structured.get("document_type", doc_type.capitalize()),
            "structured_data": structured,
            "raw_text":      combined,
        })

    else:  # batch — each page is a separate document
        for label, img in all_pages:
            logger.info(f"OCR (batch): {label}")
            text = run_ocr(img)
            try:
                structured = call_groq(text, doc_type)
            except HTTPException:
                logger.warning(f"Groq unavailable for '{label}' — using regex fallback")
                structured = regex_fallback(text, doc_type)

            results.append({
                "id":            str(uuid.uuid4()),
                "timestamp":     datetime.datetime.utcnow().isoformat(),
                "filename":      label,
                "document_type": structured.get("document_type", doc_type.capitalize()),
                "structured_data": structured,
                "raw_text":      text,
            })

    logger.info(f"Done — {len(results)} result(s)")
    return results


@app.post("/api/export")
def export_csv(data: List[dict]):
    if not data:
        raise HTTPException(400, "No data to export.")

    output = io.StringIO()
    writer = csv.writer(output)

    flat_rows, all_keys = [], set()
    for item in data:
        struct = item.get("structured_data", {})
        flat = {
            "filename":  item.get("filename", ""),
            "timestamp": item.get("timestamp", ""),
        }
        for k, v in struct.items():
            if k in ("all_text_lines", "sections"):
                continue
            flat[k] = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v or "")
        flat_rows.append(flat)
        all_keys.update(flat.keys())

    priority = ["filename", "timestamp", "document_type"]
    headers  = priority + sorted(k for k in all_keys if k not in priority)
    writer.writerow(headers)
    for row in flat_rows:
        writer.writerow([row.get(h, "") for h in headers])

    stream = io.BytesIO(output.getvalue().encode("utf-8-sig"))
    return StreamingResponse(
        stream,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=extracted_data.csv"},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
