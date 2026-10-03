from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 0
    data: T | None = None
    message: str = "ok"


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int


class PaginatedResponse(BaseModel, Generic[T]):
    code: int = 0
    data: PaginatedData[T] | None = None
    message: str = "ok"
