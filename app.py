import logging
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.config import ALLOWED_ORIGINS, PORT
from backend.routes import router

# Setup primary logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ocr-extraction")

app = FastAPI(
    title="OCR extraction API",
    description="Production-grade document extraction server using PaddleOCR & Groq Llama 3",
    version="3.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount APIRouter
app.include_router(router)

@app.get("/")
def home():
    return HTMLResponse(
        "<h1>OCR extraction API is operational.</h1>"
        "<p>Access the React user interface at port 3000.</p>"
    )

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on port {PORT}...")
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=False)
