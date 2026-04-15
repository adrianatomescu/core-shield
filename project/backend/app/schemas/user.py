import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


Role = Literal["ADMIN", "MANAGER", "SECURITY_ENGINEER", "ANALYST", "AUDITOR"]


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)
    role: Role

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("Email is required.")
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Email format is invalid.")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password is required.")
        return value


class AdminCreateUserRequest(BaseModel):
    admin_email: str
    admin_password: str = Field(min_length=1)
    new_user_email: str
    new_user_password: str = Field(min_length=8)
    new_user_role: Role

    @field_validator("admin_email", "new_user_email")
    @classmethod
    def validate_admin_related_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("Email is required.")
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Email format is invalid.")
        return normalized

    @field_validator("admin_password")
    @classmethod
    def validate_admin_password(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Administrator password is required.")
        return value

    @field_validator("new_user_password")
    @classmethod
    def validate_new_user_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("New user password must be at least 8 characters long.")
        if not value.strip():
            raise ValueError("New user password is required.")
        return value


class UserResponse(BaseModel):
    id: int
    email: str
    role: Role


class LoginResponse(BaseModel):
    message: str
    user: UserResponse


class CreateUserResponse(BaseModel):
    message: str
    user: UserResponse


class UsersListResponse(BaseModel):
    users: list[UserResponse]
