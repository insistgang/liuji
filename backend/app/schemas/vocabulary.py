from datetime import datetime

from pydantic import BaseModel


class WordResponse(BaseModel):
    id: int
    word: str
    phonetic: str | None = None
    part_of_speech: str | None = None
    definition_cn: str | None = None
    definition_en: str | None = None
    example_en: str | None = None
    example_cn: str | None = None
    frequency: int | None = None
    tags: str | None = None
    audio_url: str | None = None

    model_config = {"from_attributes": True}


class WordProgressResponse(BaseModel):
    id: int
    word_id: int
    word: WordResponse
    status: str
    ease_factor: float
    interval: int
    repetitions: int
    next_review: datetime | None = None
    last_review: datetime | None = None
    correct_count: int
    wrong_count: int

    model_config = {"from_attributes": True}


class ReviewSubmit(BaseModel):
    word_id: int
    quality: int  # 0-5


class QuizQuestion(BaseModel):
    word_id: int
    word: str
    phonetic: str | None = None
    part_of_speech: str | None = None
    question_type: str  # "meaning" or "word"
    prompt: str  # The word itself or the definition
    options: list[str]  # 4 options


class QuizSubmit(BaseModel):
    answers: list[dict]  # [{word_id, selected}]


class QuizResult(BaseModel):
    word_id: int
    word: str
    correct: bool
    selected: str
    correct_answer: str


class VocabProgressStats(BaseModel):
    total_words: int
    new_words: int
    learning_words: int
    review_words: int
    mastered_words: int
    due_today: int
