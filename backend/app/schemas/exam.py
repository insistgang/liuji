from datetime import datetime

from pydantic import BaseModel


class ExamPaperResponse(BaseModel):
    id: int
    title: str
    exam_date: str | None = None
    exam_type: str
    total_score: int
    question_count: int = 0

    model_config = {"from_attributes": True}


class ExamQuestionResponse(BaseModel):
    id: int
    paper_id: int
    section: str
    question_num: int
    question_type: str
    content: str | None = None
    options: list[str] = []
    correct_answer: str | None = None
    explanation: str | None = None
    audio_url: str | None = None
    points: int = 0

    model_config = {"from_attributes": True}


class ExamAttemptResponse(BaseModel):
    id: int
    paper_id: int
    paper_title: str = ""
    score: int | None = None
    section_scores: dict = {}
    time_spent: int = 0
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class AnswerSubmit(BaseModel):
    question_id: int
    answer: str


class ExamResult(BaseModel):
    attempt_id: int
    paper_title: str
    total_score: int
    score: int
    section_scores: dict
    time_spent: int
    questions: list[dict]  # [{question, user_answer, correct, is_correct}]
