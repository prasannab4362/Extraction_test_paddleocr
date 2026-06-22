import os
import sys
import json
import requests
from paddleocr import PaddleOCR

# Setup local Ollama URL (default port 11434)
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "gemma4:e2b"

def run_ocr(image_path):
    print(f"[*] Initializing PaddleOCR...")
    # Initialize PaddleOCR (CPU mode by default, support angle classifier)
    ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    
    print(f"[*] Running OCR on: {image_path}")
    result = ocr.ocr(image_path, cls=True)
    
    # Process results
    extracted_lines = []
    if result and result[0]:
        for line in result[0]:
            text = line[1][0]
            confidence = line[1][1]
            extracted_lines.append(text)
            
    raw_text = "\n".join(extracted_lines)
    return raw_text

def structure_text_with_llm(raw_text):
    print(f"[*] Structuring extracted text using {MODEL_NAME} via Ollama...")
    
    system_prompt = (
        "You are an AI data extractor. Your task is to extract information from raw OCR text and structure it into a clean, valid JSON object.\n"
        "Identify if the document is an Invoice, Bill, or Warranty and extract the corresponding fields:\n\n"
        "For Invoices / Bills:\n"
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
        "- currency\n\n"
        "For Warranties:\n"
        "- document_type (Warranty)\n"
        "- product_name\n"
        "- model_number\n"
        "- serial_number\n"
        "- purchase_date\n"
        "- warranty_period\n"
        "- warranty_expiry_date\n"
        "- provider_name (manufacturer/vendor)\n"
        "- customer_name\n"
        "- coverage_details\n\n"
        "Respond ONLY with a valid JSON object matching the structures above. Do not include markdown code block formatting (such as ```json) or any conversational text."
    )
    
    prompt = f"Raw OCR Text:\n{raw_text}\n\nStructured JSON:"
    
    payload = {
        "model": MODEL_NAME,
        "prompt": f"{system_prompt}\n\n{prompt}",
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1
        }
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        res_json = response.json()
        output_text = res_json.get("response", "").strip()
        
        # Parse output as JSON to validate it
        structured_data = json.loads(output_text)
        return structured_data
    except Exception as e:
        print(f"[!] Error calling Ollama or parsing JSON response: {e}")
        if 'response' in locals() and response.text:
            print(f"[!] Raw Response: {response.text}")
        return {"error": str(e), "raw_text": raw_text}

def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr_processor.py <path_to_image>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"[!] File not found: {image_path}")
        sys.exit(1)
        
    # Step 1: Run OCR
    raw_text = run_ocr(image_path)
    print("\n--- Extracted Raw Text ---")
    print(raw_text)
    print("--------------------------\n")
    
    # Step 2: Use LLM to structure
    structured_json = structure_text_with_llm(raw_text)
    
    # Step 3: Print and save output
    print("--- Structured JSON ---")
    print(json.dumps(structured_json, indent=2))
    print("-----------------------\n")
    
    output_filename = os.path.splitext(os.path.basename(image_path))[0] + "_extracted.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(structured_json, f, indent=2)
    print(f"[*] Saved structured JSON output to: {output_filename}")

if __name__ == "__main__":
    main()
