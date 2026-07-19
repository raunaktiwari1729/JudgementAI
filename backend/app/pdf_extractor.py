#  text from a PDF 

import io
import fitz        
import pytesseract
from PIL import Image



def extract_text(pdf_bytes: bytes) -> str:
    """Return PDF text with page no for the LLM """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []

    for i, page in enumerate(doc, start=1):
        text = page.get_text().strip()

        # almost no text = scanned page
        if len(text) < 30:
            text = _ocr_page(page)

        pages.append(f"[Page {i}]\n{text}")

    doc.close()
    return "\n\n".join(pages)


def _ocr_page(page) -> str:
    """Render page to image and OCR it."""
    pix = page.get_pixmap(dpi=200)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return pytesseract.image_to_string(img).strip()