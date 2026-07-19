
from datetime import date
import instructor
from app.config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL
from app.schemas import JudgmentAnalysis

PROMPT = """You are a senior legal analyst extracting structured data from an Indian court judgment.
The output helps a non-lawyer government officer understand the case quickly and clearly.

Today's date: {today}

RULES:
- source: for every section give the EXACT supporting sentence (1-2 sentences, max 150 chars,
  never a big block), its page, and a confidence score.
- page: read it from the [Page N] markers in the text.
- confidence: 1.0 = explicitly stated, 0.8 = clearly inferred, 0.6 = uncertain.
- Missing value? Use "Not specified" for text, -1 for numbers.
- Relative dates ("within 2 months of 13.03.2026") -> compute the real calendar date.
- days_remaining: appeal deadline minus today. Negative means overdue.
- Extract ALL directions and action items — judgments often have several.
- Do NOT repeat yourself. Output each value once, no duplicate sentences.
- summary: 2-3 sentences, plain English, no legal jargon.
- Set priority and overall_urgency from deadlines and legal impact.

JUDGMENT:
{text}
"""


def analyze(text: str) -> JudgmentAnalysis:
    """Gemini first; fall back to Groq on any error."""
    prompt = PROMPT.format(today=date.today().isoformat(), text=text)
    messages = [{"role": "user", "content": prompt}]

    try:
        client = instructor.from_provider(
            f"google/{GEMINI_MODEL}",
            api_key=GEMINI_API_KEY,
            mode=instructor.Mode.JSON,
        )
        return client.create(response_model=JudgmentAnalysis, messages=messages)
    except Exception as e:
        print(f"Gemini failed: {e} — falling back to Groq")
        client = instructor.from_provider(f"groq/{GROQ_MODEL}", api_key=GROQ_API_KEY)
        return client.create(response_model=JudgmentAnalysis, messages=messages)