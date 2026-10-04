"""Seed CET-6 vocabulary data into the database."""
import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, delete

from app.database import async_session, init_db
from app.models.vocabulary import VocabularyWord

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

REQUIRED_FIELDS = {"word"}


def validate_word(item: dict, index: int) -> list[str]:
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in item or not item[field]:
            errors.append(f"Item {index}: missing required field '{field}'")
    return errors


async def seed(reset: bool = False):
    await init_db()

    data_file = Path(__file__).parent.parent / "data" / "cet6_vocabulary.json"
    if not data_file.exists():
        logger.error("Data file not found: %s", data_file)
        return

    logger.info("Loading vocabulary from %s", data_file)
    with open(data_file, "r", encoding="utf-8") as f:
        words = json.load(f)

    validation_errors = []
    for i, w in enumerate(words):
        validation_errors.extend(validate_word(w, i))
    if validation_errors:
        for err in validation_errors:
            logger.error("Validation error: %s", err)
        logger.error("Aborting due to validation errors")
        return

    async with async_session() as db:
        try:
            if reset:
                logger.info("Reset mode: clearing existing vocabulary data")
                await db.execute(delete(VocabularyWord))
                await db.commit()
                existing_words = set()
            else:
                result = await db.execute(select(VocabularyWord.word))
                existing_words = {row[0] for row in result}

            new_words = [w for w in words if w["word"] not in existing_words]
            seen = set()
            unique_words = []
            for w in new_words:
                if w["word"] in seen:
                    continue
                seen.add(w["word"])
                unique_words.append(w)
            skipped_dupes = len(new_words) - len(unique_words)
            if skipped_dupes:
                logger.info("Skipped %d duplicate words inside data file", skipped_dupes)
            if not unique_words:
                logger.info("No new words to seed (%d already exist)", len(existing_words))
                return

            db.add_all([VocabularyWord(**w) for w in unique_words])
            await db.commit()
            logger.info("Seeded %d new words (%d already existed)", len(unique_words), len(existing_words))
        except Exception:
            await db.rollback()
            logger.exception("Failed to seed vocabulary")
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed CET-6 vocabulary data")
    parser.add_argument("--reset", action="store_true", help="Clear existing data before seeding")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))
