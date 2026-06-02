from psycopg2.extras import RealDictCursor

from app.database import get_db_connection


def _fetch_all(cursor, query: str, params=()):
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def get_auditor_dashboard():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM auditor_controls WHERE status IN ('critical', 'review')) AS open_findings,
                COALESCE((SELECT ROUND(AVG(score)) FROM auditor_controls WHERE category = 'compliance'), 0) AS compliance_score,
                (SELECT COUNT(*) FROM auditor_reports) AS reports_managed,
                (SELECT COUNT(*) FROM auditor_controls WHERE category = 'systems') AS systems_sampled
            """
        )
        values = dict(cursor.fetchone())
        metrics = [
            {"label": "Open findings", "value": str(values["open_findings"]), "note": "control gaps and evidence items waiting for review"},
            {"label": "Compliance score", "value": f'{values["compliance_score"]}%', "note": "HIPAA, PCI-DSS and procedure alignment"},
            {"label": "Reports managed", "value": str(values["reports_managed"]), "note": "draft, review and approved management reports"},
            {"label": "Systems sampled", "value": str(values["systems_sampled"]), "note": "technical controls checked for unauthorized access"},
        ]
        controls = _fetch_all(cursor, "SELECT category, name, detail, value FROM auditor_controls ORDER BY category, id")
        grouped = {}
        for row in controls:
            grouped.setdefault(row["category"], []).append({"name": row["name"], "detail": row["detail"], "value": row["value"]})

        reports = _fetch_all(
            cursor,
            """
            SELECT auditor_reports.id, auditor_reports.title, auditor_reports.report_type,
                auditor_reports.description, auditor_reports.status, auditor_reports.recommendation,
                COALESCE(users.email, 'unassigned') AS owner,
                TO_CHAR(auditor_reports.updated_at, 'Mon DD, YYYY HH24:MI') AS updated_at
            FROM auditor_reports
            LEFT JOIN users ON users.id = auditor_reports.created_by
            ORDER BY auditor_reports.updated_at DESC, auditor_reports.id DESC
            """,
        )
        report_rows = [{"name": row["title"], "detail": row["description"], "value": row["status"]} for row in reports]
        modules = [
            {"id": "compliance", "title": "Compliance Evaluations", "description": "Evaluate procedures and evidence against HIPAA, PCI-DSS and internal requirements.", "action": "Review compliance evidence", "count": f'{values["compliance_score"]}%', "rows": grouped.get("compliance", [])},
            {"id": "risk", "title": "Risk Assessment & Testing", "description": "Identify vulnerabilities, test controls and evaluate external or insider-threat exposure.", "action": "Open risk testing desk", "count": str(len(grouped.get("risk", []))), "rows": grouped.get("risk", [])},
            {"id": "policies", "title": "Policy Review", "description": "Audit security policies, incident response plans and access-control matrices.", "action": "Inspect policy evidence", "count": str(len(grouped.get("policies", []))), "rows": grouped.get("policies", [])},
            {"id": "systems", "title": "System Auditing", "description": "Examine technical controls and traceability paths that minimize unauthorized access.", "action": "Inspect system controls", "count": str(values["systems_sampled"]), "rows": grouped.get("systems", [])},
            {"id": "reports", "title": "Report Management", "description": "Create management-ready reports, capture recommendations and move drafts toward approval.", "action": "Open report manager", "count": str(values["reports_managed"]), "rows": report_rows},
        ]
        priorities = _fetch_all(cursor, "SELECT title, detail, status FROM auditor_priorities ORDER BY id")
        notifications = _fetch_all(
            cursor,
            """
            SELECT id, title, detail, tone,
                CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
                    THEN EXTRACT(MINUTE FROM CURRENT_TIMESTAMP - created_at)::int || ' min ago'
                    ELSE EXTRACT(HOUR FROM CURRENT_TIMESTAMP - created_at)::int || 'h ago' END AS time
            FROM auditor_notifications WHERE is_dismissed = FALSE ORDER BY created_at DESC
            """,
        )
        tasks = _fetch_all(
            cursor,
            """
            SELECT tasks.id, tasks.title, tasks.priority, tasks.status, users.email AS owner,
                CASE WHEN tasks.status = 'done' THEN 'Completed'
                    WHEN tasks.due_at::date = CURRENT_DATE THEN 'Today, ' || TO_CHAR(tasks.due_at, 'HH24:MI')
                    WHEN tasks.due_at::date = CURRENT_DATE + 1 THEN 'Tomorrow, ' || TO_CHAR(tasks.due_at, 'HH24:MI')
                    ELSE TO_CHAR(tasks.due_at, 'Mon DD, HH24:MI') END AS due
            FROM tasks JOIN users ON users.id = tasks.assigned_to
            WHERE users.role = 'AUDITOR'
            ORDER BY CASE tasks.status WHEN 'in_progress' THEN 1 WHEN 'queued' THEN 2 ELSE 3 END, tasks.id
            """,
        )
        return {"metrics": metrics, "modules": modules, "priorities": priorities, "notifications": notifications, "tasks": tasks, "reports": reports}
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def create_report(title: str, report_type: str, description: str, recommendation: str):
    return _write_report(
        """
        INSERT INTO auditor_reports (title, report_type, description, recommendation, created_by)
        SELECT %s, %s, %s, %s, id FROM users WHERE role = 'AUDITOR' ORDER BY id LIMIT 1
        RETURNING id
        """,
        (title, report_type, description, recommendation),
    )


def update_report_status(report_id: int, status: str):
    return _write_report("UPDATE auditor_reports SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id", (status, report_id))


def delete_report(report_id: int):
    return _write_report("DELETE FROM auditor_reports WHERE id = %s RETURNING id", (report_id,))


def dismiss_notification(notification_id: int):
    return _write_report("UPDATE auditor_notifications SET is_dismissed = TRUE WHERE id = %s RETURNING id", (notification_id,))


def _write_report(query: str, params):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, params)
        row = cursor.fetchone()
        connection.commit()
        return dict(row) if row is not None else None
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()
