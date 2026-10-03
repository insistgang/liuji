from pydantic import BaseModel


class ListeningMaterialResponse(BaseModel):
    id: int
    title: str
    section_type: str
    audio_url: str | None = None
    transcript: str | None = None
    difficulty: int
    duration: int
    source: str | None = None
    exercise_count: int = 0

    model_config = {"from_attributes": True}


class ListeningExerciseResponse(BaseModel):
    id: int
    material_id: int
    question_text: str | None = None
    options: list[str] = []
    correct_answer: str | None = None
    explanation: str | None = None
    timestamp: int = 0
    sort_order: int | None = None

    model_config = {"from_attributes": True}


class ListeningDetailResponse(BaseModel):
    material: ListeningMaterialResponse
    exercises: list[ListeningExerciseResponse]
