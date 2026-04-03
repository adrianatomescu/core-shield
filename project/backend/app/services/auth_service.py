import psycopg2
from fastapi import HTTPException

from app.core.security import verify_password
from app.schemas.user import LoginRequest
from app.services.user_service import get_user_by_email


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
