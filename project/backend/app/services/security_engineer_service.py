import json

from psycopg2.extras import Json, RealDictCursor

from app.database import get_db_connection


def _fetch_all(cursor, query: str, params=()):
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def get_security_engineer_dashboard():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)

        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM automation_rules WHERE is_active = TRUE) AS automations_live,
                (
                    SELECT COUNT(*)
                    FROM secret_rotation_events
                    WHERE status = 'success'
                      AND rotated_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                ) AS secrets_rotated,
                COALESCE((SELECT ROUND(AVG(score)) FROM security_engineer_controls), 0) AS coverage_score,
                (SELECT COUNT(*) FROM engineering_reviews WHERE status <> 'done') AS pending_reviews
            """
        )
        metric_values = dict(cursor.fetchone())
        metrics = [
            {
                "label": "Automations live",
                "value": str(metric_values["automations_live"]),
                "note": "active automation rules in production",
            },
            {
                "label": "Secrets rotated",
                "value": str(metric_values["secrets_rotated"]),
                "note": "successful events during the last 24 hours",
            },
            {
                "label": "Coverage score",
                "value": f'{metric_values["coverage_score"]}%',
                "note": "average across architecture, compliance and remediation controls",
            },
            {
                "label": "Pending reviews",
                "value": str(metric_values["pending_reviews"]),
                "note": "engineering decisions waiting for closure",
            },
        ]

        control_rows = _fetch_all(
            cursor,
            """
            SELECT category, name, detail, value
            FROM security_engineer_controls
            ORDER BY category, id
            """,
        )
        controls_by_category = {}

        for row in control_rows:
            controls_by_category.setdefault(row["category"], []).append(
                {
                    "name": row["name"],
                    "detail": row["detail"],
                    "value": row["value"],
                }
            )

        playbook_rows = _fetch_all(
            cursor,
            """
            SELECT
                playbooks.id,
                playbooks.name,
                playbooks.description,
                playbooks.is_automated,
                COUNT(playbook_executions.id) AS runs,
                COALESCE(
                    ROUND(
                        100.0 * COUNT(*) FILTER (WHERE playbook_executions.status = 'success')
                        / NULLIF(COUNT(playbook_executions.id), 0)
                    ),
                    0
                ) AS success_rate
            FROM playbooks
            LEFT JOIN playbook_executions ON playbook_executions.playbook_id = playbooks.id
            GROUP BY playbooks.id
            ORDER BY playbooks.id
            """,
        )
        automation_rows = [
            {
                "name": playbook["name"],
                "detail": "Automated playbook" if playbook["is_automated"] else "Manual playbook",
                "value": f'{playbook["runs"]} runs',
            }
            for playbook in playbook_rows
        ]

        monitoring_rows = _fetch_all(
            cursor,
            """
            SELECT source AS name, MAX(message) AS detail, COUNT(*)::text AS value
            FROM alerts
            GROUP BY source
            ORDER BY COUNT(*) DESC, source
            """,
        )
        modules = [
            {
                "id": "architecture",
                "title": "Secure Architecture",
                "description": "Design cloud, network and application boundaries before risky paths reach production.",
                "action": "Review architecture",
                "count": str(len(controls_by_category.get("architecture", []))),
                "rows": controls_by_category.get("architecture", []),
            },
            {
                "id": "automation",
                "title": "Security Automation",
                "description": "Build response playbooks, rotate secrets and remove repetitive manual work.",
                "action": "Open automation studio",
                "count": str(metric_values["automations_live"]),
                "rows": automation_rows,
            },
            {
                "id": "monitoring",
                "title": "Threat Monitoring",
                "description": "Watch logs, firewall events, malware indicators and DDoS patterns in one queue.",
                "action": "Inspect threat signals",
                "count": str(sum(int(row["value"]) for row in monitoring_rows)),
                "rows": monitoring_rows,
            },
            {
                "id": "compliance",
                "title": "Compliance & Audit",
                "description": "Keep GDPR, HIPAA and PCI controls mapped to engineering changes and audit trails.",
                "action": "View audit evidence",
                "count": f'{metric_values["coverage_score"]}%',
                "rows": controls_by_category.get("compliance", []),
            },
            {
                "id": "vulnerabilities",
                "title": "Vulnerability Management",
                "description": "Prioritize weaknesses, penetration test findings and remediation work.",
                "action": "Open remediation queue",
                "count": str(len(controls_by_category.get("vulnerabilities", []))),
                "rows": controls_by_category.get("vulnerabilities", []),
            },
        ]

        priorities = _fetch_all(
            cursor,
            """
            SELECT title, detail, status
            FROM engineering_reviews
            WHERE status <> 'done'
            ORDER BY id
            """,
        )
        notifications = _fetch_all(
            cursor,
            """
            SELECT id, title, detail, tone,
                CASE
                    WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
                        THEN EXTRACT(MINUTE FROM CURRENT_TIMESTAMP - created_at)::int || ' min ago'
                    ELSE EXTRACT(HOUR FROM CURRENT_TIMESTAMP - created_at)::int || 'h ago'
                END AS time
            FROM engineering_notifications
            WHERE is_dismissed = FALSE
            ORDER BY created_at DESC
            """,
        )
        tasks = _fetch_all(
            cursor,
            """
            SELECT tasks.id, tasks.title, tasks.priority, tasks.status, users.email AS owner,
                CASE
                    WHEN tasks.status = 'done' THEN 'Completed'
                    WHEN tasks.due_at::date = CURRENT_DATE THEN 'Today, ' || TO_CHAR(tasks.due_at, 'HH24:MI')
                    WHEN tasks.due_at::date = CURRENT_DATE + 1 THEN 'Tomorrow, ' || TO_CHAR(tasks.due_at, 'HH24:MI')
                    ELSE TO_CHAR(tasks.due_at, 'Mon DD, HH24:MI')
                END AS due
            FROM tasks
            JOIN users ON users.id = tasks.assigned_to
            WHERE users.role = 'SECURITY_ENGINEER'
            ORDER BY CASE tasks.status WHEN 'in_progress' THEN 1 WHEN 'queued' THEN 2 ELSE 3 END, tasks.id
            """,
        )

        playbook_steps = _fetch_all(
            cursor,
            """
            SELECT id, playbook_id, step_order, action_type, config
            FROM playbook_steps
            ORDER BY playbook_id, step_order
            """,
        )
        steps_by_playbook = {}

        for step in playbook_steps:
            config = step["config"]
            steps_by_playbook.setdefault(step["playbook_id"], []).append(
                {
                    "id": step["id"],
                    "stepOrder": step["step_order"],
                    "actionType": step["action_type"],
                    "label": config.get("label", step["action_type"].replace("_", " ").title()),
                    "config": json.dumps(config, indent=2),
                }
            )

        playbooks = [
            {
                "id": playbook["id"],
                "name": playbook["name"],
                "description": playbook["description"],
                "automated": playbook["is_automated"],
                "runs": playbook["runs"],
                "successRate": playbook["success_rate"],
                "steps": steps_by_playbook.get(playbook["id"], []),
            }
            for playbook in playbook_rows
        ]

        return {
            "metrics": metrics,
            "modules": modules,
            "priorities": priorities,
            "notifications": notifications,
            "playbooks": playbooks,
            "tasks": tasks,
        }
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def update_playbook_step_config(step_id: int, config: dict):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            UPDATE playbook_steps
            SET config = %s
            WHERE id = %s
            RETURNING id, playbook_id, step_order, action_type, config
            """,
            (Json(config), step_id),
        )
        row = cursor.fetchone()

        if row is None:
            return None

        connection.commit()
        return dict(row)
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def update_task_status(task_id: int, status: str):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            UPDATE tasks
            SET status = %s::task_status,
                completed_at = CASE WHEN %s = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id = %s
            RETURNING id, status
            """,
            (status, status, task_id),
        )
        row = cursor.fetchone()

        if row is None:
            return None

        connection.commit()
        return dict(row)
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def dismiss_notification(notification_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            UPDATE engineering_notifications
            SET is_dismissed = TRUE
            WHERE id = %s
            RETURNING id
            """,
            (notification_id,),
        )
        row = cursor.fetchone()

        if row is None:
            return None

        connection.commit()
        return dict(row)
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()
