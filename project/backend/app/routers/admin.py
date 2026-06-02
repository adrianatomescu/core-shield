import psycopg2
from fastapi import APIRouter, HTTPException

from app.schemas.admin import (
    AdminCredentials,
    AdminQueryRequest,
    AdminRowCreateRequest,
    AdminRowDeleteRequest,
    AdminRowUpdateRequest,
    AdminTableReadRequest,
)
from app.services.admin_service import (
    delete_admin_row,
    execute_admin_query,
    create_admin_row,
    list_admin_tables,
    read_admin_table,
    update_admin_row,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def database_error(exc: psycopg2.Error):
    raise HTTPException(
        status_code=500,
        detail=f"Database error: {exc.pgerror or str(exc)}",
    )


@router.post("/database/tables")
def admin_tables(payload: AdminCredentials):
    try:
        return {"tables": list_admin_tables(payload.admin_email, payload.admin_password)}
    except psycopg2.Error as exc:
        database_error(exc)


@router.post("/database/rows")
def admin_table_rows(payload: AdminTableReadRequest):
    try:
        return read_admin_table(payload.admin_email, payload.admin_password, payload.table)
    except psycopg2.Error as exc:
        database_error(exc)


@router.patch("/database/rows")
def admin_update_row(payload: AdminRowUpdateRequest):
    try:
        return {
            "row": update_admin_row(
                payload.admin_email,
                payload.admin_password,
                payload.table,
                payload.row_id,
                payload.changes,
            )
        }
    except psycopg2.Error as exc:
        database_error(exc)


@router.post("/database/rows/create")
def admin_create_row(payload: AdminRowCreateRequest):
    try:
        return {
            "row": create_admin_row(
                payload.admin_email,
                payload.admin_password,
                payload.table,
                payload.values,
            )
        }
    except psycopg2.Error as exc:
        database_error(exc)


@router.post("/database/rows/delete")
def admin_delete_row(payload: AdminRowDeleteRequest):
    try:
        return delete_admin_row(
            payload.admin_email,
            payload.admin_password,
            payload.table,
            payload.row_id,
        )
    except psycopg2.Error as exc:
        database_error(exc)


@router.post("/database/query")
def admin_query(payload: AdminQueryRequest):
    try:
        return execute_admin_query(
            payload.admin_email,
            payload.admin_password,
            payload.query,
        )
    except psycopg2.Error as exc:
        database_error(exc)
