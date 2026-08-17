# JudgmentAI

When a court passes a judgment that affects a government department, someone has to read it and work out three things: what needs to be done, by when, and which department is responsible for doing it. Those answers are buried in pages of dense legal language — and missing a deadline has real consequences.

JudgmentAI reads the judgment (PDF) and pulls those answers out for you — the action items, the compliance deadline, the responsible department, and whether an appeal is worth considering — sorted by urgency, with every fact traceable back to the exact line it came from.

**Live demo:** https://judgementai-1.onrender.com
\

## The problem it solves

Government departments receive court judgments all the time, but the practical questions are always the same: *Do we have to do something? By when? Is it even our department's job?* Getting that wrong — or just getting it late — can mean a missed compliance deadline. Reading every judgment line by line to find out doesn't scale.

JudgmentAI does that reading. It won't replace a lawyer, but it turns a long judgment into a short, clear checklist an officer can act on and because every field points back to its source sentence, nothing has to be taken on trust.

## How it works

1. **Read the PDF** — text is pulled with PyMuPDF; scanned pages fall back to OCR (Tesseract).
2. **Extract** — the text goes to an LLM that fills a strict schema: case details, the responsible government department, court directions, action items, deadlines, appeal window, and an overall urgency. Gemini 2.5 Flash does the work; if it fails, Groq (LLaMA 3.3 70B) takes over.
3. **Human in the loop** - After the result comes out the reviewer can see and decide whether to edit it or keep that so that the real human judgment comes into the picture.
4. **Ground every field** — each extracted fact carries the exact source sentence, its page number, and a confidence score. This is the whole point: any answer traces back to the line it came from.
5. **Show it** — results land on a dashboard, and every case is saved to a library you can sort (by date, urgency, court, or department) and filter.

## Tech

- **Backend:** FastAPI, Instructor (typed LLM output), PyMuPDF + pytesseract
- **Frontend:** React (Vite)
- **Models:** Gemini 2.5 Flash (primary), Groq LLaMA 3.3 70B (fallback)

## Running locally

You'll need Python, Node, and the Tesseract OCR binary (for scanned PDFs). Grab free API keys from Google AI Studio and Groq.

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
```

Then:

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend talks to `http://127.0.0.1:8000` by default; set `VITE_API_URL` to point somewhere else.

## Notes

- The responsible department is inferred from the respondent and the subject matter — for a private dispute with no government body involved, it's marked "Not specified".
- Cases are stored in your browser (localStorage) — single-user by design. A real deployment would use a database.
- OCR for scanned PDFs works locally but not on the hosted demo (the free host has no Tesseract).
- The model won't invent things it can't find — if a judgment issues no directions, it says so instead of making them up.