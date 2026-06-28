import csv
import io
import json
import uuid
import datetime
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from backend.config import MAX_FILE_SIZE_MB, MAX_FILES, GEMINI_API_KEY
from backend.ocr import load_pages_from_bytes
from backend.llm import call_gemini_multimodal, get_regex_fallback

logger = logging.getLogger("ocr-extraction.routes")
router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "Google Gemini 2.5 Flash Lite Multimodal",
        "gemini_configured": bool(GEMINI_API_KEY)
    }

@router.post("/api/extract")
async def extract_documents(
    files: List[UploadFile] = File(...),
    mode: str = Form("merge"),
    doc_type: str = Form("general")
):
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} files allowed.")

    all_pages = []
    for f in files:
        file_bytes = await f.read()
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File {f.filename} ({size_mb:.1f}MB) exceeds {MAX_FILE_SIZE_MB}MB limit."
            )
        try:
            all_pages.extend(load_pages_from_bytes(file_bytes, f.filename))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot load file {f.filename}: {e}")

    if not all_pages:
        raise HTTPException(status_code=400, detail="No valid pages extracted.")

    results = []
    
    if mode == "merge":
        logger.info(f"Processing multimodal merge extraction for {len(all_pages)} pages.")
        try:
            structured = call_gemini_multimodal(all_pages, doc_type)
        except HTTPException:
            logger.warning("Gemini multimodal call failed. Using offline regex fallback.")
            structured = get_regex_fallback("", doc_type)

        results.append({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "filename": files[0].filename if len(files) == 1 else f"Merged ({len(files)} files)",
            "document_type": structured.get("document_type", doc_type.capitalize()),
            "structured_data": structured,
            "raw_text": "\n".join(structured.get("all_text_lines", []))
        })
    else:
        for label, img in all_pages:
            logger.info(f"Processing multimodal batch extraction for page: {label}")
            try:
                structured = call_gemini_multimodal([(label, img)], doc_type)
            except HTTPException:
                logger.warning(f"Gemini multimodal call failed for {label}. Using offline regex fallback.")
                structured = get_regex_fallback("", doc_type)

            results.append({
                "id": str(uuid.uuid4()),
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "filename": label,
                "document_type": structured.get("document_type", doc_type.capitalize()),
                "structured_data": structured,
                "raw_text": "\n".join(structured.get("all_text_lines", []))
            })

    return results

@router.post("/api/export")
def export_results_to_csv(data: List[dict]):
    if not data:
        raise HTTPException(status_code=400, detail="No data available for export.")

    output = io.StringIO()
    writer = csv.writer(output)

    flat_rows = []
    all_keys = set()
    for item in data:
        struct = item.get("structured_data", {})
        flat = {
            "filename": item.get("filename", ""),
            "timestamp": item.get("timestamp", ""),
        }
        for k, v in struct.items():
            if k in ("all_text_lines", "sections"):
                continue
            flat[k] = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v or "")
        flat_rows.append(flat)
        all_keys.update(flat.keys())

    priority = ["filename", "timestamp", "document_type"]
    headers = priority + sorted(k for k in all_keys if k not in priority)
    writer.writerow(headers)
    for row in flat_rows:
        writer.writerow([row.get(h, "") for h in headers])

    stream = io.BytesIO(output.getvalue().encode("utf-8-sig"))
    return StreamingResponse(
        stream,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=extracted_data.csv"}
    )
