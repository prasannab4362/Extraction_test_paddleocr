# Extraction Test PaddleOCR with Gemma 4 E2B

This project provides an offline document parsing and structuring pipeline using PaddleOCR 3.0 and the edge-optimized Gemma 4 E2B model via Ollama.

## Setup

1. **Python Virtual Environment**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install paddlepaddle paddleocr requests
   ```

2. **Local Ollama Setup**:
   - Run Ollama locally and pull the Gemma 4 E2B model:
     ```bash
     ollama pull gemma4:e2b
     ```

## Usage

Activate the virtual environment and run the processing script on your document image:
```bash
.venv\Scripts\activate
python ocr_processor.py <path_to_image>
```

This will run OCR using PaddleOCR, send the raw text to Gemma 4 E2B, and save a structured JSON object to `<image_name>_extracted.json`.
