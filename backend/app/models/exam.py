from datetime import datetime, date

from sqlalchemy import String, Integer, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExamPaper(Base):
    __tablename__ = "exam_papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    exam_date: Mapped[date | None] = mapped_column(Date)
    exam_type: Mapped[str] = mapped_column(String(20), default="cet6")
    total_score: Mapped[int] = mapped_column(Integer, default=710)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    questions: Mapped[list["ExamQuestion"]] = relationship("ExamQuestion", back_populates="paper")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    paper_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_papers.id"), nullable=False)
    section: Mapped[str] = mapped_column(String(50), nullable=False)  # listening/reading/writing/translation
    question_num: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[str] = mapped_column(String(50))  # multiple_choice/matching/fill_blank
    content: Mapped[str | None] = mapped_column(Text)
    options_json: Mapped[str | None] = mapped_column(Text)  # JSON array
    correct_answer: Mapped[str | None] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    audio_url: Mapped[str | None] = mapped_column(String(255))
    points: Mapped[int] = mapped_column(Integer, default=0)
    sort_order: Mapped[int | None] = mapped_column(Integer)

    paper: Mapped["ExamPaper"] = relationship("ExamPaper", back_populates="questions")


class UserExamAttempt(Base):
    __tablename__ = "user_exam_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    paper_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_papers.id"), nullable=False)
    answers_json: Mapped[str | None] = mapped_column(Text)  # JSON: {question_id: answer}
    score: Mapped[int | None] = mapped_column(Integer)
    section_scores_json: Mapped[str | None] = mapped_column(Text)  # JSON: {section: score}
    time_spent: Mapped[int] = mapped_column(Integer, default=0)  # seconds
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    paper: Mapped["ExamPaper"] = relationship("ExamPaper")
