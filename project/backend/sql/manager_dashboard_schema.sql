-- =========================
-- MANAGER DASHBOARD
-- Persistent oversight, approvals and report management
-- =========================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS manager_controls (
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

CREATE TABLE IF NOT EXISTS manager_priorities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manager_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    detail TEXT NOT NULL,
    tone VARCHAR(32) NOT NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manager_leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    request_type VARCHAR(32) NOT NULL DEFAULT 'annual_leave',
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    reason TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    reviewed_by INT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS manager_reports (
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

CREATE INDEX IF NOT EXISTS idx_manager_reports_status ON manager_reports(status);
CREATE INDEX IF NOT EXISTS idx_manager_leave_requests_status ON manager_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);

INSERT INTO manager_controls (category, name, detail, value, score, status)
VALUES
    ('policies', 'Emergency response plan', 'Escalation and continuity procedures', 'active', 94, 'active'),
    ('policies', 'Physical access protocol', 'Visitor and restricted-zone controls', 'review', 86, 'review'),
    ('personnel', 'SOC shift coverage', 'Analysts, engineers and on-call supervision', '96%', 96, 'active'),
    ('personnel', 'Security awareness training', 'Mandatory quarterly workforce program', '88%', 88, 'testing'),
    ('risks', 'Physical perimeter review', 'Camera blind spots and badge-reader gaps', '3 actions', 78, 'review'),
    ('risks', 'Cyber exposure review', 'Critical SOC and engineering remediation items', '6 actions', 82, 'testing'),
    ('incidents', 'VPN brute-force cluster', 'Cross-team investigation and escalation', 'lead', 72, 'critical'),
    ('systems', 'CCTV estate', 'Surveillance cameras and retention status', '12 online', 92, 'active'),
    ('systems', 'Access control', 'Badge readers and privileged-area monitoring', '8 online', 89, 'active'),
    ('systems', 'Alarm network', 'Physical alarms and emergency notification paths', '5 online', 91, 'active'),
    ('compliance', 'Legal standards', 'Policy and evidence alignment', '94%', 94, 'active'),
    ('compliance', 'Industry controls', 'Internal and external obligation tracking', '91%', 91, 'review')
ON CONFLICT (category, name) DO UPDATE SET
    detail = EXCLUDED.detail,
    value = EXCLUDED.value,
    score = EXCLUDED.score,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO manager_priorities (title, detail, status)
VALUES
    ('Approve VPN escalation plan', 'Validate staffing, containment ownership and stakeholder communications.', 'critical'),
    ('Close restricted-zone badge gap', 'Assign the access-control remediation before the weekly review.', 'review'),
    ('Publish weekly leadership report', 'Summarize staffing, risks, systems oversight and compliance posture.', 'testing')
ON CONFLICT (title) DO NOTHING;

INSERT INTO manager_notifications (title, detail, tone, created_at)
VALUES
    ('Two task approvals are pending', 'Review cross-team assignments before their planned start time.', 'critical', CURRENT_TIMESTAMP - INTERVAL '8 minutes'),
    ('Leave request requires decision', 'An analyst annual-leave request is ready for approval.', 'review', CURRENT_TIMESTAMP - INTERVAL '23 minutes'),
    ('Weekly report draft created', 'The current management report includes the latest systems posture.', 'testing', CURRENT_TIMESTAMP - INTERVAL '1 hour')
ON CONFLICT (title) DO NOTHING;

INSERT INTO tasks (title, description, priority, status, approval_status, assigned_to, created_by, due_at)
SELECT seed.title, seed.description, seed.priority::task_priority, seed.status::task_status,
    seed.approval_status, assignee.id, manager.id, seed.due_at
FROM (
    VALUES
        ('Validate restricted-zone badge drift', 'Review the physical access exception and document the mitigation.', 'high', 'queued', 'pending', 'ANALYST', CURRENT_TIMESTAMP + INTERVAL '5 hours'),
        ('Patch CCTV retention policy exception', 'Confirm storage retention and publish the corrected configuration.', 'medium', 'in_progress', 'approved', 'SECURITY_ENGINEER', CURRENT_TIMESTAMP + INTERVAL '1 day'),
        ('Audit emergency plan evidence', 'Confirm the latest escalation matrix and exercise notes.', 'low', 'done', 'approved', 'AUDITOR', CURRENT_TIMESTAMP - INTERVAL '2 hours')
) AS seed(title, description, priority, status, approval_status, assignee_role, due_at)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = seed.assignee_role::user_role ORDER BY id LIMIT 1
) AS assignee
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'MANAGER' ORDER BY id LIMIT 1
) AS manager
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE tasks.title = seed.title);

INSERT INTO manager_leave_requests (employee_id, request_type, starts_on, ends_on, reason)
SELECT users.id, seed.request_type, seed.starts_on, seed.ends_on, seed.reason
FROM (
    VALUES
        ('ANALYST', 'annual_leave', CURRENT_DATE + 8, CURRENT_DATE + 10, 'Planned annual leave'),
        ('SECURITY_ENGINEER', 'training', CURRENT_DATE + 14, CURRENT_DATE + 15, 'Security hardware certification')
) AS seed(role, request_type, starts_on, ends_on, reason)
JOIN LATERAL (
    SELECT id FROM users WHERE users.role = seed.role::user_role ORDER BY id LIMIT 1
) AS users ON TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM manager_leave_requests
    WHERE manager_leave_requests.employee_id = users.id
      AND manager_leave_requests.starts_on = seed.starts_on
);

INSERT INTO manager_reports (title, report_type, description, status, recommendation, created_by)
SELECT seed.title, seed.report_type, seed.description, seed.status, seed.recommendation, users.id
FROM (
    VALUES
        ('Weekly security leadership snapshot', 'leadership', 'Staffing, risk actions, systems posture and incident leadership summary.', 'review', 'Approve the physical access remediation owner before distribution.'),
        ('Quarterly policy and compliance review', 'compliance', 'Security protocols, legal obligations and training coverage.', 'draft', 'Schedule the emergency-response tabletop exercise.'),
        ('Systems oversight status', 'systems', 'CCTV, alarms and access-control availability summary.', 'approved', 'Track the CCTV retention exception to closure.')
) AS seed(title, report_type, description, status, recommendation)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'MANAGER' ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM manager_reports WHERE manager_reports.title = seed.title);
