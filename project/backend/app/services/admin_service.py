from dataclasses import dataclass
from contextlib import closing
import re
from typing import Any

import psycopg2
from fastapi import HTTPException
from psycopg2 import sql
from psycopg2.extras import Json, RealDictCursor

from app.core.security import verify_password
from app.core.security import hash_password
from app.database import get_db_connection
from app.services.user_service import get_user_by_email


@dataclass(frozen=True)
class AdminTable:
    description: str
    editable: bool = True


ADMIN_TABLES = {
    "users": AdminTable("operator accounts, roles and access state"),
    "alerts": AdminTable("raw security telemetry intake"),
    "incidents": AdminTable("confirmed and in-progress cases"),
    "incident_alerts": AdminTable("alert-to-incident relation graph", editable=False),
    "playbooks": AdminTable("automation definitions and control flows"),
    "playbook_steps": AdminTable("step-level response actions and configs"),
    "playbook_executions": AdminTable("runtime orchestration history", editable=False),
    "execution_logs": AdminTable("debug detail for each execution path", editable=False),
    "audit_logs": AdminTable("append-only privileged activity trail", editable=False),
    "automation_rules": AdminTable("conditions and automated actions"),
    "tasks": AdminTable("operator assignments and workflow state"),
    "engineering_reviews": AdminTable("security engineering review queue"),
    "analyst_priorities": AdminTable("analyst investigation priorities"),
    "manager_controls": AdminTable("manager policy, personnel, risk and systems oversight"),
    "manager_priorities": AdminTable("manager leadership priorities"),
    "manager_notifications": AdminTable("manager operational notifications"),
    "manager_leave_requests": AdminTable("personnel leave approvals"),
    "manager_reports": AdminTable("leadership and management reports"),
    "mail_threads": AdminTable("persistent internal chat conversations"),
    "mail_thread_participants": AdminTable("chat membership and unread state"),
    "mail_messages": AdminTable("persistent internal chat messages"),
}

PROTECTED_COLUMNS = {
    "id",
    "password",
    "created_at",
    "updated_at",
    "completed_at",
    "started_at",
    "finished_at",
}

QUERY_COMMANDS = {"SELECT", "WITH", "INSERT", "UPDATE", "DELETE"}


def verify_admin(admin_email: str, admin_password: str):
    admin = get_user_by_email(admin_email.strip().lower())

    if admin is None or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    if not admin.enabled:
        raise HTTPException(status_code=403, detail="Administrator account is disabled.")
    if not verify_password(admin_password, admin.password):
        raise HTTPException(status_code=401, detail="Administrator password is incorrect.")

    return admin


def _get_table(table_name: str, require_editable: bool = False) -> AdminTable:
    table = ADMIN_TABLES.get(table_name, AdminTable("database table"))
    if require_editable and not table.editable:
        raise HTTPException(status_code=403, detail="This table is inspect-only.")
    return table


def _get_columns(cursor, table_name: str) -> list[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table_name,),
    )
    return [row["column_name"] for row in cursor.fetchall()]


def _adapt_value(value: Any):
    return Json(value) if isinstance(value, (dict, list)) else value


def _redact_row(row: dict[str, Any]):
    return {key: value for key, value in row.items() if key != "password"}


def _sanitize_insert_values(table_name: str, columns: list[str], values: dict[str, Any]):
    insertable_columns = set(columns) - PROTECTED_COLUMNS
    if table_name == "users":
        insertable_columns.add("password")

    sanitized_values = {
        key: value for key, value in values.items() if key in insertable_columns
    }
    if not sanitized_values:
        raise HTTPException(status_code=400, detail="No insertable fields were provided.")
    if table_name == "users":
        password = sanitized_values.get("password")
        if not isinstance(password, str) or len(password) < 8:
            raise HTTPException(
                status_code=400,
                detail="New user password must be at least 8 characters long.",
            )
        sanitized_values["password"] = hash_password(password)

    return sanitized_values


