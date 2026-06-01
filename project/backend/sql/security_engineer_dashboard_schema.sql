-- =========================
-- SECURITY ENGINEER DASHBOARD
-- Persistent controls + demo seed data
-- =========================

CREATE TABLE IF NOT EXISTS security_engineer_controls (
    id SERIAL PRIMARY KEY,
    category VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    detail VARCHAR(255) NOT NULL,
    value VARCHAR(32) NOT NULL,
    score INT,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category, name)
);

CREATE TABLE IF NOT EXISTS secret_rotation_events (
    id SERIAL PRIMARY KEY,
    target VARCHAR(160) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS engineering_reviews (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS engineering_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    tone VARCHAR(32) NOT NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE engineering_notifications
ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO security_engineer_controls (category, name, detail, value, score, status)
VALUES
    ('architecture', 'AWS landing zone', 'Segmentation review', '96%', 96, 'active'),
    ('architecture', 'VPN gateway', 'Hardening checklist', '84%', 84, 'review'),
    ('architecture', 'IAM policy set', 'Least privilege drift', '12', 88, 'review'),
    ('compliance', 'GDPR', 'Access traceability', '94%', 94, 'active'),
    ('compliance', 'PCI DSS', 'Change evidence', '89%', 89, 'review'),
    ('compliance', 'HIPAA', 'Control coverage', '90%', 90, 'active'),
    ('vulnerabilities', 'Critical exposure', 'External perimeter', '2', 72, 'critical'),
    ('vulnerabilities', 'Patch validation', 'Endpoint fleet', '5', 86, 'testing'),
    ('vulnerabilities', 'Config drift', 'Cloud services', '4', 82, 'review')
ON CONFLICT (category, name) DO UPDATE SET
    detail = EXCLUDED.detail,
    value = EXCLUDED.value,
    score = EXCLUDED.score,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO secret_rotation_events (target, status, rotated_at)
SELECT 'cloud-vault-' || sequence, 'success', CURRENT_TIMESTAMP - (sequence || ' minutes')::INTERVAL
FROM generate_series(1, 42) AS sequence
WHERE NOT EXISTS (SELECT 1 FROM secret_rotation_events);

INSERT INTO engineering_reviews (title, detail, status)
VALUES
    ('Harden firewall deny action retry', 'Incident #801 needs rollback coverage before rollout.', 'critical'),
    ('Review IAM policy drift', '12 privileged paths changed across the AWS landing zone.', 'review'),
    ('Validate endpoint isolation fallback', 'Dry run is ready for the EDR containment path.', 'testing')
ON CONFLICT (title) DO NOTHING;

INSERT INTO engineering_notifications (title, detail, tone, created_at)
VALUES
    ('Firewall retry requires review', 'The deny action for incident #801 returned a partial provider response.', 'critical', CURRENT_TIMESTAMP - INTERVAL '8 minutes'),
    ('IAM drift scan completed', '12 privileged paths changed since the previous AWS landing zone review.', 'review', CURRENT_TIMESTAMP - INTERVAL '24 minutes'),
    ('Secret rotation succeeded', 'Cloud and VPN credentials rotated without failed targets.', 'testing', CURRENT_TIMESTAMP - INTERVAL '1 hour')
ON CONFLICT (title) DO NOTHING;

INSERT INTO playbooks (name, description, created_by, is_automated)
SELECT seed.name, seed.description, users.id, TRUE
FROM (
    VALUES
        ('Contain Suspicious Endpoint', 'Isolate host, notify analyst and enrich ticket with endpoint telemetry.'),
        ('Block Malicious IP', 'Push firewall block rule and create a change trace in audit logs.')
) AS seed(name, description)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'SECURITY_ENGINEER' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE playbooks.name = seed.name);

INSERT INTO playbook_steps (playbook_id, step_order, action_type, config)
SELECT playbooks.id, seed.step_order, seed.action_type::action_type_enum, seed.config::jsonb
FROM (
    VALUES
        ('Contain Suspicious Endpoint', 1, 'API_CALL', '{"label":"Call EDR isolate endpoint API","provider":"SentinelOne","mode":"network_isolation"}'),
        ('Contain Suspicious Endpoint', 2, 'EMAIL', '{"label":"Send analyst notification","to":"soc@local.dev","template":"endpoint-contained"}'),
        ('Contain Suspicious Endpoint', 3, 'SCRIPT', '{"label":"Enrich incident with process tree","script":"collect_process_tree.sh"}'),
        ('Block Malicious IP', 1, 'API_CALL', '{"label":"Create temporary firewall deny rule","provider":"Palo Alto","ttl_minutes":90}'),
        ('Block Malicious IP', 2, 'SCRIPT', '{"label":"Write evidence to artifact bucket","script":"archive_ioc.py"}')
) AS seed(playbook_name, step_order, action_type, config)
JOIN playbooks ON playbooks.name = seed.playbook_name
WHERE NOT EXISTS (
    SELECT 1
    FROM playbook_steps
    WHERE playbook_steps.playbook_id = playbooks.id
      AND playbook_steps.step_order = seed.step_order
);

INSERT INTO automation_rules (name, condition, action, playbook_id, is_active)
SELECT seed.name, seed.condition::jsonb, seed.action, playbooks.id, TRUE
FROM (
    VALUES
        ('Critical VPN brute force escalation', '{"severity":"critical","source":"SIEM / Edge Firewall"}', 'Attach IP blocking playbook', 'Block Malicious IP'),
        ('Suspicious endpoint containment', '{"severity":"high","source":"EDR"}', 'Attach endpoint containment playbook', 'Contain Suspicious Endpoint')
) AS seed(name, condition, action, playbook_name)
JOIN playbooks ON playbooks.name = seed.playbook_name
WHERE NOT EXISTS (SELECT 1 FROM automation_rules WHERE automation_rules.name = seed.name);

INSERT INTO alerts (source, severity, message)
SELECT seed.source, seed.severity::severity_level, seed.message
FROM (
    VALUES
        ('SIEM / Edge Firewall', 'critical', 'High-volume brute force detected against VPN gateway.'),
        ('EDR', 'medium', 'Unsigned PowerShell execution on workstation WS-114.'),
        ('Identity Provider', 'low', 'Repeated MFA fatigue requests from foreign IP.')
) AS seed(source, severity, message)
WHERE NOT EXISTS (SELECT 1 FROM alerts);

INSERT INTO tasks (title, description, priority, status, assigned_to, created_by, due_at)
SELECT seed.title, seed.description, seed.priority::task_priority, seed.status::task_status,
    users.id, users.id, seed.due_at
FROM (
    VALUES
        ('Patch API retry logic for firewall deny action', 'Add rollback coverage for partial provider responses.', 'high', 'in_progress', CURRENT_TIMESTAMP + INTERVAL '4 hours'),
        ('Add rollback branch for endpoint isolation failure', 'Validate the fallback path before publishing the containment playbook.', 'medium', 'queued', CURRENT_TIMESTAMP + INTERVAL '1 day'),
        ('Review analyst feedback on containment email template', 'Confirm that the evidence link is included in the analyst notification.', 'low', 'done', CURRENT_TIMESTAMP - INTERVAL '1 hour')
) AS seed(title, description, priority, status, due_at)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'SECURITY_ENGINEER' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE tasks.title = seed.title);
