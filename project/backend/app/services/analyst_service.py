from psycopg2.extras import RealDictCursor

from app.database import get_db_connection


def _fetch_all(cursor, query: str, params=()):
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def _chart_points(cursor, query: str):
    return [
        {"label": row["label"], "value": row["value"]}
        for row in _fetch_all(cursor, query)
    ]


def get_analyst_dashboard():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)

        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM alerts) AS alerts_triaged,
                (SELECT COUNT(*) FROM incidents WHERE status <> 'closed') AS open_investigations,
                COALESCE(
                    (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE severity = 'low') / NULLIF(COUNT(*), 0)) FROM alerts),
                    0
                ) AS false_positive_rate,
                COALESCE(
                    (
                        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (finished_at - started_at)) / 60))
                        FROM playbook_executions
                        WHERE finished_at IS NOT NULL
                    ),
                    38
                ) AS mttr
            """
        )
        metric_values = dict(cursor.fetchone())
        metrics = [
            {"label": "Alerts triaged", "value": str(metric_values["alerts_triaged"]), "note": "across network, endpoint, identity and mail signals"},
            {"label": "Open investigations", "value": str(metric_values["open_investigations"]), "note": "active cases waiting for analyst decisions"},
            {"label": "False positive rate", "value": f'{metric_values["false_positive_rate"]}%', "note": "low-severity signals kept visible for review"},
            {"label": "MTTR", "value": f'{metric_values["mttr"]}m', "note": "average response workflow duration"},
        ]

        controls = _fetch_all(
            cursor,
            """
            SELECT category, name, detail, value
            FROM analyst_controls
            ORDER BY category, id
            """,
        )
        controls_by_category = {}

        for row in controls:
            controls_by_category.setdefault(row["category"], []).append(
                {"name": row["name"], "detail": row["detail"], "value": row["value"]}
            )

        monitoring_rows = _fetch_all(
            cursor,
            """
            SELECT source AS name, MAX(message) AS detail, COUNT(*)::text || ' alerts' AS value
            FROM alerts
            GROUP BY source
            ORDER BY COUNT(*) DESC, source
            """
        )
        investigation_rows = _fetch_all(
            cursor,
            """
            SELECT title AS name,
                'Incident #' || id || ' · ' || severity::text AS detail,
                REPLACE(status::text, '_', ' ') AS value
            FROM incidents
            ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, id
            """
        )

        chart_series = {
            "incidentSeverity": _chart_points(
                cursor,
                """
                SELECT INITCAP(severity::text) AS label, COUNT(*)::int AS value
                FROM incidents GROUP BY severity ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
                """,
            ),
            "incidentStatus": _chart_points(
                cursor,
                """
                SELECT INITCAP(REPLACE(status::text, '_', ' ')) AS label, COUNT(*)::int AS value
                FROM incidents GROUP BY status ORDER BY status
                """,
            ),
            "alertSources": _chart_points(
                cursor,
                """
                SELECT source AS label, COUNT(*)::int AS value
                FROM alerts GROUP BY source ORDER BY COUNT(*) DESC, source
                """,
            ),
            "executionHealth": _chart_points(
                cursor,
                """
                SELECT INITCAP(status::text) AS label, COUNT(*)::int AS value
                FROM playbook_executions GROUP BY status ORDER BY status
                """,
            ),
        }
        modules = [
            {
                "id": "monitoring",
                "title": "SIEM Monitoring",
                "description": "Follow network, endpoint, identity and mailbox signals from one triage surface.",
                "action": "Inspect signal stream",
                "count": str(metric_values["alerts_triaged"]),
                "rows": monitoring_rows,
            },
            {
                "id": "investigations",
                "title": "Incident Response",
                "description": "Investigate, isolate and remediate suspicious activity while preserving evidence.",
                "action": "Open investigation desk",
                "count": str(metric_values["open_investigations"]),
                "rows": investigation_rows,
            },
            {
                "id": "vulnerabilities",
                "title": "Vulnerability Scans",
                "description": "Review exposed services, weak configurations and remediation progress.",
                "action": "Open scan findings",
                "count": str(len(controls_by_category.get("vulnerabilities", []))),
                "rows": controls_by_category.get("vulnerabilities", []),
            },
            {
                "id": "analytics",
                "title": "Analytics & Reports",
                "description": "Turn SIEM data into focused visual investigations and evidence-ready reports.",
                "action": "Open analytics studio",
                "count": str(len(chart_series)),
                "rows": [
                    {"name": "Incident severity", "detail": "Cases grouped by operational risk", "value": f'{sum(point["value"] for point in chart_series["incidentSeverity"])} cases'},
                    {"name": "Alert source mix", "detail": "Signals grouped by detection source", "value": f'{sum(point["value"] for point in chart_series["alertSources"])} alerts'},
                    {"name": "Execution health", "detail": "Response workflow outcomes", "value": f'{sum(point["value"] for point in chart_series["executionHealth"])} runs'},
                ],
            },
            {
                "id": "recovery",
                "title": "Recovery & Training",
                "description": "Track recovery drills, policy readiness and awareness activities after incidents.",
                "action": "Review readiness plan",
                "count": str(len(controls_by_category.get("recovery", []))),
                "rows": controls_by_category.get("recovery", []),
            },
        ]

        priorities = _fetch_all(cursor, "SELECT title, detail, status FROM analyst_priorities ORDER BY id")
        notifications = _fetch_all(
            cursor,
            """
            SELECT id, title, detail, tone,
                CASE
                    WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
                        THEN EXTRACT(MINUTE FROM CURRENT_TIMESTAMP - created_at)::int || ' min ago'
                    ELSE EXTRACT(HOUR FROM CURRENT_TIMESTAMP - created_at)::int || 'h ago'
                END AS time
            FROM analyst_notifications
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
            WHERE users.role = 'ANALYST'
            ORDER BY CASE tasks.status WHEN 'in_progress' THEN 1 WHEN 'queued' THEN 2 ELSE 3 END, tasks.id
            """,
        )
        report_charts = _fetch_all(
            cursor,
            """
            SELECT analyst_report_charts.id, analyst_report_charts.title,
                analyst_report_charts.dataset, analyst_report_charts.chart_type AS type
            FROM analyst_report_charts
            JOIN analyst_reports ON analyst_reports.id = analyst_report_charts.report_id
            WHERE analyst_reports.name = 'Daily SOC snapshot'
            ORDER BY analyst_report_charts.display_order, analyst_report_charts.id
            """,
        )

        return {
            "metrics": metrics,
            "modules": modules,
            "priorities": priorities,
            "notifications": notifications,
            "tasks": tasks,
            "chartSeries": chart_series,
            "reportCharts": report_charts,
        }
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def create_report_chart(title: str, dataset: str, chart_type: str):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            INSERT INTO analyst_report_charts (report_id, title, dataset, chart_type, display_order)
            SELECT analyst_reports.id, %s, %s, %s,
                COALESCE((SELECT MAX(display_order) + 1 FROM analyst_report_charts WHERE report_id = analyst_reports.id), 1)
            FROM analyst_reports
            WHERE analyst_reports.name = 'Daily SOC snapshot'
            RETURNING id, title, dataset, chart_type AS type
            """,
            (title, dataset, chart_type),
        )
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


def delete_report_chart(chart_id: int):
    return _update_returning_id("DELETE FROM analyst_report_charts WHERE id = %s RETURNING id", chart_id)


def dismiss_notification(notification_id: int):
    return _update_returning_id(
        "UPDATE analyst_notifications SET is_dismissed = TRUE WHERE id = %s RETURNING id",
        notification_id,
    )


def _update_returning_id(query: str, item_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, (item_id,))
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
