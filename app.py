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

# Load local .env file if present
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                if len(parts) == 2:
                    os.environ[parts[0].strip()] = parts[1].strip()

app = FastAPI(title="OCR extraction")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory OCR initialization helper (lazy loading)
_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        _ocr_instance = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr_instance

# Helper to run OCR on an image (PIL Image or path)
def process_ocr_image(image: Image.Image) -> str:
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
def call_groq_api(raw_text: str, doc_type: str, api_key: str) -> dict:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Custom prompts based on document type
    prompts = {
        "invoice": (
            "You are an AI invoice extractor. Extract metadata from raw OCR text and structure it into a clean JSON object:\n"
            "- document_type (Invoice or Bill)\n"
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
            "- currency\n"
        ),
        "business_card": (
            "You are an AI Business Card reader. Extract metadata from raw OCR text and structure it into a clean JSON object:\n"
            "- document_type (Business Card)\n"
            "- name\n"
            "- job_title\n"
            "- company_name\n"
            "- email\n"
            "- phone_number\n"
            "- website\n"
            "- address\n"
        ),
        "table": (
            "You are an AI Table parser. Extract tabular structure and grid data from raw OCR text and structure it into a clean JSON object:\n"
            "- document_type (Table Document)\n"
            "- tables: list of tables, each represented as an object containing:\n"
            "  - table_title (if any)\n"
            "  - headers: list of column headers\n"
            "  - rows: list of lists representing each row's data\n"
        ),
        "aadhaar": (
            "You are an AI Aadhaar Card extractor. Extract Indian Aadhaar details from raw OCR text and structure it into a clean JSON object:\n"
            "- document_type (Aadhaar Card)\n"
            "- aadhaar_number (formatted as XXXX XXXX XXXX)\n"
            "- full_name\n"
            "- date_of_birth\n"
            "- gender (Male/Female/Other)\n"
            "- address (if visible)\n"
        ),
        "pan": (
            "You are an AI PAN Card extractor. Extract Indian Permanent Account Number (PAN) details from raw OCR text and structure it into a clean JSON object:\n"
            "- document_type (PAN Card)\n"
            "- pan_number\n"
            "- full_name\n"
            "- fathers_name\n"
            "- date_of_birth\n"
        ),
        "general": (
            "You are an AI general document extractor. Extract structured information from raw OCR text into a clean JSON object:\n"
            "- document_type (General Document)\n"
            "- document_title\n"
            "- key_metadata: list of key-value pairs representing important properties found in the document\n"
            "- summary: a clear, concise paragraph summarizing the document contents\n"
            "- structured_sections: list of objects containing (heading, text)\n"
        )
    }
    
    system_prompt = prompts.get(doc_type, prompts["general"])
    system_prompt += "\nRespond ONLY with a valid JSON object. Do not include markdown code block formatting (such as ```json) or any conversational text."
    
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
    doc_type: str = Form("general")  # "invoice", "business_card", "table", "aadhaar", "pan", "general"
):
    # Fetch API Key from environment variable only
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Groq API Key is missing on the server backend. Please configure it in your .env file."
        )

    results = []
    
    # Process files
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
        # Merge Mode
        combined_text_lines = []
        for name, img in all_pages:
            print(f"[*] Running OCR on page/file: {name}")
            text = process_ocr_image(img)
            combined_text_lines.append(f"--- Document: {name} ---\n{text}")
            
        combined_text = "\n\n".join(combined_text_lines)
        
        try:
            structured_data = call_groq_api(combined_text, doc_type, api_key)
            doc_id = str(uuid.uuid4())
            results.append({
                "id": doc_id,
                "timestamp": datetime.datetime.now().isoformat(),
                "filename": files[0].filename if len(files) == 1 else f"Merged ({len(files)} files)",
                "document_type": structured_data.get("document_type", doc_type.capitalize()),
                "structured_data": structured_data,
                "raw_text": combined_text
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to structure merged text: {str(e)}")
            
    else:
        # Batch Mode
        for name, img in all_pages:
            print(f"[*] Running batch OCR on page/file: {name}")
            text = process_ocr_image(img)
            try:
                structured_data = call_groq_api(text, doc_type, api_key)
                doc_id = str(uuid.uuid4())
                results.append({
                    "id": doc_id,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "filename": name,
                    "document_type": structured_data.get("document_type", doc_type.capitalize()),
                    "structured_data": structured_data,
                    "raw_text": text
                })
            except Exception as e:
                results.append({
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.datetime.now().isoformat(),
                    "filename": name,
                    "document_type": "Error",
                    "structured_data": {"error": f"Failed to structure page: {str(e)}"},
                    "raw_text": text
                })

    return results

@app.get("/")
def index():
    return HTMLResponse(content="<h1>FastAPI API active. Access frontend via port 3000.</h1>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
