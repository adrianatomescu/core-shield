import psycopg2
from fastapi import APIRouter, HTTPException

from app.schemas.analyst import AnalystChartCreate
from app.schemas.security_engineer import TaskStatusUpdate
from app.services.analyst_service import (
    create_report_chart,
    delete_report_chart,
    dismiss_notification,
    get_analyst_dashboard,
)
from app.services.security_engineer_service import update_task_status

router = APIRouter(prefix="/analyst", tags=["analyst"])


def _database_error(exc: psycopg2.Error):
    return HTTPException(status_code=500, detail=f"Database error: {exc.pgerror or str(exc)}")


@router.get("/dashboard")
def dashboard():
    try:
        return get_analyst_dashboard()
    except psycopg2.Error as exc:
        raise _database_error(exc)


@router.post("/report-charts")
def add_report_chart(payload: AnalystChartCreate):
    if payload.dataset not in {"incidentSeverity", "incidentStatus", "alertSources", "executionHealth"}:
        raise HTTPException(status_code=422, detail="Unsupported analyst dataset.")
    if payload.type not in {"bar", "line", "donut"}:
        raise HTTPException(status_code=422, detail="Unsupported chart type.")

    try:
        chart = create_report_chart(payload.title.strip(), payload.dataset, payload.type)
    except psycopg2.Error as exc:
        raise _database_error(exc)

    if chart is None:
        raise HTTPException(status_code=404, detail="Daily SOC report not found.")
    return chart


@router.delete("/report-charts/{chart_id}")
def remove_report_chart(chart_id: int):
    try:
        chart = delete_report_chart(chart_id)
    except psycopg2.Error as exc:
        raise _database_error(exc)

    if chart is None:
        raise HTTPException(status_code=404, detail="Report chart not found.")
    return chart


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
def dismiss_analyst_notification(notification_id: int):
    try:
        notification = dismiss_notification(notification_id)
    except psycopg2.Error as exc:
        raise _database_error(exc)

    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return notification
