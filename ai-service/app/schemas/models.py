from pydantic import BaseModel, Field
from typing import Optional, List


class SmartAddRequest(BaseModel):
    text: str = Field(..., max_length=500)


class SmartAddResponse(BaseModel):
    title: str
    category: str
    type: str
    durationMinutes: Optional[int] = None
    frequency: Optional[str] = None
    activeDays: Optional[List[int]] = None
    schedulingType: str
    anchor: Optional[str] = None
    preferredTime: Optional[str] = None
    confidence: float


class DecomposeGoalRequest(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class MilestoneItem(BaseModel):
    title: str
    order: int


class DecomposeGoalResponse(BaseModel):
    milestones: List[MilestoneItem]


class AnalyzeWeekRequest(BaseModel):
    stats: dict


class AnalyzeWeekResponse(BaseModel):
    insight: Optional[str] = None


class PendingTask(BaseModel):
    title: str
    duration: int
    category: str


class SuggestFreeTimeRequest(BaseModel):
    availableMinutes: int
    pendingTasks: List[PendingTask]


class Suggestion(BaseModel):
    title: str
    duration: int
    reason: Optional[str] = None


class SuggestFreeTimeResponse(BaseModel):
    suggestions: List[Suggestion]
