import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_dep
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.writing import WritingPromptResponse, WritingSubmit, WritingSubmissionResponse
from app.services import writing_service

router = APIRouter(prefix="/writing", tags=["writing"])


@router.get("/prompts", response_model=ApiResponse[list[WritingPromptResponse]])
async def list_prompts(
    essay_type: str = Query(""),
    difficulty: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    prompts = await writing_service.get_prompts(db, essay_type, difficulty)
    return ApiResponse(data=[WritingPromptResponse.model_validate(p) for p in prompts])


@router.get("/prompts/{prompt_id}", response_model=ApiResponse[WritingPromptResponse])
async def get_prompt(prompt_id: int, db: AsyncSession = Depends(get_db)):
    prompt = await writing_service.get_prompt(db, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return ApiResponse(data=WritingPromptResponse.model_validate(prompt))


@router.post("/submit", response_model=ApiResponse[WritingSubmissionResponse])
async def submit_essay(
    data: WritingSubmit,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    try:
        submission = await writing_service.submit_essay(db, user.id, data.prompt_id, data.essay_text)
        prompt = await writing_service.get_prompt(db, data.prompt_id)
        return ApiResponse(data=WritingSubmissionResponse(
            id=submission.id,
            prompt_id=submission.prompt_id,
            prompt_title=prompt.title if prompt else "",
            essay_text=submission.essay_text,
            word_count=submission.word_count,
            ai_score=submission.ai_score,
            ai_feedback=submission.ai_feedback,
            grammar_issues=submission.grammar_issues,
            vocabulary_suggestions=submission.vocabulary_suggestions,
            structure_feedback=submission.structure_feedback,
            created_at=submission.created_at,
        ))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/submissions/{submission_id}", response_model=ApiResponse[WritingSubmissionResponse])
async def get_submission(
    submission_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    submission = await writing_service.get_submission(db, submission_id)
    if not submission or submission.user_id != user.id:
        raise HTTPException(status_code=404, detail="Submission not found")

    prompt = await writing_service.get_prompt(db, submission.prompt_id)
    return ApiResponse(data=WritingSubmissionResponse(
        id=submission.id,
        prompt_id=submission.prompt_id,
        prompt_title=prompt.title if prompt else "",
        essay_text=submission.essay_text,
        word_count=submission.word_count,
        ai_score=submission.ai_score,
        ai_feedback=submission.ai_feedback,
        grammar_issues=submission.grammar_issues,
        vocabulary_suggestions=submission.vocabulary_suggestions,
        structure_feedback=submission.structure_feedback,
        created_at=submission.created_at,
    ))


@router.get("/submissions", response_model=ApiResponse[list[dict]])
async def list_submissions(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    items = await writing_service.get_user_submissions(db, user.id)
    return ApiResponse(data=items)
