import psycopg2
from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatMessageCreate, ChatThreadCreate
from app.services.chat_service import create_message, create_thread, get_threads

router = APIRouter(prefix="/chat", tags=["chat"])


def _database_error(exc: psycopg2.Error):
    return HTTPException(status_code=500, detail=f"Database error: {exc.pgerror or str(exc)}")


@router.get("/threads")
def threads(user_email: str):
    try:
        result = get_threads(user_email)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if result is None:
        raise HTTPException(status_code=404, detail="Chat user not found.")
    return result


@router.post("/threads")
def add_thread(payload: ChatThreadCreate):
    try:
        result = create_thread(payload.subject, payload.creator_email, payload.participant_emails)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if result is None:
        raise HTTPException(status_code=404, detail="One or more chat participants were not found.")
    return result


@router.post("/threads/{thread_id}/messages")
def add_message(thread_id: int, payload: ChatMessageCreate):
    try:
        result = create_message(thread_id, payload.sender_email, payload.body)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if result is None:
        raise HTTPException(status_code=404, detail="Chat thread or sender membership not found.")
    return result
