import re
import json
import time
import logging
import requests
from fastapi import HTTPException
from backend.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger("ocr-extraction.llm")

GEMINI_PROMPTS = GROQ_PROMPTS = {
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

def call_gemini_multimodal(pages: list, doc_type: str, retries: int = 2) -> dict:
    """Send image parts directly to Gemini 2.5 Flash Lite for extraction and JSON structuring."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server. Please add it to your .env file."
        )

    system_instruction = GEMINI_PROMPTS.get(doc_type, GEMINI_PROMPTS["general"])
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

    # Build the contents array containing both text instruction and image data
    parts = []
    
    # 1. Add direct instruction prompt
    parts.append({"text": "Extract all structured information from the provided document image(s) matching the system instructions. Also include the key 'all_text_lines' containing a flat list of all readable text lines parsed from the image."})
    
    # 2. Add base64 image data parts
    import base64
    import io
    for label, img in pages:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")
        parts.append({
            "inlineData": {
                "mimeType": "image/jpeg",
                "data": b64_data
            }
        })

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [{
            "parts": parts
        }],
        "generationConfig": {
            "temperature": 0.05,
            "responseMimeType": "application/json"
        }
    }

    last_err = None
    for attempt in range(retries + 1):
        try:
            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=120
            )
            resp.raise_for_status()
            res_data = resp.json()
            
            content = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            content = re.sub(r"^```json\s*|^```\s*|\s*```$", "", content, flags=re.M).strip()
            return json.loads(content)
        except requests.HTTPError as e:
            last_err = e
            if resp.status_code == 429 and attempt < retries:
                logger.warning("Gemini rate limit hit. Waiting before retry...")
                time.sleep(3)
            else:
                raise HTTPException(status_code=502, detail=f"Gemini API Error: {e}")
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(1)
            else:
                raise HTTPException(status_code=500, detail=f"Gemini multimodal parsing failed: {e}")

    raise HTTPException(status_code=500, detail=f"All Gemini multimodal attempts failed: {last_err}")

def _find(pattern, text, flags=0, group=0):
    m = re.search(pattern, text, flags)
    return m.group(group).strip() if m else None

def get_regex_fallback(raw_text: str, doc_type: str) -> dict:
    """Local offline parsing logic if Groq is offline."""
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    if doc_type == "aadhaar":
        return {
            "document_type": "Aadhaar Card",
            "aadhaar_number": _find(r"\b\d{4}\s?\d{4}\s?\d{4}\b", raw_text),
            "date_of_birth":  _find(r"\b\d{2}[/\-]\d{2}[/\-]\d{4}\b", raw_text),
            "gender":         _find(r"\b(Male|Female|Transgender)\b", raw_text, re.I),
            "all_text_lines": lines
        }
    if doc_type == "pan":
        return {
            "document_type": "PAN Card",
            "pan_number":    _find(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", raw_text),
            "date_of_birth": _find(r"\b\d{2}/\d{2}/\d{4}\b", raw_text),
            "all_text_lines": lines
        }
    if doc_type == "business_card":
        return {
            "document_type": "Business Card",
            "email":         _find(r"\b[\w.%+\-]+@[\w.\-]+\.[a-zA-Z]{2,}\b", raw_text),
            "phone_primary": _find(r"(?:\+91[-\s]?)?[6-9]\d{9}", raw_text),
            "website":       _find(r"(?:www\.|https?://)[^\s,]+", raw_text, re.I),
            "all_text_lines": lines
        }
    return {"document_type": "General Document", "all_text_lines": lines}
