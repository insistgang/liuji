import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_dep
from app.models.user import User
from app.models.exam import ExamPaper, ExamQuestion, UserExamAttempt
from app.schemas.common import ApiResponse
from app.schemas.exam import (
    ExamPaperResponse, ExamQuestionResponse, ExamAttemptResponse,
    AnswerSubmit, ExamResult,
)
from app.services import exam_service

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=ApiResponse[list[ExamPaperResponse]])
async def list_papers(db: AsyncSession = Depends(get_db)):
    papers = await exam_service.get_papers(db)
    result = []
    for p in papers:
        count_q = select(func.count()).where(ExamQuestion.paper_id == p.id)
        count = (await db.execute(count_q)).scalar() or 0
        result.append(ExamPaperResponse(
            id=p.id, title=p.title,
            exam_date=str(p.exam_date) if p.exam_date else None,
            exam_type=p.exam_type, total_score=p.total_score,
            question_count=count,
        ))
    return ApiResponse(data=result)


@router.get("/{paper_id}", response_model=ApiResponse[dict])
async def get_paper(paper_id: int, db: AsyncSession = Depends(get_db)):
    paper = await exam_service.get_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    sections = {}
    for q in paper.questions:
        if q.section not in sections:
            sections[q.section] = 0
        sections[q.section] += 1
    return ApiResponse(data={
        "id": paper.id, "title": paper.title,
        "exam_date": str(paper.exam_date) if paper.exam_date else None,
        "total_score": paper.total_score, "sections": sections,
    })


@router.get("/{paper_id}/sections/{section}", response_model=ApiResponse[list[ExamQuestionResponse]])
async def get_section(
    paper_id: int, section: str,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    questions = await exam_service.get_section_questions(db, paper_id, section)
    result = []
    for q in questions:
        options = json.loads(q.options_json or "[]")
        result.append(ExamQuestionResponse(
            id=q.id, paper_id=q.paper_id, section=q.section,
            question_num=q.question_num, question_type=q.question_type,
            content=q.content, options=options,
            # Hide answers during practice - only show after submission
            correct_answer=None, explanation=None,
            audio_url=q.audio_url, points=q.points,
        ))
    return ApiResponse(data=result)


async def _verify_attempt_owner(attempt_id: int, user_id: str, db: AsyncSession) -> UserExamAttempt:
    result = await db.execute(select(UserExamAttempt).where(UserExamAttempt.id == attempt_id))
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    return attempt


@router.post("/{paper_id}/start", response_model=ApiResponse[ExamAttemptResponse])
async def start_exam(
    paper_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    paper = await exam_service.get_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    attempt = await exam_service.start_attempt(db, user.id, paper_id)
    return ApiResponse(data=ExamAttemptResponse(
        id=attempt.id, paper_id=attempt.paper_id, status=attempt.status,
        started_at=attempt.started_at,
    ))


@router.post("/attempts/{attempt_id}/answer")
async def submit_answer(
    attempt_id: int,
    data: AnswerSubmit,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    await _verify_attempt_owner(attempt_id, user.id, db)
    try:
        await exam_service.submit_answer(db, attempt_id, data.question_id, data.answer)
        return ApiResponse(message="ok")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/attempts/{attempt_id}/submit", response_model=ApiResponse[ExamResult])
async def submit_exam(
    attempt_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    await _verify_attempt_owner(attempt_id, user.id, db)
    try:
        result = await exam_service.submit_exam(db, attempt_id)
        return ApiResponse(data=ExamResult(**result))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/attempts/{attempt_id}/result", response_model=ApiResponse[ExamResult])
async def get_result(
    attempt_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    await _verify_attempt_owner(attempt_id, user.id, db)
    result = await exam_service.get_result(db, attempt_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return ApiResponse(data=ExamResult(**result))


@router.get("/history/list", response_model=ApiResponse[list[dict]])
async def get_history(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    history = await exam_service.get_history(db, user.id)
    return ApiResponse(data=history)
