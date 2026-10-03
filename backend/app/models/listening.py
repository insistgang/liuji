from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ListeningMaterial(Base):
    __tablename__ = "listening_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    section_type: Mapped[str] = mapped_column(String(50))  # news_report/lecture/conversation
    audio_url: Mapped[str | None] = mapped_column(String(255))
    transcript: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    duration: Mapped[int] = mapped_column(Integer, default=0)  # seconds
    source: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    exercises: Mapped[list["ListeningExercise"]] = relationship("ListeningExercise", back_populates="material")


class ListeningExercise(Base):
    __tablename__ = "listening_exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    material_id: Mapped[int] = mapped_column(Integer, ForeignKey("listening_materials.id"), nullable=False)
    question_text: Mapped[str | None] = mapped_column(Text)
    options_json: Mapped[str | None] = mapped_column(Text)
    correct_answer: Mapped[str | None] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    timestamp: Mapped[int] = mapped_column(Integer, default=0)  # seconds into audio
    sort_order: Mapped[int | None] = mapped_column(Integer)

    material: Mapped["ListeningMaterial"] = relationship("ListeningMaterial", back_populates="exercises")
