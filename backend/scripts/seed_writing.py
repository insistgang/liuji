"""Seed writing prompts into the database."""
import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, delete

from app.database import async_session, init_db
from app.models.writing import WritingPrompt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

REQUIRED_FIELDS = {"title"}


def validate_prompt(item: dict, index: int) -> list[str]:
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in item or not item[field]:
            errors.append(f"Item {index}: missing required field '{field}'")
    return errors


async def seed(reset: bool = False):
    await init_db()

    data_file = Path(__file__).parent.parent / "data" / "writing_prompts.json"
    if not data_file.exists():
        logger.error("Data file not found: %s", data_file)
        return

    logger.info("Loading writing prompts from %s", data_file)
    with open(data_file, "r", encoding="utf-8") as f:
        prompts = json.load(f)

    validation_errors = []
    for i, p in enumerate(prompts):
        validation_errors.extend(validate_prompt(p, i))
    if validation_errors:
        for err in validation_errors:
            logger.error("Validation error: %s", err)
        logger.error("Aborting due to validation errors")
        return

    async with async_session() as db:
        try:
            if reset:
                logger.info("Reset mode: clearing existing writing prompts")
                await db.execute(delete(WritingPrompt))
                await db.commit()
                existing_titles = set()
            else:
                result = await db.execute(select(WritingPrompt.title))
                existing_titles = {row[0] for row in result}

            added = 0
            for p_data in prompts:
                if p_data["title"] in existing_titles:
                    logger.debug("Skipping: %s (already exists)", p_data["title"])
                    continue
                db.add(WritingPrompt(
                    title=p_data["title"],
                    prompt_text=p_data.get("prompt_text"),
                    prompt_cn=p_data.get("prompt_cn"),
                    word_limit=p_data.get("word_limit"),
                    essay_type=p_data.get("essay_type"),
                    sample_essay=p_data.get("sample_essay"),
                    tips=p_data.get("tips"),
                    difficulty=p_data.get("difficulty", 1),
                ))
                added += 1

            await db.commit()
            logger.info("Seeded %d new prompts (%d skipped)", added, len(prompts) - added)
        except Exception:
            await db.rollback()
            logger.exception("Failed to seed writing prompts")
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed writing prompts")
    parser.add_argument("--reset", action="store_true", help="Clear existing data before seeding")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))
