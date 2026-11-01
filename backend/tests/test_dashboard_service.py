import os
import unittest
from datetime import date, datetime, timedelta, timezone

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-local-tests-only")

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.vocabulary import UserWordProgress
from app.services.dashboard_service import (
    compute_streak,
    get_daily_plan,
    local_day_bounds,
    to_local_date,
)


class StreakTests(unittest.TestCase):
    def test_streak_starts_from_today(self):
        today = date(2026, 11, 2)
        active = {today, today - timedelta(days=1), today - timedelta(days=2)}
        self.assertEqual(compute_streak(active, today), 3)

    def test_streak_survives_one_idle_day(self):
        today = date(2026, 11, 2)
        active = {today - timedelta(days=1), today - timedelta(days=2)}
        self.assertEqual(compute_streak(active, today), 2)

    def test_streak_stops_after_two_idle_days(self):
        today = date(2026, 11, 2)
        active = {today - timedelta(days=2)}
        self.assertEqual(compute_streak(active, today), 0)


class DailyPlanTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        self.SessionLocal = async_sessionmaker(self.engine, expire_on_commit=False)
        self.db = self.SessionLocal

    async def asyncTearDown(self):
        await self.engine.dispose()

    async def test_daily_plan_counts_today_and_due_reviews(self):
        now = datetime.now(timezone.utc)
        today_start, _ = local_day_bounds(now)
        rows = []
        for index in range(20):
            rows.append(
                UserWordProgress(
                    user_id="user-1",
                    word_id=index + 1,
                    status="learning",
                    last_review=today_start + timedelta(minutes=index),
                    next_review=now + timedelta(days=1),
                    created_at=today_start,
                )
            )
        for index in range(2):
            rows.append(
                UserWordProgress(
                    user_id="user-1",
                    word_id=100 + index,
                    status="review",
                    last_review=today_start,
                    next_review=now - timedelta(days=1),
                    created_at=now - timedelta(days=1),
                )
            )
        for days_ago in (1, 2):
            rows.append(
                UserWordProgress(
                    user_id="user-1",
                    word_id=200 + days_ago,
                    status="mastered",
                    last_review=now - timedelta(days=days_ago),
                    next_review=now + timedelta(days=7),
                    created_at=now - timedelta(days=days_ago),
                )
            )
        async with self.SessionLocal() as session:
            session.add_all(rows)
            await session.commit()

            plan = await get_daily_plan(session, "user-1")

        self.assertEqual(plan["daily_new_target"], 20)
        self.assertEqual(plan["new_words_learned_today"], 20)
        self.assertEqual(plan["new_words_remaining"], 0)
        self.assertEqual(plan["due_reviews"], 2)
        self.assertEqual(plan["reviews_done_today"], 22)
        self.assertEqual(plan["total_learned"], 24)
        self.assertEqual(plan["mastered"], 2)
        self.assertEqual(plan["streak_days"], 3)
        self.assertFalse(plan["completed"])
        self.assertEqual(plan["date"], to_local_date(now).isoformat())


if __name__ == "__main__":
    unittest.main()
