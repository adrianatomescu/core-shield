from typing import Any

from pydantic import BaseModel


class PlaybookStepUpdate(BaseModel):
    config: dict[str, Any]


class TaskStatusUpdate(BaseModel):
    status: str
