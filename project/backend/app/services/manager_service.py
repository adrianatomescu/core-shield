from psycopg2.extras import RealDictCursor

from app.database import get_db_connection


def _fetch_all(cursor, query: str, params=()):
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def _write(query: str, params):
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


def get_manager_dashboard():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM manager_controls WHERE category = 'policies') AS policies_active,
                COALESCE((SELECT ROUND(AVG(score)) FROM manager_controls WHERE category = 'personnel'), 0) AS team_coverage,
                (SELECT COUNT(*) FROM manager_controls WHERE category = 'risks') AS risk_actions,
                (SELECT COUNT(*) FROM manager_controls WHERE category = 'systems') AS systems_monitored
            """
        )
        values = dict(cursor.fetchone())
        metrics = [
            {"label": "Policies active", "value": str(values["policies_active"]), "note": "security protocols and emergency procedures tracked"},
            {"label": "Team coverage", "value": f'{values["team_coverage"]}%', "note": "staffing, training and supervision readiness"},
            {"label": "Risk actions", "value": str(values["risk_actions"]), "note": "physical and cyber risk areas currently assessed"},
            {"label": "Systems monitored", "value": str(values["systems_monitored"]), "note": "CCTV, alarms and access-control groups supervised"},
        ]

        controls = _fetch_all(cursor, "SELECT category, name, detail, value FROM manager_controls ORDER BY category, id")
        grouped = {}
        for row in controls:
            grouped.setdefault(row["category"], []).append({"name": row["name"], "detail": row["detail"], "value": row["value"]})

        task_rows = _fetch_all(
            cursor,
            """
            SELECT tasks.id, tasks.title, tasks.description, tasks.priority, tasks.status,
                tasks.approval_status, assignee.email AS owner,
                CASE WHEN tasks.status = 'done' THEN 'Completed'
                    WHEN tasks.due_at::date = CURRENT_DATE THEN 'Today, ' || TO_CHAR(tasks.due_at, 'HH24:MI')
                    WHEN tasks.due_at::date = CURRENT_DATE + 1 THEN 'Tomorrow, ' || TO_CHAR(tasks.due_at, 'HH24:MI')
                    ELSE TO_CHAR(tasks.due_at, 'Mon DD, HH24:MI') END AS due
            FROM tasks
            JOIN users AS assignee ON assignee.id = tasks.assigned_to
            JOIN users AS creator ON creator.id = tasks.created_by
            WHERE creator.role = 'MANAGER'
            ORDER BY CASE tasks.approval_status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END, tasks.id DESC
            """,
        )
        leave_requests = _fetch_all(
            cursor,
            """
            SELECT manager_leave_requests.id, users.email AS employee,
                manager_leave_requests.request_type, manager_leave_requests.reason,
                manager_leave_requests.status,
                TO_CHAR(manager_leave_requests.starts_on, 'Mon DD, YYYY') AS starts_on,
                TO_CHAR(manager_leave_requests.ends_on, 'Mon DD, YYYY') AS ends_on
            FROM manager_leave_requests
            JOIN users ON users.id = manager_leave_requests.employee_id
            ORDER BY CASE manager_leave_requests.status WHEN 'pending' THEN 1 ELSE 2 END, manager_leave_requests.id DESC
            """,
        )
        reports = _fetch_all(
            cursor,
            """
            SELECT manager_reports.id, manager_reports.title, manager_reports.report_type,
                manager_reports.description, manager_reports.status, manager_reports.recommendation,
                COALESCE(users.email, 'unassigned') AS owner,
                TO_CHAR(manager_reports.updated_at, 'Mon DD, YYYY HH24:MI') AS updated_at
            FROM manager_reports
            LEFT JOIN users ON users.id = manager_reports.created_by
            ORDER BY manager_reports.updated_at DESC, manager_reports.id DESC
            """,
        )
        modules = [
            {"id": "policies", "title": "Policy Development", "description": "Create and supervise security protocols, procedures and emergency response plans.", "action": "Review policy desk", "count": str(len(grouped.get("policies", []))), "rows": grouped.get("policies", [])},
            {"id": "personnel", "title": "Personnel Management", "description": "Assign work, supervise teams, approve tasks and keep training and coverage visible.", "action": "Open management center", "count": str(len(task_rows)), "rows": [{"name": row["title"], "detail": row["owner"], "value": row["approval_status"]} for row in task_rows]},
            {"id": "risks", "title": "Risk Mitigation", "description": "Assess physical security gaps and cyber exposure, then prioritize mitigation ownership.", "action": "Inspect risk actions", "count": str(len(grouped.get("risks", []))), "rows": grouped.get("risks", [])},
            {"id": "incidents", "title": "Incident Investigation", "description": "Lead security-breach, theft and vandalism investigations with clear escalation ownership.", "action": "Open investigation desk", "count": str(len(grouped.get("incidents", []))), "rows": grouped.get("incidents", [])},
            {"id": "systems", "title": "Systems Oversight", "description": "Supervise CCTV, alarms, access control and operational security technology.", "action": "Inspect security systems", "count": str(values["systems_monitored"]), "rows": grouped.get("systems", [])},
            {"id": "compliance", "title": "Compliance", "description": "Keep legal standards, industry regulations and internal requirements under review.", "action": "Review compliance posture", "count": str(len(grouped.get("compliance", []))), "rows": grouped.get("compliance", [])},
            {"id": "management", "title": "Management Center", "description": "Assign tasks, approve work and leave requests, and generate leadership reports.", "action": "Open management center", "count": str(len(task_rows) + len(leave_requests) + len(reports)), "rows": [
                {"name": "Task approvals", "detail": "Assignments waiting for management decisions", "value": str(sum(row["approval_status"] == "pending" for row in task_rows))},
                {"name": "Leave approvals", "detail": "Personnel requests awaiting review", "value": str(sum(row["status"] == "pending" for row in leave_requests))},
                {"name": "Leadership reports", "detail": "Draft, review and approved reports", "value": str(len(reports))},
            ]},
        ]
        priorities = _fetch_all(cursor, "SELECT title, detail, status FROM manager_priorities ORDER BY id")
        notifications = _fetch_all(
            cursor,
            """
            SELECT id, title, detail, tone,
                CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
                    THEN EXTRACT(MINUTE FROM CURRENT_TIMESTAMP - created_at)::int || ' min ago'
                    ELSE EXTRACT(HOUR FROM CURRENT_TIMESTAMP - created_at)::int || 'h ago' END AS time
            FROM manager_notifications WHERE is_dismissed = FALSE ORDER BY created_at DESC
            """,
        )
        team = _fetch_all(cursor, "SELECT id, email, role FROM users WHERE enabled = TRUE AND role <> 'ADMIN' ORDER BY role, email")
        return {"metrics": metrics, "modules": modules, "priorities": priorities, "notifications": notifications, "tasks": task_rows, "leave_requests": leave_requests, "reports": reports, "team": team}
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def create_task(title: str, description: str, priority: str, assignee_email: str, due_at: str):
    return _write(
        """
        INSERT INTO tasks (title, description, priority, assigned_to, created_by, due_at, approval_status)
        SELECT %s, %s, %s::task_priority, assignee.id, manager.id, %s::timestamp, 'pending'
        FROM users AS assignee
        CROSS JOIN LATERAL (SELECT id FROM users WHERE role = 'MANAGER' ORDER BY id LIMIT 1) AS manager
        WHERE assignee.email = %s AND assignee.role <> 'ADMIN'
        RETURNING id
        """,
        (title, description, priority, due_at, assignee_email),
    )


def update_task_approval(task_id: int, approval_status: str):
    return _write("UPDATE tasks SET approval_status = %s WHERE id = %s RETURNING id", (approval_status, task_id))


def update_leave_status(request_id: int, status: str):
    return _write(
        """
        UPDATE manager_leave_requests SET status = %s,
            reviewed_by = (SELECT id FROM users WHERE role = 'MANAGER' ORDER BY id LIMIT 1),
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = %s RETURNING id
        """,
        (status, request_id),
    )


def create_report(title: str, report_type: str, description: str, recommendation: str):
    return _write(
        """
        INSERT INTO manager_reports (title, report_type, description, recommendation, created_by)
        SELECT %s, %s, %s, %s, id FROM users WHERE role = 'MANAGER' ORDER BY id LIMIT 1
        RETURNING id
        """,
        (title, report_type, description, recommendation),
    )


def update_report_status(report_id: int, status: str):
    return _write("UPDATE manager_reports SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id", (status, report_id))


def delete_report(report_id: int):
    return _write("DELETE FROM manager_reports WHERE id = %s RETURNING id", (report_id,))


def dismiss_notification(notification_id: int):
    return _write("UPDATE manager_notifications SET is_dismissed = TRUE WHERE id = %s RETURNING id", (notification_id,))
