from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Float, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WritingPrompt(Base):
    __tablename__ = "writing_prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    prompt_text: Mapped[str | None] = mapped_column(Text)
    prompt_cn: Mapped[str | None] = mapped_column(Text)
    word_limit: Mapped[str | None] = mapped_column(String(20))
    essay_type: Mapped[str | None] = mapped_column(String(50))
    sample_essay: Mapped[str | None] = mapped_column(Text)
    tips: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class WritingSubmission(Base):
    __tablename__ = "writing_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    prompt_id: Mapped[int] = mapped_column(Integer, ForeignKey("writing_prompts.id"), nullable=False)
    essay_text: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int | None] = mapped_column(Integer)
    ai_score: Mapped[float | None] = mapped_column(Float)
    ai_feedback: Mapped[str | None] = mapped_column(Text)
    grammar_issues: Mapped[str | None] = mapped_column(Text)
    vocabulary_suggestions: Mapped[str | None] = mapped_column(Text)
    structure_feedback: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now())
