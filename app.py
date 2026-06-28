import os
import re
import uuid
import datetime
import json
import io
import csv
import logging
from typing import List
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
                if k.strip() not in os.environ:
                    os.environ[k.strip()] = v.strip()

# ─── Config ───────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
MAX_FILE_MB     = int(os.getenv("MAX_FILE_SIZE_MB", "20"))
MAX_FILES       = int(os.getenv("MAX_FILES", "20"))

# ─── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI(title="OCR extraction API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── PaddleOCR singleton (lazy) ───────────────────────────────────────────────
_ocr = None

def get_ocr():
    global _ocr
    if _ocr is None:
        logger.info("Initialising PaddleOCR...")
        _ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        logger.info("PaddleOCR ready.")
    return _ocr


def run_ocr(image: Image.Image) -> str:
    """Run PaddleOCR on a PIL image and return concatenated text lines."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    result = get_ocr().ocr(buf.getvalue(), cls=True)
    lines = []
    if result and result[0]:
        for item in result[0]:
            lines.append(item[1][0])
    return "\n".join(lines)


# ─── Regex-based structured extraction (no LLM needed) ──────────────────────

def _find(pattern, text, flags=0, group=0):
    m = re.search(pattern, text, flags)
    return m.group(group).strip() if m else None


def extract_structured(raw_text: str, doc_type: str) -> dict:
    """
    Extract structured fields from raw OCR text using regex patterns.
    No external API required — works fully offline.
    """
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    if doc_type == "aadhaar":
        aadhaar = _find(r"\b\d{4}\s?\d{4}\s?\d{4}\b", raw_text)
        dob     = _find(r"\b\d{2}[/\-]\d{2}[/\-]\d{4}\b", raw_text)
        gender  = _find(r"\b(Male|Female|MALE|FEMALE|Transgender)\b", raw_text)
        phone   = _find(r"\b[6-9]\d{9}\b", raw_text)
        # Name is typically the line after "Government of India" or before the Aadhaar number block
        name = None
        for i, l in enumerate(lines):
            if re.search(r"government of india", l, re.I):
                if i + 1 < len(lines):
                    name = lines[i + 1]
                break
        # Fallback: first line that is all letters / spaces and length > 3
        if not name:
            for l in lines:
                if re.match(r"^[A-Za-z\s]{4,}$", l) and l.lower() not in ("government of india", "unique identification authority of india"):
                    name = l
                    break
        return {
            "document_type": "Aadhaar Card",
            "aadhaar_number": aadhaar,
            "full_name": name,
            "date_of_birth": dob,
            "gender": gender,
            "phone_linked": phone,
            "all_text_lines": lines,
        }

    elif doc_type == "pan":
        pan  = _find(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", raw_text)
        dob  = _find(r"\b\d{2}/\d{2}/\d{4}\b", raw_text)
        # Name is the line after "Name"
        name = None
        fathers_name = None
        for i, l in enumerate(lines):
            if re.match(r"^Name$", l, re.I) and i + 1 < len(lines):
                name = lines[i + 1]
            if re.match(r"father", l, re.I) and i + 1 < len(lines):
                fathers_name = lines[i + 1]
        return {
            "document_type": "PAN Card",
            "pan_number": pan,
            "full_name": name,
            "fathers_name": fathers_name,
            "date_of_birth": dob,
            "all_text_lines": lines,
        }

    elif doc_type == "business_card":
        email   = _find(r"\b[\w.%+\-]+@[\w.\-]+\.[a-zA-Z]{2,}\b", raw_text)
        phone   = _find(r"(?:\+91[-\s]?)?[6-9]\d{9}|\+?[\d\s\-().]{8,15}", raw_text)
        website = _find(r"(?:www\.|https?://)[^\s,]+", raw_text, re.I)
        # Name is usually the first significant line
        name    = lines[0] if lines else None
        company = None
        for l in lines[1:]:
            if not re.search(r"@|www\.|http|[+\d\-()]{7,}", l):
                company = l
                break
        return {
            "document_type": "Business Card",
            "name": name,
            "company_name": company,
            "email": email,
            "phone_number": phone,
            "website": website,
            "all_text_lines": lines,
        }

    elif doc_type == "invoice":
        inv_no  = _find(r"(?:Invoice|Bill|INV|No\.?)[#:\s\-]*([A-Z0-9/\-]+)", raw_text, re.I, 1)
        date    = _find(r"\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b", raw_text)
        total   = _find(r"(?:Grand\s*Total|Total\s*Amount|Amount\s*Due|TOTAL)[:\s]*(?:Rs\.?|₹|INR|\$)?[\s]*([\d,]+\.?\d*)", raw_text, re.I, 1)
        tax     = _find(r"(?:GST|Tax|VAT)[:\s]*(?:Rs\.?|₹)?[\s]*([\d,]+\.?\d*)", raw_text, re.I, 1)
        vendor  = lines[0] if lines else None
        return {
            "document_type": "Invoice / Bill",
            "vendor_name": vendor,
            "invoice_number": inv_no,
            "date": date,
            "tax_amount": tax,
            "total_amount": total,
            "all_text_lines": lines,
        }

    elif doc_type == "table":
        # Try to detect table rows: lines with multiple whitespace-separated tokens
        table_rows = []
        for l in lines:
            tokens = re.split(r"\s{2,}|\t", l)
            tokens = [t.strip() for t in tokens if t.strip()]
            if len(tokens) >= 2:
                table_rows.append(tokens)
        headers = table_rows[0] if table_rows else []
        rows    = table_rows[1:] if len(table_rows) > 1 else []
        return {
            "document_type": "Table Document",
            "detected_headers": headers,
            "detected_rows": rows,
            "total_rows": len(rows),
            "all_text_lines": lines,
        }

    else:  # general
        # Key–value pairs: lines like "Key: Value" or "Key  Value"
        kv_pairs = []
        for l in lines:
            m = re.match(r"^([A-Za-z][^:]{2,30}):\s*(.+)$", l)
            if m:
                kv_pairs.append({"key": m.group(1).strip(), "value": m.group(2).strip()})
        return {
            "document_type": "General Document",
            "extracted_key_values": kv_pairs,
            "total_lines": len(lines),
            "all_text_lines": lines,
        }


# ─── File helpers ─────────────────────────────────────────────────────────────

def load_pages(file_bytes: bytes, filename: str) -> list:
    """Return list of (label, PIL.Image) tuples from an image or PDF."""
    pages = []
    fname = (filename or "").lower()
    if fname.endswith(".pdf"):
        pdf = pdfium.PdfDocument(file_bytes)
        for i in range(len(pdf)):
            bmp = pdf[i].render(scale=2)
            pages.append((f"{filename} (Page {i+1})", bmp.to_pil()))
    else:
        pages.append((filename, Image.open(io.BytesIO(file_bytes)).convert("RGB")))
    return pages


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return HTMLResponse(
        "<h1>OCR extraction API is live.</h1>"
        "<p>Frontend: <a href='http://localhost:3000'>localhost:3000</a></p>"
    )


@app.get("/health")
def health():
    return {"status": "ok", "engine": "PaddleOCR", "version": "2.0.0"}


@app.post("/api/extract")
async def extract(
    files: List[UploadFile] = File(...),
    mode: str = Form("merge"),
    doc_type: str = Form("general"),
):
    if len(files) > MAX_FILES:
        raise HTTPException(400, f"Max {MAX_FILES} files per request.")

    logger.info(f"Extract — doc_type={doc_type} mode={mode} files={len(files)}")

    # ── Load all pages ──
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
        # OCR all pages, concatenate text, extract once
        parts = []
        for label, img in all_pages:
            logger.info(f"OCR: {label}")
            text = run_ocr(img)
            parts.append(f"=== {label} ===\n{text}")
        combined = "\n\n".join(parts)
        structured = extract_structured(combined, doc_type)
        results.append({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "filename": files[0].filename if len(files) == 1 else f"Merged ({len(files)} files)",
            "document_type": structured.get("document_type", doc_type),
            "structured_data": structured,
            "raw_text": combined,
        })

    else:  # batch — each page independently
        for label, img in all_pages:
            logger.info(f"Batch OCR: {label}")
            text = run_ocr(img)
            structured = extract_structured(text, doc_type)
            results.append({
                "id": str(uuid.uuid4()),
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "filename": label,
                "document_type": structured.get("document_type", doc_type),
                "structured_data": structured,
                "raw_text": text,
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
            "raw_text":  item.get("raw_text", "")[:500],  # first 500 chars
        }
        for k, v in struct.items():
            if k == "all_text_lines":
                continue  # skip the verbose lines list
            flat[k] = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v or "")
        flat_rows.append(flat)
        all_keys.update(flat.keys())

    # Stable column order
    priority = ["filename", "timestamp", "document_type"]
    headers = priority + sorted(k for k in all_keys if k not in priority)
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
