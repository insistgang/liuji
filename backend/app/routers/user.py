from fastapi import APIRouter, Depends
from sqlalchemy import case, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_dep
from app.models.user import User
from app.models.vocabulary import UserWordProgress
from app.models.exam import UserExamAttempt
from app.models.writing import WritingSubmission
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/stats")
async def get_stats(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    # Vocabulary stats
    vocab_q = select(
        func.count().label("total"),
        func.sum(case((UserWordProgress.status == "mastered", 1), else_=0)).label("mastered"),
    ).where(UserWordProgress.user_id == user.id)
    vocab_result = (await db.execute(vocab_q)).first()
    vocab_total = vocab_result[0] if vocab_result else 0
    vocab_mastered = (vocab_result[1] or 0) if vocab_result else 0

    # Exam stats
    exam_q = select(func.count()).where(
        UserExamAttempt.user_id == user.id,
        UserExamAttempt.status == "completed",
    )
    exams_done = (await db.execute(exam_q)).scalar() or 0

    # Writing stats
    writing_q = select(func.count()).where(WritingSubmission.user_id == user.id)
    writings_done = (await db.execute(writing_q)).scalar() or 0

    return ApiResponse(data={
        "vocab_learned": vocab_total,
        "vocab_mastered": vocab_mastered,
        "exams_completed": exams_done,
        "writings_submitted": writings_done,
    })
