import io
import logging
from PIL import Image
import pypdfium2 as pdfium
from paddleocr import PaddleOCR

logger = logging.getLogger("ocr-extraction.ocr")

_ocr_instance = None

def get_ocr() -> PaddleOCR:
    global _ocr_instance
    if _ocr_instance is None:
        logger.info("Initializing PaddleOCR engine...")
        _ocr_instance = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        logger.info("PaddleOCR engine loaded successfully.")
    return _ocr_instance

def run_ocr(image: Image.Image) -> str:
    """Extract line text from a PIL Image using PaddleOCR."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    result = get_ocr().ocr(buf.getvalue(), cls=True)
    lines = []
    if result and result[0]:
        for item in result[0]:
            text, confidence = item[1]
            if confidence > 0.4:
                lines.append(text)
    return "\n".join(lines)

def load_pages_from_bytes(file_bytes: bytes, filename: str) -> list:
    """Return a list of (label, PIL.Image) tuples from raw file bytes."""
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
