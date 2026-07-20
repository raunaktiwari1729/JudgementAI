
from enum import Enum
from typing import List
from pydantic import BaseModel, Field


class Urgency(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ties each fact back to the PDF 
class Source(BaseModel):
    sentence: str = Field(description="Exact sentence from the judgment.")
    page: int
    confidence: float = Field(ge=0.0, le=1.0)


class CaseDetails(BaseModel):
    title: str
    case_number: str          # "Not specified" if missing
    court: str
    judges: List[str]
    date: str
    petitioner: str
    respondent: str
    source: Source
    responsible_department: str


class Direction(BaseModel):
    text: str                 # what the court ordered
    deadline: str             # "Not specified" if none
    source: Source


class ActionItem(BaseModel):
    task: str
    priority: Urgency
    due_date: str             # "Not specified" if none
    source: Source


class AppealWindow(BaseModel):
    can_appeal: bool
    deadline: str
    days_remaining: int       # -1 if unknown
    source: Source


class JudgmentAnalysis(BaseModel):
    case_details: CaseDetails
    summary: str
    directions: List[Direction]
    action_items: List[ActionItem]
    appeal_window: AppealWindow
    overall_urgency: Urgency