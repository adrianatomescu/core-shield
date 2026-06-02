import psycopg2
from fastapi import APIRouter, HTTPException

from app.schemas.manager import (
    ManagerLeaveStatusUpdate,
    ManagerReportCreate,
    ManagerReportStatusUpdate,
    ManagerTaskApprovalUpdate,
    ManagerTaskCreate,
)
from app.schemas.security_engineer import TaskStatusUpdate
from app.services.manager_service import (
    create_report,
    create_task,
    delete_report,
    dismiss_notification,
    get_manager_dashboard,
    update_leave_status,
    update_report_status,
    update_task_approval,
)
from app.services.security_engineer_service import update_task_status

router = APIRouter(prefix="/manager", tags=["manager"])


def _database_error(exc: psycopg2.Error):
    return HTTPException(status_code=500, detail=f"Database error: {exc.pgerror or str(exc)}")


@router.get("/dashboard")
def dashboard():
    try:
        return get_manager_dashboard()
    except psycopg2.Error as exc:
        raise _database_error(exc)


@router.post("/tasks")
def add_task(payload: ManagerTaskCreate):
    if payload.priority not in {"low", "medium", "high"}:
        raise HTTPException(status_code=422, detail="Unsupported task priority.")
    try:
        task = create_task(payload.title.strip(), payload.description.strip(), payload.priority, payload.assignee_email.strip().lower(), payload.due_at)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if task is None:
        raise HTTPException(status_code=404, detail="Assignee or manager account not found.")
    return task


@router.put("/tasks/{task_id}/approval")
def save_task_approval(task_id: int, payload: ManagerTaskApprovalUpdate):
    if payload.approval_status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Unsupported task approval status.")
    try:
        task = update_task_approval(task_id, payload.approval_status)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@router.put("/tasks/{task_id}/status")
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


@router.put("/leave-requests/{request_id}")
def save_leave_status(request_id: int, payload: ManagerLeaveStatusUpdate):
    if payload.status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Unsupported leave-request status.")
    try:
        request = update_leave_status(request_id, payload.status)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if request is None:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    return request


@router.post("/reports")
def add_report(payload: ManagerReportCreate):
    if payload.report_type not in {"leadership", "risk", "personnel", "systems", "compliance"}:
        raise HTTPException(status_code=422, detail="Unsupported manager report type.")
    try:
        report = create_report(payload.title.strip(), payload.report_type, payload.description.strip(), payload.recommendation.strip())
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if report is None:
        raise HTTPException(status_code=404, detail="Manager account not found.")
    return report


@router.put("/reports/{report_id}")
def save_report_status(report_id: int, payload: ManagerReportStatusUpdate):
    if payload.status not in {"draft", "review", "approved"}:
        raise HTTPException(status_code=422, detail="Unsupported manager report status.")
    try:
        report = update_report_status(report_id, payload.status)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if report is None:
        raise HTTPException(status_code=404, detail="Manager report not found.")
    return report


@router.delete("/reports/{report_id}")
def remove_report(report_id: int):
    try:
        report = delete_report(report_id)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if report is None:
        raise HTTPException(status_code=404, detail="Manager report not found.")
    return report


@router.put("/notifications/{notification_id}/dismiss")
def dismiss_manager_notification(notification_id: int):
    try:
        notification = dismiss_notification(notification_id)
    except psycopg2.Error as exc:
        raise _database_error(exc)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return notification
