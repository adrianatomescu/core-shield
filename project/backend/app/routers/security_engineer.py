import psycopg2
from fastapi import APIRouter, HTTPException

from app.schemas.security_engineer import PlaybookStepUpdate, TaskStatusUpdate
from app.services.security_engineer_service import (
    dismiss_notification,
    get_security_engineer_dashboard,
    update_playbook_step_config,
    update_task_status,
)

router = APIRouter(prefix="/security-engineer", tags=["security-engineer"])


def _database_error(exc: psycopg2.Error):
    return HTTPException(
        status_code=500,
        detail=f"Database error: {exc.pgerror or str(exc)}",
    )


@router.get("/dashboard")
def dashboard():
    try:
        return get_security_engineer_dashboard()
    except psycopg2.Error as exc:
        raise _database_error(exc)


@router.put("/playbook-steps/{step_id}")
def save_playbook_step(step_id: int, payload: PlaybookStepUpdate):
    try:
        step = update_playbook_step_config(step_id, payload.config)
    except psycopg2.Error as exc:
        raise _database_error(exc)

    if step is None:
        raise HTTPException(status_code=404, detail="Playbook step not found.")

    return step


@router.put("/tasks/{task_id}")
def save_task_status(task_id: int, payload: TaskStatusUpdate):
    if payload.status not in {"queued", "in_progress", "done"}:
        raise HTTPException(status_code=422, detail="Unsupported task status.")

    try:
        task = update_task_status(task_id, payload.status)
    except psycopg2.Error as exc:
        raise _database_error(exc)

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    return task


@router.put("/notifications/{notification_id}/dismiss")
def dismiss_engineering_notification(notification_id: int):
    try:
        notification = dismiss_notification(notification_id)
    except psycopg2.Error as exc:
        raise _database_error(exc)

    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")

    return notification
