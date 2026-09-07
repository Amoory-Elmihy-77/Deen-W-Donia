"""
Internal API routes — only callable from the Node.js server via shared secret.
All routes require: X-Internal-Secret header and X-Groq-Key header.
"""
import json
from fastapi import APIRouter, Header, HTTPException, Request
from app.config import AI_SERVICE_SECRET, MODEL_FAST, MODEL_BALANCED
from app.schemas.models import (
    SmartAddRequest, SmartAddResponse,
    DecomposeGoalRequest, DecomposeGoalResponse,
    AnalyzeWeekRequest, AnalyzeWeekResponse,
    SuggestFreeTimeRequest, SuggestFreeTimeResponse,
)
from app.services.llm_service import run_structured
from app.prompts.smart_add import SMART_ADD_SYSTEM_PROMPT
from app.prompts.other_prompts import (
    DECOMPOSE_GOAL_SYSTEM_PROMPT,
    WEEKLY_INSIGHT_SYSTEM_PROMPT,
    SUGGEST_FREE_TIME_SYSTEM_PROMPT,
)

router = APIRouter(prefix="/internal")


def verify_internal(x_internal_secret: str = Header(...), x_groq_key: str = Header(...)):
    """Dependency: validates internal service auth."""
    if x_internal_secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not x_groq_key or not x_groq_key.startswith("gsk_"):
        raise HTTPException(status_code=400, detail="Invalid Groq key format")
    return x_groq_key


def map_llm_error(err: ValueError) -> HTTPException:
    msg = str(err)
    if "AI_KEY_INVALID" in msg:
        return HTTPException(status_code=401, detail={"code": "AI_KEY_INVALID", "message": "Groq key is invalid"})
    if "AI_RATE_LIMITED" in msg:
        return HTTPException(status_code=429, detail={"code": "AI_RATE_LIMITED", "message": "Groq rate limit reached"})
    if "AI_TIMEOUT" in msg:
        return HTTPException(status_code=504, detail={"code": "AI_TIMEOUT", "message": "AI request timed out"})
    return HTTPException(status_code=502, detail={"code": "AI_UPSTREAM_ERROR", "message": msg})


@router.post("/smart-add")
async def smart_add(
    body: SmartAddRequest,
    x_internal_secret: str = Header(...),
    x_groq_key: str = Header(...),
):
    if x_internal_secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        result = run_structured(
            api_key=x_groq_key,
            model=MODEL_FAST,
            system_prompt=SMART_ADD_SYSTEM_PROMPT,
            user_text=body.text,
        )
        return result
    except ValueError as e:
        raise map_llm_error(e)


@router.post("/decompose-goal")
async def decompose_goal(
    body: DecomposeGoalRequest,
    x_internal_secret: str = Header(...),
    x_groq_key: str = Header(...),
):
    if x_internal_secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    user_text = f"Goal: {body.title}"
    if body.description:
        user_text += f"\nDescription: {body.description}"

    try:
        result = run_structured(
            api_key=x_groq_key,
            model=MODEL_BALANCED,
            system_prompt=DECOMPOSE_GOAL_SYSTEM_PROMPT,
            user_text=user_text,
        )
        return result
    except ValueError as e:
        raise map_llm_error(e)


@router.post("/analyze-week")
async def analyze_week(
    body: AnalyzeWeekRequest,
    x_internal_secret: str = Header(...),
    x_groq_key: str = Header(...),
):
    if x_internal_secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    stats_text = json.dumps(body.stats, ensure_ascii=False)
    try:
        result = run_structured(
            api_key=x_groq_key,
            model=MODEL_BALANCED,
            system_prompt=WEEKLY_INSIGHT_SYSTEM_PROMPT,
            user_text=f"Weekly stats: {stats_text}",
        )
        return result
    except ValueError as e:
        raise map_llm_error(e)


@router.post("/suggest-free-time")
async def suggest_free_time(
    body: SuggestFreeTimeRequest,
    x_internal_secret: str = Header(...),
    x_groq_key: str = Header(...),
):
    if x_internal_secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    tasks_text = json.dumps(
        [t.model_dump() for t in body.pendingTasks],
        ensure_ascii=False
    )
    user_text = f"Available: {body.availableMinutes} minutes\nPending tasks: {tasks_text}"

    try:
        result = run_structured(
            api_key=x_groq_key,
            model=MODEL_FAST,
            system_prompt=SUGGEST_FREE_TIME_SYSTEM_PROMPT,
            user_text=user_text,
        )
        return result
    except ValueError as e:
        raise map_llm_error(e)
