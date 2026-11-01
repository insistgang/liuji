"""每日学习计划聚合。

词库进度表里的时间列存的是 UTC 墙钟时间（见 vocab_service.submit_review），
而「今天」对用户来说应该按本机时区算。这里统一做一次换算：
本机当地日 -> 对应的 UTC 区间，再去库里比较。
"""

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.vocabulary import UserWordProgress
from app.services import vocab_service

LOCAL_TZ = datetime.now().astimezone().tzinfo or timezone.utc


def local_day_bounds(now_utc: datetime, offset_days: int = 0) -> tuple[datetime, datetime]:
    """返回本机当地某一天的 [开始, 结束) 对应的 naive UTC 区间。"""
    local_now = now_utc.astimezone(LOCAL_TZ)
    local_day = local_now.date() + timedelta(days=offset_days)
    start_local = datetime.combine(local_day, time.min, tzinfo=LOCAL_TZ)
    end_local = start_local + timedelta(days=1)
    return (
        start_local.astimezone(timezone.utc).replace(tzinfo=None),
        end_local.astimezone(timezone.utc).replace(tzinfo=None),
    )


def to_local_date(value: datetime | None) -> date | None:
    """把库里存的 naive UTC 时间换算成当地日期。"""
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ).date()


def compute_streak(active_dates: set[date], today: date) -> int:
    """连续学习天数。

    今天有学习记录则从今天往回数；今天还没学但昨天学了，保留昨天的连续天数；
    两天都没动静则连续中断，返回 0。
    """
    if not active_dates:
        return 0
    if today in active_dates:
        cursor = today
    elif (today - timedelta(days=1)) in active_dates:
        cursor = today - timedelta(days=1)
    else:
        return 0
    streak = 0
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


async def get_daily_plan(db: AsyncSession, user_id: str) -> dict:
    """汇总当天的新词、复习与连续天数。"""
    now = datetime.now(timezone.utc)
    day_start, day_end = local_day_bounds(now)

    rows = await db.execute(
        select(
            UserWordProgress.last_review,
            UserWordProgress.created_at,
            UserWordProgress.next_review,
            UserWordProgress.status,
        ).where(UserWordProgress.user_id == user_id)
    )
    records = rows.all()

    active_dates = {
        d
        for r in records
        for d in (to_local_date(r[0]), to_local_date(r[1]))
        if d is not None
    }
    today = to_local_date(now) or now.date()

    new_words_learned_today = sum(
        1 for r in records if r[1] is not None and day_start <= r[1] < day_end
    )
    reviews_done_today = sum(
        1 for r in records if r[0] is not None and day_start <= r[0] < day_end
    )
    due_reviews = sum(
        1
        for r in records
        if r[2] is not None and r[2] <= now.replace(tzinfo=None) and r[3] in ("learning", "review")
    )

    stats = await vocab_service.get_progress_stats(db, user_id)
    total_learned = stats["learning_words"] + stats["review_words"] + stats["mastered_words"]
    mastered = stats["mastered_words"]

    target = settings.DAILY_NEW_WORDS
    new_words_remaining = max(0, target - new_words_learned_today)

    return {
        "date": today.isoformat(),
        "daily_new_target": target,
        "new_words_learned_today": new_words_learned_today,
        "new_words_remaining": new_words_remaining,
        "due_reviews": due_reviews,
        "reviews_done_today": reviews_done_today,
        "total_learned": total_learned,
        "mastered": mastered,
        "streak_days": compute_streak(active_dates, today),
        "completed": new_words_remaining == 0 and due_reviews == 0,
    }