def list_admin_tables(admin_email: str, admin_password: str) -> list[dict[str, Any]]:
    verify_admin(admin_email, admin_password)

    with closing(get_db_connection()) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                """
            )
            available_tables = {row["table_name"] for row in cursor.fetchall()}
            tables = []

            for table_name in sorted(available_tables):
                metadata = _get_table(table_name)

                cursor.execute(
                    sql.SQL("SELECT COUNT(*) AS count FROM {}").format(
                        sql.Identifier(table_name)
                    )
                )
                row_count = cursor.fetchone()["count"]
                tables.append(
                    {
                        "name": table_name,
                        "description": metadata.description,
                        "rows": row_count,
                        "editable": metadata.editable,
                    }
                )

    return tables


def read_admin_table(admin_email: str, admin_password: str, table_name: str):
    verify_admin(admin_email, admin_password)
    metadata = _get_table(table_name)

    with closing(get_db_connection()) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            columns = _get_columns(cursor, table_name)
            if not columns:
                raise HTTPException(status_code=404, detail="The requested table does not exist.")

            visible_columns = [column for column in columns if column != "password"]
            order_column = "id" if "id" in visible_columns else visible_columns[0]
            cursor.execute(
                sql.SQL("SELECT {} FROM {} ORDER BY {} ASC LIMIT 100").format(
                    sql.SQL(", ").join(map(sql.Identifier, visible_columns)),
                    sql.Identifier(table_name),
                    sql.Identifier(order_column),
                )
            )
            rows = [dict(row) for row in cursor.fetchall()]

    return {
        "table": table_name,
        "columns": visible_columns,
        "editable_columns": [
            column for column in columns if column not in PROTECTED_COLUMNS
        ],
        "editable": metadata.editable,
        "insertable_columns": [
            *[column for column in columns if column not in PROTECTED_COLUMNS],
            *(["password"] if table_name == "users" else []),
        ],
        "rows": rows,
    }


def create_admin_row(
    admin_email: str,
    admin_password: str,
    table_name: str,
    values: dict[str, Any],
):
    verify_admin(admin_email, admin_password)
    _get_table(table_name, require_editable=True)

    with closing(get_db_connection()) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            columns = _get_columns(cursor, table_name)
            sanitized_values = _sanitize_insert_values(table_name, columns, values)
            query = sql.SQL("INSERT INTO {} ({}) VALUES ({}) RETURNING *").format(
                sql.Identifier(table_name),
                sql.SQL(", ").join(map(sql.Identifier, sanitized_values)),
                sql.SQL(", ").join(sql.Placeholder() for _ in sanitized_values),
            )
            cursor.execute(
                query,
                [_adapt_value(value) for value in sanitized_values.values()],
            )
            row = cursor.fetchone()
            connection.commit()

    return _redact_row(dict(row))


def update_admin_row(
    admin_email: str,
    admin_password: str,
    table_name: str,
    row_id: int,
    changes: dict[str, Any],
):
    admin = verify_admin(admin_email, admin_password)
    _get_table(table_name, require_editable=True)

    with closing(get_db_connection()) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            columns = _get_columns(cursor, table_name)
            editable_columns = set(columns) - PROTECTED_COLUMNS
            sanitized_changes = {
                key: value for key, value in changes.items() if key in editable_columns
            }
            if not sanitized_changes:
                raise HTTPException(status_code=400, detail="No editable fields were provided.")
            if table_name == "users" and row_id == admin.id:
                if sanitized_changes.get("enabled") is False:
                    raise HTTPException(status_code=400, detail="You cannot disable your own admin account.")
                if sanitized_changes.get("role") not in (None, "ADMIN"):
                    raise HTTPException(status_code=400, detail="You cannot remove your own admin role.")

            assignments = [
                sql.SQL("{} = %s").format(sql.Identifier(column))
                for column in sanitized_changes
            ]
            query = sql.SQL("UPDATE {} SET {} WHERE id = %s RETURNING *").format(
                sql.Identifier(table_name),
                sql.SQL(", ").join(assignments),
            )
            cursor.execute(
                query,
                [*(_adapt_value(value) for value in sanitized_changes.values()), row_id],
            )
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="The selected row was not found.")
            connection.commit()

    return _redact_row(dict(row))


def delete_admin_row(
    admin_email: str,
    admin_password: str,
    table_name: str,
    row_id: int,
):
    admin = verify_admin(admin_email, admin_password)
    _get_table(table_name, require_editable=True)
    if table_name == "users" and row_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    with closing(get_db_connection()) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                sql.SQL("DELETE FROM {} WHERE id = %s RETURNING id").format(
                    sql.Identifier(table_name)
                ),
                (row_id,),
            )
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="The selected row was not found.")
            connection.commit()

    return {"deleted_id": row["id"]}


def execute_admin_query(admin_email: str, admin_password: str, query: str):
    verify_admin(admin_email, admin_password)
    normalized_query = query.strip().rstrip(";").strip()
    if not normalized_query:
        raise HTTPException(status_code=400, detail="Query is required.")
    if ";" in normalized_query:
        raise HTTPException(status_code=400, detail="Run one query at a time.")

    match = re.match(r"^([A-Za-z]+)", normalized_query)
    command = match.group(1).upper() if match else ""
    if command not in QUERY_COMMANDS:
        raise HTTPException(
            status_code=400,
            detail="Only SELECT, WITH, INSERT, UPDATE and DELETE queries are allowed.",
        )

    with closing(get_db_connection()) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(normalized_query)
            rows = [dict(row) for row in cursor.fetchall()] if cursor.description else []
            affected_rows = cursor.rowcount
            connection.commit()

    return {
        "command": command,
        "affected_rows": affected_rows,
        "rows": rows[:200],
        "truncated": len(rows) > 200,
    }
