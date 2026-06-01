import psycopg2
from fastapi import APIRouter, HTTPException

from app.schemas.user import AdminCreateUserRequest, CreateUserResponse, UsersListResponse
from app.services.auth_service import create_user_with_admin_verification
from app.services.user_service import get_all_users, get_chat_directory

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/ping")
def users_ping():
    return {"message": "Users router is ready"}


@router.post("/admin-create", response_model=CreateUserResponse)
def admin_create_user(payload: AdminCreateUserRequest):
    return create_user_with_admin_verification(payload)


@router.get("", response_model=UsersListResponse)
def list_users():
    try:
        users = get_all_users()
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc.pgerror or str(exc)}",
        )

    return {"users": users}


@router.get("/chat-directory")
def chat_directory():
    try:
        return get_chat_directory()
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc.pgerror or str(exc)}",
        )
