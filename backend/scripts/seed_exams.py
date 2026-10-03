"""Seed exam paper data into the database."""
import argparse
import asyncio
import json
import logging
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, delete

from app.database import async_session, init_db
from app.models.exam import ExamPaper, ExamQuestion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

REQUIRED_PAPER_FIELDS = {"title"}
REQUIRED_QUESTION_FIELDS = {"section", "question_num", "question_type"}


def validate_paper(data: dict, filename: str) -> list[str]:
    errors = []
    for field in REQUIRED_PAPER_FIELDS:
        if field not in data or not data[field]:
            errors.append(f"{filename}: missing required field '{field}'")
    for section_name, section_data in data.get("sections", {}).items():
        for i, q in enumerate(section_data.get("questions", [])):
            for field in REQUIRED_QUESTION_FIELDS:
                if field not in q or not q[field]:
                    errors.append(f"{filename} section {section_name} question {i}: missing required field '{field}'")
    return errors


async def seed(reset: bool = False):
    await init_db()

    data_dir = Path(__file__).parent.parent / "data" / "exam_papers"
    if not data_dir.exists():
        logger.error("Data directory not found: %s", data_dir)
        return

    json_files = sorted(data_dir.glob("*.json"))
    if not json_files:
        logger.warning("No exam paper JSON files found in %s", data_dir)
        return

    logger.info("Found %d exam paper files", len(json_files))

    all_data = []
    validation_errors = []
    for json_file in json_files:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        all_data.append((json_file.name, data))
        validation_errors.extend(validate_paper(data, json_file.name))

    if validation_errors:
        for err in validation_errors:
            logger.error("Validation error: %s", err)
        logger.error("Aborting due to validation errors")
        return

    async with async_session() as db:
        try:
            if reset:
                logger.info("Reset mode: clearing existing exam data")
                await db.execute(delete(ExamQuestion))
                await db.execute(delete(ExamPaper))
                await db.commit()
                existing_titles = set()
            else:
                result = await db.execute(select(ExamPaper.title))
                existing_titles = {row[0] for row in result}

            added_papers = 0
            added_questions = 0
            for filename, data in all_data:
                if data["title"] in existing_titles:
                    logger.debug("Skipping %s (already exists)", data["title"])
                    continue

                paper = ExamPaper(
                    title=data["title"],
                    exam_date=date.fromisoformat(data["exam_date"]) if data.get("exam_date") else None,
                    exam_type=data.get("exam_type", "cet6"),
                    total_score=data.get("total_score", 710),
                )
                db.add(paper)
                await db.flush()

                questions = []
                for section_name, section_data in data.get("sections", {}).items():
                    for q_data in section_data.get("questions", []):
                        questions.append(ExamQuestion(
                            paper_id=paper.id,
                            section=q_data["section"],
                            question_num=q_data["question_num"],
                            question_type=q_data["question_type"],
                            content=q_data.get("content"),
                            options_json=q_data.get("options_json", "[]"),
                            correct_answer=q_data.get("correct_answer", ""),
                            explanation=q_data.get("explanation"),
                            points=q_data.get("points", 0),
                            sort_order=q_data["question_num"],
                        ))

                if questions:
                    db.add_all(questions)
                    added_questions += len(questions)

                added_papers += 1

            await db.commit()
            logger.info("Seeded %d papers with %d questions (%d skipped)", added_papers, added_questions, len(all_data) - added_papers)
        except Exception:
            await db.rollback()
            logger.exception("Failed to seed exam papers")
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed exam papers")
    parser.add_argument("--reset", action="store_true", help="Clear existing data before seeding")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))
