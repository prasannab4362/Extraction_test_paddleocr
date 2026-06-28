import os
import uuid
import datetime
import json
import io
import requests
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pypdfium2 as pdfium
from PIL import Image
from paddleocr import PaddleOCR

app = FastAPI(title="PaddleOCR + Groq Extractor")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "db.json"

# In-memory OCR initialization helper (lazy loading)
_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        # Initialize PaddleOCR CPU
        _ocr_instance = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr_instance

# Local JSON Database helpers
def load_db():
    if not os.path.exists(DB_PATH):
        return []
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_db(data):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# Helper to run OCR on an image (PIL Image or path)
def process_ocr_image(image: Image.Image) -> str:
    # Save PIL Image to temp bytes for PaddleOCR to read
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='PNG')
    img_byte_arr = img_byte_arr.getvalue()
    
    ocr = get_ocr()
    result = ocr.ocr(img_byte_arr, cls=True)
    
    extracted_lines = []
    if result and result[0]:
        for line in result[0]:
            text = line[1][0]
            extracted_lines.append(text)
    return "\n".join(extracted_lines)

# Structuring Prompt & Groq API Request
def call_groq_api(raw_text: str, api_key: str) -> dict:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    system_prompt = (
        "You are an AI data extractor. Your task is to extract information from raw OCR text and structure it into a clean, valid JSON object.\n"
        "Identify if the document is an Invoice, Bill, or Warranty and extract the corresponding fields:\n\n"
        "For Invoices / Bills:\n"
        "- document_type: Invoice or Bill\n"
        "- invoice_or_bill_number\n"
        "- date\n"
        "- due_date\n"
        "- vendor_name\n"
        "- vendor_address\n"
        "- customer_name\n"
        "- customer_address\n"
        "- line_items: list of objects containing (description, quantity, unit_price, total_price)\n"
        "- subtotal\n"
        "- tax\n"
        "- total_amount\n"
        "- currency\n\n"
        "For Warranties:\n"
        "- document_type: Warranty\n"
        "- product_name\n"
        "- model_number\n"
        "- serial_number\n"
        "- purchase_date\n"
        "- warranty_period\n"
        "- warranty_expiry_date\n"
        "- provider_name\n"
        "- customer_name\n"
        "- coverage_details\n\n"
        "Respond ONLY with a valid JSON object matching the structures above. Do not include markdown code block formatting (such as ```json) or any conversational text."
    )
    
    payload = {
        "model": "llama-3.3-70b-specdec",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Raw OCR Text:\n{raw_text}\n\nStructured JSON:"}
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=60)
    response.raise_for_status()
    res_data = response.json()
    output_text = res_data["choices"][0]["message"]["content"].strip()
    return json.loads(output_text)

@app.post("/api/extract")
async def extract_document(
    files: List[UploadFile] = File(...),
    mode: str = Form("merge"),  # "merge" or "batch"
    x_groq_api_key: Optional[str] = Header(None)
):
    # Fetch API Key from header or environment variable
    api_key = x_groq_api_key or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Groq API Key is missing. Please provide it in the UI or set GROQ_API_KEY environment variable."
        )

    results = []
    
    # We will process files. If PDF, we render pages to images.
    all_pages = []
    for file in files:
        file_bytes = await file.read()
        filename = file.filename.lower()
        
        if filename.endswith(".pdf"):
            try:
                pdf = pdfium.PdfDocument(file_bytes)
                for page_idx in range(len(pdf)):
                    page = pdf[page_idx]
                    bitmap = page.render(scale=2)
                    pil_img = bitmap.to_pil()
                    all_pages.append((f"{file.filename} (Page {page_idx+1})", pil_img))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to process PDF file {file.filename}: {str(e)}")
        else:
            try:
                pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
                all_pages.append((file.filename, pil_img))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to open image file {file.filename}: {str(e)}")

    if mode == "merge":
        # Merge Mode: Run OCR on all images, concatenate, call Groq once
        combined_text_lines = []
        for name, img in all_pages:
            print(f"[*] Running OCR on page/file: {name}")
            text = process_ocr_image(img)
            combined_text_lines.append(f"--- Document: {name} ---\n{text}")
            
        combined_text = "\n\n".join(combined_text_lines)
        
        try:
            structured_data = call_groq_api(combined_text, api_key)
            doc_id = str(uuid.uuid4())
            doc_entry = {
                "id": doc_id,
                "timestamp": datetime.datetime.now().isoformat(),
                "filename": files[0].filename if len(files) == 1 else f"Merged ({len(files)} files)",
                "document_type": structured_data.get("document_type", "Unknown"),
                "structured_data": structured_data,
                "raw_text": combined_text
            }
            db = load_db()
            db.append(doc_entry)
            save_db(db)
            results.append(doc_entry)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to structure merged text: {str(e)}")
            
    else:
        # Batch Mode: Process each page/image separately
        for name, img in all_pages:
            print(f"[*] Running batch OCR on page/file: {name}")
            text = process_ocr_image(img)
            try:
                structured_data = call_groq_api(text, api_key)
                doc_id = str(uuid.uuid4())
                doc_entry = {
                    "id": doc_id,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "filename": name,
                    "document_type": structured_data.get("document_type", "Unknown"),
                    "structured_data": structured_data,
                    "raw_text": text
                }
                db = load_db()
                db.append(doc_entry)
                save_db(db)
                results.append(doc_entry)
            except Exception as e:
                # Add error placeholder so loop continues
                results.append({
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.datetime.now().isoformat(),
                    "filename": name,
                    "document_type": "Error",
                    "structured_data": {"error": f"Failed to structure page: {str(e)}"},
                    "raw_text": text
                })

    return results

@app.get("/api/documents")
def get_documents():
    return load_db()

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    db = load_db()
    updated_db = [doc for doc in db if doc["id"] != doc_id]
    if len(updated_db) == len(db):
        raise HTTPException(status_code=404, detail="Document not found")
    save_db(updated_db)
    return {"status": "success", "message": "Document deleted"}

@app.get("/", response_class=HTMLResponse)
def index():
    # Read and serve the index.html template
    template_path = os.path.join("templates", "index.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Frontend index.html not found under templates/ directory</h1>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
