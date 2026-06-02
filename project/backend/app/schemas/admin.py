from typing import Any

from pydantic import BaseModel, Field


class AdminCredentials(BaseModel):
    admin_email: str
    admin_password: str = Field(min_length=1)


class AdminTableReadRequest(AdminCredentials):
    table: str


class AdminRowUpdateRequest(AdminTableReadRequest):
    row_id: int
    changes: dict[str, Any]


class AdminRowCreateRequest(AdminTableReadRequest):
    values: dict[str, Any]


class AdminRowDeleteRequest(AdminTableReadRequest):
    row_id: int


class AdminQueryRequest(AdminCredentials):
    query: str = Field(min_length=1)
