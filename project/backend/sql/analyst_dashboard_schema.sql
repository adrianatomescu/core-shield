-- =========================
-- ANALYST DASHBOARD
-- Persistent SOC controls, notifications and report builder
-- =========================

CREATE TABLE IF NOT EXISTS analyst_controls (
    id SERIAL PRIMARY KEY,
    category VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    detail VARCHAR(255) NOT NULL,
    value VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category, name)
);

CREATE TABLE IF NOT EXISTS analyst_priorities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analyst_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    tone VARCHAR(32) NOT NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analyst_reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS analyst_report_charts (
    id SERIAL PRIMARY KEY,
    report_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    dataset VARCHAR(64) NOT NULL,
    chart_type VARCHAR(16) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES analyst_reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analyst_report_charts_report_id
ON analyst_report_charts(report_id);

INSERT INTO analyst_controls (category, name, detail, value, status)
VALUES
    ('vulnerabilities', 'External perimeter', 'Critical exposure validation', '2 findings', 'critical'),
    ('vulnerabilities', 'Endpoint fleet', 'Patch verification', '5 findings', 'review'),
    ('vulnerabilities', 'Cloud services', 'Configuration drift', '4 findings', 'review'),
    ('recovery', 'Identity restore drill', 'Backup service validation', 'scheduled', 'testing'),
    ('recovery', 'Phishing awareness', 'Finance team simulation', '82%', 'active'),
    ('recovery', 'Incident handbook', 'Quarterly recovery review', 'ready', 'active')
ON CONFLICT (category, name) DO UPDATE SET
    detail = EXCLUDED.detail,
    value = EXCLUDED.value,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO analyst_priorities (title, detail, status)
VALUES
    ('Contain VPN credential attack', 'Correlate source IPs and confirm firewall isolation for the critical VPN incident.', 'critical'),
    ('Review finance mailbox evidence', 'Validate forwarding-rule history before escalating the phishing case.', 'review'),
    ('Build daily SOC snapshot', 'Summarize severity, source mix and workflow health for the shift report.', 'testing')
ON CONFLICT (title) DO NOTHING;

INSERT INTO analyst_notifications (title, detail, tone, created_at)
VALUES
    ('Critical VPN cluster assigned', 'Nine correlated firewall alerts are ready for analyst triage.', 'critical', CURRENT_TIMESTAMP - INTERVAL '6 minutes'),
    ('Mailbox evidence enriched', 'Finance forwarding-rule evidence is available for review.', 'review', CURRENT_TIMESTAMP - INTERVAL '19 minutes'),
    ('Recovery drill reminder', 'Backup identity validation starts tomorrow at 10:00.', 'testing', CURRENT_TIMESTAMP - INTERVAL '1 hour')
ON CONFLICT (title) DO NOTHING;

INSERT INTO alerts (source, severity, message)
SELECT seed.source, seed.severity::severity_level, seed.message
FROM (
    VALUES
        ('Mail Gateway', 'high', 'Suspicious forwarding rule created for the finance mailbox.'),
        ('EDR', 'medium', 'Unsigned PowerShell execution requires analyst validation.'),
        ('SIEM / Edge Firewall', 'critical', 'Correlated source IP cluster is targeting the VPN gateway.')
) AS seed(source, severity, message)
WHERE NOT EXISTS (SELECT 1 FROM alerts WHERE alerts.message = seed.message);

INSERT INTO incidents (title, description, severity, status, source, confidence_score, assigned_user_id)
SELECT seed.title, seed.description, seed.severity::severity_level, seed.status::incident_status,
    seed.source::incident_source, seed.confidence_score, users.id
FROM (
    VALUES
        ('VPN credential attack', 'Correlated firewall signals show a concentrated brute-force campaign.', 'critical', 'in_progress', 'rule_based', 0.96),
        ('Finance mailbox forwarding', 'A suspicious forwarding rule may expose sensitive finance conversations.', 'high', 'open', 'manual', 0.88),
        ('Endpoint script execution', 'Unsigned PowerShell activity requires endpoint validation.', 'medium', 'open', 'ml_based', 0.72)
) AS seed(title, description, severity, status, source, confidence_score)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'ANALYST' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM incidents WHERE incidents.title = seed.title);

INSERT INTO incident_alerts (incident_id, alert_id)
SELECT incidents.id, alerts.id
FROM incidents
JOIN alerts ON
    (incidents.title = 'VPN credential attack' AND alerts.source = 'SIEM / Edge Firewall')
    OR (incidents.title = 'Finance mailbox forwarding' AND alerts.source = 'Mail Gateway')
    OR (incidents.title = 'Endpoint script execution' AND alerts.source = 'EDR')
WHERE incidents.title IN ('VPN credential attack', 'Finance mailbox forwarding', 'Endpoint script execution')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, priority, status, assigned_to, created_by, due_at)
SELECT seed.title, seed.description, seed.priority::task_priority, seed.status::task_status,
    users.id, users.id, seed.due_at
FROM (
    VALUES
        ('Validate incident #801 and confirm source IP cluster', 'Correlate VPN gateway alerts and confirm the suspicious IP set.', 'high', 'in_progress', CURRENT_TIMESTAMP + INTERVAL '2 hours'),
        ('Review suspicious mailbox forwarding rule for finance', 'Inspect mailbox audit evidence and document the root cause.', 'medium', 'queued', CURRENT_TIMESTAMP + INTERVAL '5 hours'),
        ('Close low-confidence PowerShell case if patching confirmed', 'Validate endpoint patching before closing the detection.', 'low', 'done', CURRENT_TIMESTAMP - INTERVAL '1 hour')
) AS seed(title, description, priority, status, due_at)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'ANALYST' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE tasks.title = seed.title);

INSERT INTO playbook_executions (playbook_id, incident_id, status, started_at, finished_at)
SELECT playbooks.id, incidents.id, seed.status::execution_status,
    CURRENT_TIMESTAMP - seed.started_ago, CURRENT_TIMESTAMP - seed.finished_ago
FROM (
    VALUES
        ('Block Malicious IP', 'VPN credential attack', 'success', INTERVAL '42 minutes', INTERVAL '38 minutes'),
        ('Contain Suspicious Endpoint', 'Endpoint script execution', 'running', INTERVAL '18 minutes', NULL),
        ('Block Malicious IP', 'VPN credential attack', 'failed', INTERVAL '12 minutes', INTERVAL '10 minutes')
) AS seed(playbook_name, incident_title, status, started_ago, finished_ago)
JOIN playbooks ON playbooks.name = seed.playbook_name
JOIN incidents ON incidents.title = seed.incident_title
WHERE NOT EXISTS (
    SELECT 1 FROM playbook_executions
    WHERE playbook_executions.playbook_id = playbooks.id
      AND playbook_executions.incident_id = incidents.id
      AND playbook_executions.status = seed.status::execution_status
);

INSERT INTO analyst_reports (name, created_by)
SELECT 'Daily SOC snapshot', users.id
FROM (
    SELECT id FROM users WHERE role = 'ANALYST' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM analyst_reports WHERE name = 'Daily SOC snapshot');

INSERT INTO analyst_report_charts (report_id, title, dataset, chart_type, display_order)
SELECT analyst_reports.id, 'Incident severity overview', 'incidentSeverity', 'bar', 1
FROM analyst_reports
WHERE analyst_reports.name = 'Daily SOC snapshot'
  AND NOT EXISTS (
      SELECT 1 FROM analyst_report_charts
      WHERE analyst_report_charts.report_id = analyst_reports.id
        AND analyst_report_charts.title = 'Incident severity overview'
  );
