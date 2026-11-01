from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_dep
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.dashboard import DailyPlan
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/daily-plan", response_model=ApiResponse[DailyPlan])
async def get_daily_plan(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """今日学习计划：新词目标、到期复习、已学数量与连续天数。"""
    plan = await dashboard_service.get_daily_plan(db, user.id)
    return ApiResponse(data=DailyPlan(**plan))
