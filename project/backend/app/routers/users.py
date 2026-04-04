from fastapi import APIRouter

from app.schemas.user import AdminCreateUserRequest, CreateUserResponse
from app.services.auth_service import create_user_with_admin_verification

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/ping")
def users_ping():
    return {"message": "Users router is ready"}


@router.post("/admin-create", response_model=CreateUserResponse)
def admin_create_user(payload: AdminCreateUserRequest):
    return create_user_with_admin_verification(payload)
