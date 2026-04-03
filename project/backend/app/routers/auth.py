from fastapi import APIRouter

from app.schemas.user import LoginRequest, LoginResponse
from app.services.auth_service import authenticate_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    return authenticate_user(payload)
