-- =========================
-- AUDITOR DASHBOARD
-- Persistent controls, reviews, notifications and report management
-- =========================

CREATE TABLE IF NOT EXISTS auditor_controls (
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

CREATE TABLE IF NOT EXISTS auditor_priorities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditor_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    tone VARCHAR(32) NOT NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditor_reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(32) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    recommendation TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auditor_reports_type ON auditor_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_auditor_reports_status ON auditor_reports(status);

INSERT INTO auditor_controls (category, name, detail, value, score, status)
VALUES
    ('compliance', 'HIPAA safeguards', 'Administrative and technical safeguard evidence', '92%', 92, 'active'),
    ('compliance', 'PCI DSS controls', 'Payment-data access and change traceability', '96%', 96, 'active'),
    ('compliance', 'Incident response plan', 'Procedure alignment and escalation coverage', '89%', 89, 'review'),
    ('risk', 'External perimeter', 'Network vulnerability and exposure testing', '2 critical', 72, 'critical'),
    ('risk', 'Insider threat paths', 'Privileged role and access review', '5 paths', 78, 'review'),
    ('risk', 'Application controls', 'Authentication and authorization sampling', '84%', 84, 'testing'),
    ('policies', 'Access control matrix', 'Role assignment and least-privilege documentation', 'update', 76, 'review'),
    ('policies', 'Playbook governance', 'Approval traceability for automated actions', 'ready', 91, 'active'),
    ('systems', 'Incident traceability', 'Evidence linking across incidents and alerts', '95%', 95, 'active'),
    ('systems', 'Execution controls', 'Failure review for response workflows', '88%', 88, 'testing'),
    ('systems', 'Privileged activity', 'Administrative action sampling', '11 events', 83, 'review')
ON CONFLICT (category, name) DO UPDATE SET
    detail = EXCLUDED.detail,
    value = EXCLUDED.value,
    score = EXCLUDED.score,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO auditor_priorities (title, detail, status)
VALUES
    ('Close PCI-DSS evidence gap', 'Attach the missing change-approval evidence for the payment-data workflow.', 'critical'),
    ('Review privileged access exceptions', 'Validate five role exceptions against the access control matrix.', 'review'),
    ('Publish quarterly control report', 'Summarize compliance coverage, risks and management recommendations.', 'testing')
ON CONFLICT (title) DO NOTHING;

INSERT INTO auditor_notifications (title, detail, tone, created_at)
VALUES
    ('PCI-DSS evidence needs attention', 'One change-approval artifact is missing from the current audit window.', 'critical', CURRENT_TIMESTAMP - INTERVAL '12 minutes'),
    ('Access review sample ready', 'Five privileged role exceptions are ready for auditor validation.', 'review', CURRENT_TIMESTAMP - INTERVAL '31 minutes'),
    ('Quarterly report draft created', 'The management report includes the latest system-control scores.', 'testing', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (title) DO NOTHING;

INSERT INTO auditor_reports (title, report_type, description, status, recommendation, created_by)
SELECT seed.title, seed.report_type, seed.description, seed.status, seed.recommendation, users.id
FROM (
    VALUES
        ('Quarterly compliance assurance', 'compliance', 'HIPAA, PCI-DSS and internal procedure alignment.', 'review', 'Attach missing PCI-DSS approval evidence before sign-off.'),
        ('Privileged access risk assessment', 'risk', 'Insider-threat paths and privileged role exception testing.', 'draft', 'Remove stale access paths and document approved exceptions.'),
        ('Incident response policy review', 'policy', 'Escalation, evidence retention and containment procedure audit.', 'approved', 'Schedule the next tabletop recovery exercise.')
) AS seed(title, report_type, description, status, recommendation)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'AUDITOR' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM auditor_reports WHERE auditor_reports.title = seed.title);

INSERT INTO tasks (title, description, priority, status, assigned_to, created_by, due_at)
SELECT seed.title, seed.description, seed.priority::task_priority, seed.status::task_status,
    users.id, users.id, seed.due_at
FROM (
    VALUES
        ('Validate PCI-DSS approval evidence', 'Review the missing workflow approval artifact before report sign-off.', 'high', 'in_progress', CURRENT_TIMESTAMP + INTERVAL '3 hours'),
        ('Audit privileged role exceptions', 'Compare active exceptions with the access control matrix.', 'medium', 'queued', CURRENT_TIMESTAMP + INTERVAL '1 day'),
        ('Export quarterly management report', 'Publish the approved control-assurance summary.', 'low', 'done', CURRENT_TIMESTAMP - INTERVAL '2 hours')
) AS seed(title, description, priority, status, due_at)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'AUDITOR' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE tasks.title = seed.title);
