from datetime import datetime

from sqlalchemy import String, Integer, Text, Float, DateTime, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VocabularyWord(Base):
    __tablename__ = "vocabulary_words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    word: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    phonetic: Mapped[str | None] = mapped_column(String(100))
    part_of_speech: Mapped[str | None] = mapped_column(String(50))
    definition_cn: Mapped[str | None] = mapped_column(Text)
    definition_en: Mapped[str | None] = mapped_column(Text)
    example_en: Mapped[str | None] = mapped_column(Text)
    example_cn: Mapped[str | None] = mapped_column(Text)
    frequency: Mapped[int | None] = mapped_column(Integer)
    tags: Mapped[str | None] = mapped_column(String(255))
    audio_url: Mapped[str | None] = mapped_column(String(255))


class UserWordProgress(Base):
    __tablename__ = "user_word_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "word_id"),
        Index("ix_user_word_progress_next_review", "next_review"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    word_id: Mapped[int] = mapped_column(Integer, ForeignKey("vocabulary_words.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="new")  # new/learning/review/mastered
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_review: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now())

    word: Mapped["VocabularyWord"] = relationship("VocabularyWord")
