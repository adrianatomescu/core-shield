-- =========================
-- CHAT CHANNELS
-- Persistent team and role conversations
-- =========================

INSERT INTO mail_threads (subject, created_by)
SELECT seed.subject, users.id
FROM (
    VALUES
        ('CoreShield Team', NULL),
        ('Manager Group', 'MANAGER'),
        ('Security Engineer Group', 'SECURITY_ENGINEER'),
        ('Analyst Group', 'ANALYST'),
        ('Auditor Group', 'AUDITOR')
) AS seed(subject, role)
CROSS JOIN LATERAL (
    SELECT id FROM users
    WHERE role <> 'ADMIN'
    ORDER BY id LIMIT 1
) AS users
WHERE NOT EXISTS (SELECT 1 FROM mail_threads WHERE mail_threads.subject = seed.subject);

INSERT INTO mail_thread_participants (thread_id, user_id)
SELECT mail_threads.id, users.id
FROM mail_threads
JOIN users ON users.enabled = TRUE AND users.role <> 'ADMIN'
WHERE mail_threads.subject = 'CoreShield Team'
   OR mail_threads.subject = REPLACE(INITCAP(REPLACE(users.role::text, '_', ' ')), 'Security Engineer', 'Security Engineer') || ' Group'
ON CONFLICT DO NOTHING;

INSERT INTO mail_messages (thread_id, sender_id, body)
SELECT mail_threads.id, NULL, 'Persistent CoreShield channel created. Messages in this conversation are stored in PostgreSQL.'
FROM mail_threads
WHERE mail_threads.subject IN ('CoreShield Team', 'Manager Group', 'Security Engineer Group', 'Analyst Group', 'Auditor Group')
  AND NOT EXISTS (
      SELECT 1 FROM mail_messages
      WHERE mail_messages.thread_id = mail_threads.id
        AND mail_messages.body = 'Persistent CoreShield channel created. Messages in this conversation are stored in PostgreSQL.'
  );
