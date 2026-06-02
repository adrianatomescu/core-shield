import psycopg2
from fastapi import APIRouter, HTTPException

from app.schemas.auditor import AuditorReportCreate, AuditorReportStatusUpdate
from app.schemas.security_engineer import TaskStatusUpdate
from app.services.auditor_service import (
    create_report,
    delete_report,
    dismiss_notification,
    get_auditor_dashboard,
    update_report_status,
)
from app.services.security_engineer_service import update_task_status

router = APIRouter(prefix="/auditor", tags=["auditor"])
REPORT_TYPES = {"compliance", "risk", "policy", "system_controls"}
REPORT_STATUSES = {"draft", "review", "approved"}


def _database_error(exc: psycopg2.Error):
    return HTTPException(status_code=500, detail=f"Database error: {exc.pgerror or str(exc)}")


@router.get("/dashboard")
def dashboard():
    try:
        return get_auditor_dashboard()
    except psycopg2.Error as exc:
        raise _database_error(exc)


@router.post("/reports")
def add_report(payload: AuditorReportCreate):
    if payload.report_type not in REPORT_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported auditor report type.")
    try:
        report = create_report(payload.title.strip(), payload.report_type, payload.description.strip(), payload.recommendation.strip())
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if report is None:
        raise HTTPException(status_code=404, detail="Auditor account not found.")
    return report


@router.put("/reports/{report_id}")
def save_report_status(report_id: int, payload: AuditorReportStatusUpdate):
    if payload.status not in REPORT_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported auditor report status.")
    try:
        report = update_report_status(report_id, payload.status)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if report is None:
        raise HTTPException(status_code=404, detail="Auditor report not found.")
    return report


@router.delete("/reports/{report_id}")
def remove_report(report_id: int):
    try:
        report = delete_report(report_id)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if report is None:
        raise HTTPException(status_code=404, detail="Auditor report not found.")
    return report


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
def dismiss_auditor_notification(notification_id: int):
    try:
        notification = dismiss_notification(notification_id)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return notification
