"""Seed listening materials into the database."""
import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, delete

from app.database import async_session, init_db
from app.models.listening import ListeningMaterial, ListeningExercise

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

REQUIRED_MATERIAL_FIELDS = {"title", "section_type"}
REQUIRED_EXERCISE_FIELDS = {"question_text", "correct_answer"}


def validate_material(item: dict, index: int) -> list[str]:
    errors = []
    for field in REQUIRED_MATERIAL_FIELDS:
        if field not in item or not item[field]:
            errors.append(f"Material {index}: missing required field '{field}'")
    for j, ex in enumerate(item.get("exercises", [])):
        for field in REQUIRED_EXERCISE_FIELDS:
            if field not in ex or not ex[field]:
                errors.append(f"Material {index}, Exercise {j}: missing required field '{field}'")
    return errors


async def seed(reset: bool = False):
    await init_db()

    data_file = Path(__file__).parent.parent / "data" / "listening_materials.json"
    if not data_file.exists():
        logger.error("Data file not found: %s", data_file)
        return

    logger.info("Loading listening materials from %s", data_file)
    with open(data_file, "r", encoding="utf-8") as f:
        materials = json.load(f)

    validation_errors = []
    for i, m in enumerate(materials):
        validation_errors.extend(validate_material(m, i))
    if validation_errors:
        for err in validation_errors:
            logger.error("Validation error: %s", err)
        logger.error("Aborting due to validation errors")
        return

    async with async_session() as db:
        try:
            if reset:
                logger.info("Reset mode: clearing existing listening data")
                await db.execute(delete(ListeningExercise))
                await db.execute(delete(ListeningMaterial))
                await db.commit()
                existing_titles = set()
            else:
                result = await db.execute(select(ListeningMaterial.title))
                existing_titles = {row[0] for row in result}

            added_materials = 0
            added_exercises = 0
            for m_data in materials:
                if m_data["title"] in existing_titles:
                    logger.debug("Skipping: %s (already exists)", m_data["title"])
                    continue

                material = ListeningMaterial(
                    title=m_data["title"],
                    section_type=m_data["section_type"],
                    audio_url=m_data.get("audio_url", ""),
                    transcript=m_data.get("transcript"),
                    difficulty=m_data.get("difficulty", 1),
                    duration=m_data.get("duration", 0),
                    source=m_data.get("source"),
                )
                db.add(material)
                await db.flush()

                exercises = m_data.get("exercises", [])
                if exercises:
                    db.add_all([
                        ListeningExercise(
                            material_id=material.id,
                            question_text=ex["question_text"],
                            options_json=ex.get("options_json", "[]"),
                            correct_answer=ex["correct_answer"],
                            explanation=ex.get("explanation"),
                            timestamp=ex.get("timestamp", 0),
                            sort_order=ex.get("sort_order"),
                        )
                        for ex in exercises
                    ])
                    added_exercises += len(exercises)

                added_materials += 1

            await db.commit()
            logger.info("Seeded %d materials with %d exercises (%d skipped)", added_materials, added_exercises, len(materials) - added_materials)
        except Exception:
            await db.rollback()
            logger.exception("Failed to seed listening materials")
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed listening materials")
    parser.add_argument("--reset", action="store_true", help="Clear existing data before seeding")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))
