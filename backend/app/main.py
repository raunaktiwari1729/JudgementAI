# FastAPI app 

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.pdf_extractor import extract_text
from app.llm_service import analyze
from app.schemas import JudgmentAnalysis

app = FastAPI(title="JudgmentAI")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=JudgmentAnalysis)
async def analyze_judgment(file: UploadFile = File(...)):
    """Upload a judgment PDF, get back the structured action plan."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    pdf_bytes = await file.read()
    text = extract_text(pdf_bytes)

    if len(text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not read text from this PDF.")

    return analyze(text)