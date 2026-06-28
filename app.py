import os
import uuid
import datetime
import json
import io
import requests
import csv
import logging
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import pypdfium2 as pdfium
from PIL import Image
from paddleocr import PaddleOCR

# ─── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ocr-extraction")

# ─── Load .env if present (local dev only) ─────────────────────────────────────
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                if len(parts) == 2:
                    key, val = parts[0].strip(), parts[1].strip()
                    if key not in os.environ:
                        os.environ[key] = val

# ─── Config ────────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "15"))
MAX_FILES = int(os.getenv("MAX_FILES", "10"))

# ─── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="OCR extraction API",
    description="AI-powered document extraction service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── OCR (lazy-loaded singleton) ──────────────────────────────────────────────
_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        logger.info("Initializing PaddleOCR...")
        _ocr_instance = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        logger.info("PaddleOCR ready.")
    return _ocr_instance

# ─── OCR Helper ────────────────────────────────────────────────────────────────
def process_ocr_image(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    raw = buf.getvalue()
    ocr = get_ocr()
    result = ocr.ocr(raw, cls=True)
    lines = []
    if result and result[0]:
        for line in result[0]:
            lines.append(line[1][0])
    return "\n".join(lines)

# ─── Groq LLM Structuring ─────────────────────────────────────────────────────
PROMPTS = {
    "invoice": (
        "You are an AI invoice extractor. From the raw OCR text, extract and return ONLY a JSON object with:\n"
        "document_type, invoice_or_bill_number, date, due_date, vendor_name, vendor_address, "
        "customer_name, customer_address, line_items (list of {description, quantity, unit_price, total_price}), "
        "subtotal, tax, total_amount, currency."
    ),
    "business_card": (
        "You are a business card reader. From the raw OCR text, extract and return ONLY a JSON object with:\n"
        "document_type, name, job_title, company_name, email, phone_number, website, address."
    ),
    "table": (
        "You are a table extractor. From the raw OCR text, extract and return ONLY a JSON object with:\n"
        "document_type, tables (list of {table_title, headers (list), rows (list of lists)})."
    ),
    "aadhaar": (
        "You are an Aadhaar Card extractor. From the raw OCR text, extract and return ONLY a JSON object with:\n"
        "document_type, aadhaar_number (formatted XXXX XXXX XXXX), full_name, date_of_birth, gender, address."
    ),
    "pan": (
        "You are a PAN Card extractor. From the raw OCR text, extract and return ONLY a JSON object with:\n"
        "document_type, pan_number, full_name, fathers_name, date_of_birth."
    ),
    "general": (
        "You are a general document extractor. From the raw OCR text, extract and return ONLY a JSON object with:\n"
        "document_type, document_title, key_metadata (list of {key, value}), "
        "summary (paragraph), structured_sections (list of {heading, text})."
    ),
}

def call_groq_api(raw_text: str, doc_type: str) -> dict:
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Server configuration error: Groq API key is not set. Please contact the administrator."
        )
    
    prompt = PROMPTS.get(doc_type, PROMPTS["general"])
    prompt += "\nRespond ONLY with valid JSON. No markdown, no explanation, no code fences."

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "llama-3.3-70b-specdec",
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Raw OCR Text:\n{raw_text}\n\nJSON:"},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
        timeout=90,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"].strip()
    return json.loads(content)

# ─── File validation ──────────────────────────────────────────────────────────
def validate_files(files: List[UploadFile]):
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} files allowed per request.")

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return HTMLResponse("<h1>OCR extraction API is running.</h1><p>Access the frontend via Vercel.</p>")

@app.get("/health")
def health():
    return {"status": "ok", "groq_configured": bool(GROQ_API_KEY)}

@app.post("/api/extract")
async def extract_document(
    request: Request,
    files: List[UploadFile] = File(...),
    mode: str = Form("merge"),
    doc_type: str = Form("general"),
):
    validate_files(files)
    logger.info(f"Extract request: doc_type={doc_type}, mode={mode}, files={len(files)}")

    all_pages = []

    for file in files:
        file_bytes = await file.read()

        # File size check
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' is {size_mb:.1f} MB. Maximum allowed is {MAX_FILE_SIZE_MB} MB."
            )

        fname = (file.filename or "").lower()
        if fname.endswith(".pdf"):
            try:
                pdf = pdfium.PdfDocument(file_bytes)
                for page_idx in range(len(pdf)):
                    page = pdf[page_idx]
                    bitmap = page.render(scale=2)
                    pil_img = bitmap.to_pil()
                    all_pages.append((f"{file.filename} (Page {page_idx + 1})", pil_img))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to parse PDF '{file.filename}': {e}")
        else:
            try:
                pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
                all_pages.append((file.filename, pil_img))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to open image '{file.filename}': {e}")

    if not all_pages:
        raise HTTPException(status_code=400, detail="No valid pages found in uploaded files.")

    results = []

    if mode == "merge":
        combined_parts = []
        for name, img in all_pages:
            logger.info(f"OCR: {name}")
            text = process_ocr_image(img)
            combined_parts.append(f"=== {name} ===\n{text}")
        combined_text = "\n\n".join(combined_parts)

        try:
            structured = call_groq_api(combined_text, doc_type)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI structuring failed: {e}")

        results.append({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "filename": files[0].filename if len(files) == 1 else f"Merged ({len(files)} files)",
            "document_type": structured.get("document_type", doc_type.capitalize()),
            "structured_data": structured,
            "raw_text": combined_text,
        })

    else:  # batch
        for name, img in all_pages:
            logger.info(f"Batch OCR: {name}")
            text = process_ocr_image(img)
            try:
                structured = call_groq_api(text, doc_type)
                results.append({
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                    "filename": name,
                    "document_type": structured.get("document_type", doc_type.capitalize()),
                    "structured_data": structured,
                    "raw_text": text,
                })
            except HTTPException:
                raise
            except Exception as e:
                results.append({
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                    "filename": name,
                    "document_type": "Error",
                    "structured_data": {"error": str(e)},
                    "raw_text": text,
                })

    logger.info(f"Extraction complete: {len(results)} result(s)")
    return results


@app.post("/api/export")
def export_csv(data: List[dict]):
    if not data:
        raise HTTPException(status_code=400, detail="No data to export.")

    output = io.StringIO()
    writer = csv.writer(output)

    flat_rows = []
    all_keys = set()

    for item in data:
        struct = item.get("structured_data", {})
        flat = {"filename": item.get("filename", ""), "timestamp": item.get("timestamp", "")}
        if "error" in struct:
            flat["error"] = struct["error"]
        else:
            for k, v in struct.items():
                flat[k] = json.dumps(v) if isinstance(v, (dict, list)) else str(v)
        flat_rows.append(flat)
        all_keys.update(flat.keys())

    # Order columns: filename first, timestamp second, then alphabetical
    headers = ["filename", "timestamp"]
    for k in sorted(all_keys):
        if k not in headers:
            headers.append(k)

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
    uvicorn.run(app, host="0.0.0.0", port=port)
