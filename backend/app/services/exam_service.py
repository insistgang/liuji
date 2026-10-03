import json
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam import ExamPaper, ExamQuestion, UserExamAttempt


async def get_papers(db: AsyncSession) -> list[ExamPaper]:
    result = await db.execute(select(ExamPaper).order_by(ExamPaper.exam_date.desc()))
    return list(result.scalars().all())


async def get_paper(db: AsyncSession, paper_id: int) -> ExamPaper | None:
    result = await db.execute(
        select(ExamPaper).options(selectinload(ExamPaper.questions)).where(ExamPaper.id == paper_id)
    )
    return result.scalar_one_or_none()


async def get_section_questions(db: AsyncSession, paper_id: int, section: str) -> list[ExamQuestion]:
    result = await db.execute(
        select(ExamQuestion)
        .where(ExamQuestion.paper_id == paper_id, ExamQuestion.section == section)
        .order_by(ExamQuestion.sort_order)
    )
    return list(result.scalars().all())


async def start_attempt(db: AsyncSession, user_id: str, paper_id: int) -> UserExamAttempt:
    now = datetime.now(timezone.utc)
    attempt = UserExamAttempt(
        user_id=user_id,
        paper_id=paper_id,
        answers_json="{}",
        started_at=now,
        status="in_progress",
    )
    db.add(attempt)
    await db.flush()
    return attempt


async def submit_answer(db: AsyncSession, attempt_id: int, question_id: int, answer: str) -> None:
    result = await db.execute(select(UserExamAttempt).where(UserExamAttempt.id == attempt_id))
    attempt = result.scalar_one_or_none()
    if not attempt or attempt.status != "in_progress":
        raise ValueError("Invalid attempt")

    answers = json.loads(attempt.answers_json or "{}")
    answers[str(question_id)] = answer
    attempt.answers_json = json.dumps(answers)


async def submit_exam(db: AsyncSession, attempt_id: int) -> dict:
    result = await db.execute(
        select(UserExamAttempt)
        .options(selectinload(UserExamAttempt.paper))
        .where(UserExamAttempt.id == attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if not attempt or attempt.status != "in_progress":
        raise ValueError("Invalid attempt")

    answers = json.loads(attempt.answers_json or "{}")

    # Get all questions for this paper
    q_result = await db.execute(
        select(ExamQuestion).where(ExamQuestion.paper_id == attempt.paper_id)
    )
    questions = list(q_result.scalars().all())

    total_score = 0
    section_scores = {}
    question_results = []

    for q in questions:
        user_answer = answers.get(str(q.id), "")
        if q.question_type == "fill_blank":
            is_correct = " ".join(user_answer.lower().split()) == " ".join((q.correct_answer or "").lower().split())
        else:
            is_correct = user_answer.strip().upper() == (q.correct_answer or "").strip().upper()
        earned_points = q.points if is_correct else 0
        total_score += earned_points

        if q.section not in section_scores:
            section_scores[q.section] = 0
        section_scores[q.section] += earned_points

        question_results.append({
            "question_id": q.id,
            "section": q.section,
            "question_num": q.question_num,
            "content": q.content[:200] if q.content else "",
            "user_answer": user_answer,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "points": q.points,
            "earned_points": earned_points,
            "explanation": q.explanation,
        })

    now = datetime.now(timezone.utc)
    attempt.score = total_score
    attempt.section_scores_json = json.dumps(section_scores)
    attempt.completed_at = now
    attempt.status = "completed"
    attempt.time_spent = int((now - attempt.started_at).total_seconds()) if attempt.started_at else 0

    return {
        "attempt_id": attempt.id,
        "paper_title": attempt.paper.title,
        "total_score": attempt.paper.total_score,
        "score": total_score,
        "section_scores": section_scores,
        "time_spent": attempt.time_spent,
        "questions": question_results,
    }


async def get_result(db: AsyncSession, attempt_id: int) -> dict | None:
    result = await db.execute(
        select(UserExamAttempt)
        .options(selectinload(UserExamAttempt.paper))
        .where(UserExamAttempt.id == attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if not attempt or attempt.status != "completed":
        return None

    answers = json.loads(attempt.answers_json or "{}")
    section_scores = json.loads(attempt.section_scores_json or "{}")

    q_result = await db.execute(
        select(ExamQuestion).where(ExamQuestion.paper_id == attempt.paper_id)
    )
    questions = list(q_result.scalars().all())

    question_results = []
    for q in questions:
        user_answer = answers.get(str(q.id), "")
        if q.question_type == "fill_blank":
            is_correct = " ".join(user_answer.lower().split()) == " ".join((q.correct_answer or "").lower().split())
        else:
            is_correct = user_answer.strip().upper() == (q.correct_answer or "").strip().upper()
        question_results.append({
            "question_id": q.id,
            "section": q.section,
            "question_num": q.question_num,
            "content": q.content[:200] if q.content else "",
            "user_answer": user_answer,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "points": q.points,
            "earned_points": q.points if is_correct else 0,
            "explanation": q.explanation,
        })

    return {
        "attempt_id": attempt.id,
        "paper_title": attempt.paper.title,
        "total_score": attempt.paper.total_score,
        "score": attempt.score,
        "section_scores": section_scores,
        "time_spent": attempt.time_spent,
        "questions": question_results,
    }


async def get_history(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(UserExamAttempt)
        .options(selectinload(UserExamAttempt.paper))
        .where(UserExamAttempt.user_id == user_id)
        .order_by(UserExamAttempt.created_at.desc())
    )
    attempts = list(result.scalars().all())
    return [
        {
            "id": a.id,
            "paper_id": a.paper_id,
            "paper_title": a.paper.title,
            "score": a.score,
            "total_score": a.paper.total_score,
            "section_scores": json.loads(a.section_scores_json or "{}"),
            "time_spent": a.time_spent,
            "status": a.status,
            "started_at": a.started_at,
            "completed_at": a.completed_at,
        }
        for a in attempts
    ]
