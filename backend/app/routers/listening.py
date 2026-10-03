from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_dep
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services import listening_service

router = APIRouter(prefix="/listening", tags=["listening"])


@router.get("/materials", response_model=ApiResponse[list[dict]])
async def list_materials(
    section_type: str = Query(""),
    difficulty: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    items = await listening_service.get_materials(db, section_type, difficulty)
    return ApiResponse(data=items)


@router.get("/materials/{material_id}", response_model=ApiResponse[dict])
async def get_material(
    material_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    detail = await listening_service.get_material_detail(db, material_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Material not found")
    # Hide answers during practice
    for ex in detail.get("exercises", []):
        ex.pop("correct_answer", None)
        ex.pop("explanation", None)
    return ApiResponse(data=detail)


@router.post("/materials/{material_id}/check", response_model=ApiResponse[dict])
async def check_answers(
    material_id: int,
    answers: dict,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """Check listening exercise answers and return results."""
    detail = await listening_service.get_material_detail(db, material_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Material not found")

    results = []
    correct = 0
    for ex in detail.get("exercises", []):
        user_answer = answers.get(str(ex["id"]), "")
        is_correct = user_answer.strip().upper() == (ex.get("correct_answer") or "").strip().upper()
        if is_correct:
            correct += 1
        results.append({
            "exercise_id": ex["id"],
            "user_answer": user_answer,
            "correct_answer": ex.get("correct_answer"),
            "is_correct": is_correct,
            "explanation": ex.get("explanation"),
        })

    return ApiResponse(data={
        "total": len(results),
        "correct": correct,
        "results": results,
    })
