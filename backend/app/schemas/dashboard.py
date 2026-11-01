from pydantic import BaseModel


class DailyPlan(BaseModel):
    """用户当天的学习计划快照，供首页「今日任务」卡片直接渲染。"""

    date: str
    daily_new_target: int
    new_words_learned_today: int
    new_words_remaining: int
    due_reviews: int
    reviews_done_today: int
    total_learned: int
    mastered: int
    streak_days: int
    completed: bool
