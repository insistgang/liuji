import json

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.listening import ListeningMaterial, ListeningExercise


async def get_materials(
    db: AsyncSession, section_type: str = "", difficulty: int = 0
) -> list[dict]:
    query = select(ListeningMaterial)
    if section_type:
        query = query.where(ListeningMaterial.section_type == section_type)
    if difficulty:
        query = query.where(ListeningMaterial.difficulty == difficulty)
    query = query.order_by(ListeningMaterial.id)

    result = await db.execute(query)
    materials = list(result.scalars().all())

    items = []
    for m in materials:
        count_q = select(func.count()).where(ListeningExercise.material_id == m.id)
        count = (await db.execute(count_q)).scalar() or 0
        items.append({
            "id": m.id,
            "title": m.title,
            "section_type": m.section_type,
            "audio_url": m.audio_url,
            "difficulty": m.difficulty,
            "duration": m.duration,
            "source": m.source,
            "exercise_count": count,
        })
    return items


async def get_material_detail(db: AsyncSession, material_id: int) -> dict | None:
    result = await db.execute(
        select(ListeningMaterial)
        .options(selectinload(ListeningMaterial.exercises))
        .where(ListeningMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        return None

    exercises = []
    for e in sorted(material.exercises, key=lambda x: x.sort_order or 0):
        exercises.append({
            "id": e.id,
            "material_id": e.material_id,
            "question_text": e.question_text,
            "options": json.loads(e.options_json or "[]"),
            "correct_answer": e.correct_answer,
            "explanation": e.explanation,
            "timestamp": e.timestamp,
            "sort_order": e.sort_order,
        })

    return {
        "material": {
            "id": material.id,
            "title": material.title,
            "section_type": material.section_type,
            "audio_url": material.audio_url,
            "transcript": material.transcript,
            "difficulty": material.difficulty,
            "duration": material.duration,
            "source": material.source,
            "exercise_count": len(exercises),
        },
        "exercises": exercises,
    }
