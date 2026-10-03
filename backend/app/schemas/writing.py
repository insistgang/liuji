from datetime import datetime

from pydantic import BaseModel


class WritingPromptResponse(BaseModel):
    id: int
    title: str
    prompt_text: str | None = None
    prompt_cn: str | None = None
    word_limit: str | None = None
    essay_type: str | None = None
    sample_essay: str | None = None
    tips: str | None = None
    difficulty: int

    model_config = {"from_attributes": True}


class WritingSubmit(BaseModel):
    prompt_id: int
    essay_text: str


class WritingSubmissionResponse(BaseModel):
    id: int
    prompt_id: int
    prompt_title: str = ""
    essay_text: str
    word_count: int | None = None
    ai_score: float | None = None
    ai_feedback: str | None = None
    grammar_issues: str | None = None
    vocabulary_suggestions: str | None = None
    structure_feedback: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
