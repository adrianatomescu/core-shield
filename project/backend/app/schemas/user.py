from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str


class LoginResponse(BaseModel):
    message: str
    user: UserResponse
