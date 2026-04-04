import psycopg2
from fastapi import HTTPException

from app.core.security import verify_password
from app.schemas.user import AdminCreateUserRequest, LoginRequest
from app.services.user_service import create_user, get_user_by_email


def authenticate_user(payload: LoginRequest):
    try:
        user_record = get_user_by_email(payload.email)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc.pgerror or str(exc)}",
        )

    if user_record is None:
        raise HTTPException(status_code=401, detail="The email address was not found.")

    if not user_record.enabled:
        raise HTTPException(status_code=403, detail="This account is disabled.")

    if payload.role != user_record.role:
        raise HTTPException(
            status_code=401,
            detail="The selected role does not match this account.",
        )

    if not verify_password(payload.password, user_record.password):
        raise HTTPException(status_code=401, detail="The password is incorrect.")

    return {
        "message": "Authentication successful",
        "user": {
            "id": user_record.id,
            "email": user_record.email,
            "role": user_record.role,
        },
    }


def create_user_with_admin_verification(payload: AdminCreateUserRequest):
    try:
        admin_record = get_user_by_email(payload.admin_email)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc.pgerror or str(exc)}",
        )

    if admin_record is None:
        raise HTTPException(status_code=401, detail="Administrator account not found.")

    if not admin_record.enabled:
        raise HTTPException(status_code=403, detail="Administrator account is disabled.")

    if admin_record.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only administrators can create accounts.")

    if not verify_password(payload.admin_password, admin_record.password):
        raise HTTPException(
            status_code=401,
            detail="Administrator password is incorrect.",
        )

    try:
        existing_user = get_user_by_email(payload.new_user_email)
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc.pgerror or str(exc)}",
        )

    if existing_user is not None:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    try:
        created_user = create_user(
            email=payload.new_user_email,
            password=payload.new_user_password,
            role=payload.new_user_role,
        )
    except psycopg2.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc.pgerror or str(exc)}",
        )

    return {
        "message": "Account created successfully.",
        "user": {
            "id": created_user.id,
            "email": created_user.email,
            "role": created_user.role,
        },
    }
