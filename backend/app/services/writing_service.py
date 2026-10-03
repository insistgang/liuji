import json
import re
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.writing import WritingPrompt, WritingSubmission
from app.utils.llm_client import call_llm, ESSAY_FEEDBACK_PROMPT


async def get_prompts(db: AsyncSession, essay_type: str = "", difficulty: int = 0) -> list[WritingPrompt]:
    query = select(WritingPrompt)
    if essay_type:
        query = query.where(WritingPrompt.essay_type == essay_type)
    if difficulty:
        query = query.where(WritingPrompt.difficulty == difficulty)
    query = query.order_by(WritingPrompt.id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_prompt(db: AsyncSession, prompt_id: int) -> WritingPrompt | None:
    result = await db.execute(select(WritingPrompt).where(WritingPrompt.id == prompt_id))
    return result.scalar_one_or_none()


async def submit_essay(db: AsyncSession, user_id: str, prompt_id: int, essay_text: str) -> WritingSubmission:
    prompt = await get_prompt(db, prompt_id)
    if not prompt:
        raise ValueError("Prompt not found")

    word_count = len(essay_text.split())

    submission = WritingSubmission(
        user_id=user_id,
        prompt_id=prompt_id,
        essay_text=essay_text,
        word_count=word_count,
    )
    db.add(submission)
    await db.flush()

    # Call LLM for feedback
    user_prompt = f"Essay prompt: {prompt.prompt_text}\n\nStudent's essay:\n{essay_text}"
    try:
        feedback_json = await call_llm(ESSAY_FEEDBACK_PROMPT, user_prompt)
        # Strip markdown code fences if present
        feedback_json = re.sub(r'^```(?:json)?\s*\n?', '', feedback_json.strip())
        feedback_json = re.sub(r'\n?```\s*$', '', feedback_json.strip())
        feedback = json.loads(feedback_json)

        submission.ai_score = feedback.get("score")
        submission.ai_feedback = feedback.get("overall_comment", "")
        submission.grammar_issues = json.dumps(feedback.get("grammar_issues", []), ensure_ascii=False)
        submission.vocabulary_suggestions = json.dumps(feedback.get("vocabulary_suggestions", []), ensure_ascii=False)
        submission.structure_feedback = feedback.get("structure_feedback", "")
    except Exception as e:
        submission.ai_feedback = f"AI feedback generation failed: {str(e)}"
        submission.ai_score = None

    return submission


async def get_submission(db: AsyncSession, submission_id: int) -> WritingSubmission | None:
    result = await db.execute(
        select(WritingSubmission).where(WritingSubmission.id == submission_id)
    )
    return result.scalar_one_or_none()


async def get_user_submissions(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(WritingSubmission)
        .where(WritingSubmission.user_id == user_id)
        .order_by(WritingSubmission.created_at.desc())
    )
    submissions = list(result.scalars().all())

    # Batch fetch prompts
    prompt_ids = list(set(s.prompt_id for s in submissions))
    prompts_q = await db.execute(select(WritingPrompt).where(WritingPrompt.id.in_(prompt_ids)))
    prompts_map = {p.id: p for p in prompts_q.scalars().all()}

    items = []
    for s in submissions:
        prompt = prompts_map.get(s.prompt_id)
        items.append({
            "id": s.id,
            "prompt_id": s.prompt_id,
            "prompt_title": prompt.title if prompt else "",
            "essay_text": s.essay_text[:200] + "..." if len(s.essay_text) > 200 else s.essay_text,
            "word_count": s.word_count,
            "ai_score": s.ai_score,
            "created_at": s.created_at,
        })
    return items
