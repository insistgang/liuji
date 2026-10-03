import random
from datetime import datetime, timezone

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.vocabulary import VocabularyWord, UserWordProgress
from app.utils.spaced_repetition import sm2, get_status


async def get_words(db: AsyncSession, page: int = 1, per_page: int = 20, search: str = ""):
    query = select(VocabularyWord)
    if search:
        query = query.where(VocabularyWord.word.contains(search))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()
    return items, total


async def get_new_words(db: AsyncSession, user_id: str, count: int | None = None) -> list[VocabularyWord]:
    count = count or settings.DAILY_NEW_WORDS

    # Words the user hasn't started learning yet
    learned_ids = select(UserWordProgress.word_id).where(UserWordProgress.user_id == user_id)
    query = (
        select(VocabularyWord)
        .where(VocabularyWord.id.notin_(learned_ids))
        .order_by(VocabularyWord.frequency.asc().nullslast())
        .limit(count)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_review_words(db: AsyncSession, user_id: str, limit: int | None = None) -> list[UserWordProgress]:
    limit = limit or settings.DAILY_REVIEW_LIMIT
    now = datetime.now(timezone.utc)

    query = (
        select(UserWordProgress)
        .options(selectinload(UserWordProgress.word))
        .where(
            and_(
                UserWordProgress.user_id == user_id,
                UserWordProgress.next_review <= now,
                UserWordProgress.status.in_(["learning", "review"]),
            )
        )
        .order_by(UserWordProgress.next_review.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def start_learning(db: AsyncSession, user_id: str, word_ids: list[int]) -> list[UserWordProgress]:
    """Create progress records for new words the user starts learning."""
    now = datetime.now(timezone.utc)
    progress_list = []
    for word_id in word_ids:
        progress = UserWordProgress(
            user_id=user_id,
            word_id=word_id,
            status="learning",
            next_review=now,  # Due for first review immediately
        )
        db.add(progress)
        progress_list.append(progress)
    await db.flush()

    # Reload with word relationship
    for p in progress_list:
        await db.refresh(p, ["word"])
    return progress_list


async def submit_review(db: AsyncSession, user_id: str, word_id: int, quality: int):
    """Submit a review result and update spaced repetition schedule."""
    result = await db.execute(
        select(UserWordProgress)
        .options(selectinload(UserWordProgress.word))
        .where(and_(UserWordProgress.user_id == user_id, UserWordProgress.word_id == word_id))
    )
    progress = result.scalar_one_or_none()

    if not progress:
        # Create new progress record
        word_result = await db.execute(select(VocabularyWord).where(VocabularyWord.id == word_id))
        word = word_result.scalar_one_or_none()
        if not word:
            raise ValueError("Word not found")
        progress = UserWordProgress(user_id=user_id, word_id=word_id, status="learning")
        db.add(progress)
        await db.flush()
        await db.refresh(progress, ["word"])

    now = datetime.now(timezone.utc)

    new_reps, new_ef, new_interval = sm2(
        quality, progress.repetitions, progress.ease_factor, progress.interval
    )

    progress.repetitions = new_reps
    progress.ease_factor = new_ef
    progress.interval = new_interval
    progress.next_review = datetime.fromtimestamp(
        now.timestamp() + new_interval * 86400, tz=timezone.utc
    )
    progress.last_review = now
    progress.status = get_status(new_reps, new_interval)

    if quality >= 3:
        progress.correct_count += 1
    else:
        progress.wrong_count += 1

    return progress


async def generate_quiz(db: AsyncSession, user_id: str, count: int = 10) -> list[dict]:
    """Generate a quiz with multiple choice questions."""
    # Get words the user has learned
    query = (
        select(UserWordProgress)
        .options(selectinload(UserWordProgress.word))
        .where(
            and_(
                UserWordProgress.user_id == user_id,
                UserWordProgress.status.in_(["learning", "review", "mastered"]),
            )
        )
        .order_by(func.random())
        .limit(count)
    )
    result = await db.execute(query)
    progress_items = list(result.scalars().all())

    if len(progress_items) < 4:
        return []

    questions = []
    all_words_result = await db.execute(
        select(VocabularyWord).order_by(func.random()).limit(50)
    )
    all_words = list(all_words_result.scalars().all())

    for p in progress_items:
        word = p.word
        # Get 3 random wrong options (deduplicated)
        wrong_options = list(set(w.definition_cn for w in all_words if w.id != word.id and w.definition_cn and w.definition_cn != word.definition_cn))
        random.shuffle(wrong_options)
        wrong_options = wrong_options[:3]

        question_type = random.choice(["meaning", "word"])

        if question_type == "meaning":
            # Show word, pick meaning
            options = wrong_options + [word.definition_cn]
            random.shuffle(options)
            questions.append({
                "word_id": word.id,
                "word": word.word,
                "phonetic": word.phonetic,
                "part_of_speech": word.part_of_speech,
                "question_type": "meaning",
                "prompt": word.word,
                "options": options,
                "correct_answer": word.definition_cn,
            })
        else:
            # Show meaning, pick word
            wrong_words = list(set(w.word for w in all_words if w.id != word.id and w.word != word.word))
            random.shuffle(wrong_words)
            wrong_words = wrong_words[:3]
            options = wrong_words + [word.word]
            random.shuffle(options)
            questions.append({
                "word_id": word.id,
                "word": word.word,
                "phonetic": word.phonetic,
                "part_of_speech": word.part_of_speech,
                "question_type": "word",
                "prompt": word.definition_cn,
                "options": options,
                "correct_answer": word.word,
            })

    return questions


async def get_progress_stats(db: AsyncSession, user_id: str) -> dict:
    now = datetime.now(timezone.utc)

    total_result = await db.execute(select(func.count()).select_from(VocabularyWord))
    total_words = total_result.scalar() or 0

    status_counts = await db.execute(
        select(UserWordProgress.status, func.count())
        .where(UserWordProgress.user_id == user_id)
        .group_by(UserWordProgress.status)
    )
    counts = {row[0]: row[1] for row in status_counts}

    due_result = await db.execute(
        select(func.count())
        .select_from(UserWordProgress)
        .where(
            and_(
                UserWordProgress.user_id == user_id,
                UserWordProgress.next_review <= now,
                UserWordProgress.status.in_(["learning", "review"]),
            )
        )
    )
    due_today = due_result.scalar() or 0

    return {
        "total_words": total_words,
        "new_words": total_words - sum(counts.values()),
        "learning_words": counts.get("learning", 0),
        "review_words": counts.get("review", 0),
        "mastered_words": counts.get("mastered", 0),
        "due_today": due_today,
    }


async def get_weak_words(db: AsyncSession, user_id: str, limit: int = 20) -> list[UserWordProgress]:
    query = (
        select(UserWordProgress)
        .options(selectinload(UserWordProgress.word))
        .where(
            and_(
                UserWordProgress.user_id == user_id,
                UserWordProgress.wrong_count > 0,
            )
        )
        .order_by((UserWordProgress.wrong_count - UserWordProgress.correct_count).desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())
