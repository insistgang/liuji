from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_dep
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.vocabulary import (
    WordResponse, WordProgressResponse, ReviewSubmit,
    QuizQuestion, QuizSubmit, QuizResult, VocabProgressStats,
)
from app.services import vocab_service

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.get("/words", response_model=PaginatedResponse[WordResponse])
async def list_words(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    items, total = await vocab_service.get_words(db, page, per_page, search)
    return PaginatedResponse(
        data={"items": [WordResponse.model_validate(w) for w in items], "total": total, "page": page, "per_page": per_page}
    )


@router.get("/words/{word_id}", response_model=ApiResponse[WordResponse])
async def get_word(word_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.vocabulary import VocabularyWord

    result = await db.execute(select(VocabularyWord).where(VocabularyWord.id == word_id))
    word = result.scalar_one_or_none()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    return ApiResponse(data=WordResponse.model_validate(word))


@router.get("/learn/new", response_model=ApiResponse[list[WordProgressResponse]])
async def get_new_words(
    count: int = Query(None),
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    words = await vocab_service.get_new_words(db, user.id, count)
    # Return as WordProgress-like format with status "new"
    return ApiResponse(
        data=[
            WordProgressResponse(
                id=0, word_id=w.id, word=WordResponse.model_validate(w),
                status="new", ease_factor=2.5, interval=0, repetitions=0,
                correct_count=0, wrong_count=0,
            )
            for w in words
        ]
    )


@router.post("/learn/start", response_model=ApiResponse[list[WordProgressResponse]])
async def start_learning(
    word_ids: list[int],
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    progress_list = await vocab_service.start_learning(db, user.id, word_ids)
    return ApiResponse(data=[WordProgressResponse.model_validate(p) for p in progress_list])


@router.get("/learn/review", response_model=ApiResponse[list[WordProgressResponse]])
async def get_review_words(
    limit: int = Query(None),
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    items = await vocab_service.get_review_words(db, user.id, limit)
    return ApiResponse(data=[WordProgressResponse.model_validate(p) for p in items])


@router.post("/review/submit", response_model=ApiResponse[WordProgressResponse])
async def submit_review(
    data: ReviewSubmit,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    try:
        progress = await vocab_service.submit_review(db, user.id, data.word_id, data.quality)
        return ApiResponse(data=WordProgressResponse.model_validate(progress))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/quiz/start", response_model=ApiResponse[list[QuizQuestion]])
async def start_quiz(
    count: int = Query(10, ge=4, le=50),
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    questions = await vocab_service.generate_quiz(db, user.id, count)
    if not questions:
        raise HTTPException(status_code=400, detail="Not enough words learned for quiz")
    return ApiResponse(data=[QuizQuestion(**q) for q in questions])


@router.post("/quiz/submit", response_model=ApiResponse[list[dict]])
async def submit_quiz(
    data: QuizSubmit,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    results = []
    for answer in data.answers:
        from sqlalchemy import select as sa_select
        from app.models.vocabulary import VocabularyWord
        word_result = await db.execute(sa_select(VocabularyWord).where(VocabularyWord.id == answer["word_id"]))
        word = word_result.scalar_one_or_none()
        if not word:
            continue
        correct_answer = word.definition_cn if answer.get("question_type") == "meaning" else word.word
        is_correct = answer.get("selected", "").strip() == (correct_answer or "").strip()
        results.append({
            "word_id": word.id,
            "word": word.word,
            "correct": is_correct,
            "selected": answer.get("selected", ""),
            "correct_answer": correct_answer,
        })
    return ApiResponse(data=results)


@router.get("/progress", response_model=ApiResponse[VocabProgressStats])
async def get_progress(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    stats = await vocab_service.get_progress_stats(db, user.id)
    return ApiResponse(data=VocabProgressStats(**stats))


@router.get("/progress/weak", response_model=ApiResponse[list[WordProgressResponse]])
async def get_weak_words(
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    items = await vocab_service.get_weak_words(db, user.id, limit)
    return ApiResponse(data=[WordProgressResponse.model_validate(p) for p in items])
