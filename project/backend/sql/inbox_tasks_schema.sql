-- =========================
-- TASKS + INTERNAL MAIL
-- CoreShield collaboration layer
-- =========================

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_status AS ENUM ('queued', 'in_progress', 'done', 'cancelled');
CREATE TYPE mailbox_folder AS ENUM ('inbox', 'sent', 'archive');

-- =========================
-- TASKS
-- =========================

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'queued',

    assigned_to INT NOT NULL,
    created_by INT,
    incident_id INT,
    playbook_execution_id INT,

    due_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT fk_task_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_task_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_task_incident
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_task_execution
        FOREIGN KEY (playbook_execution_id)
        REFERENCES playbook_executions(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_incident_id ON tasks(incident_id);

-- =========================
-- MAIL THREADS
-- =========================

CREATE TABLE mail_threads (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    created_by INT,
    related_incident_id INT,
    related_task_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mail_thread_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_mail_thread_incident
        FOREIGN KEY (related_incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_mail_thread_task
        FOREIGN KEY (related_task_id)
        REFERENCES tasks(id)
        ON DELETE SET NULL
);

-- =========================
-- MAIL PARTICIPANTS
-- =========================

CREATE TABLE mail_thread_participants (
    thread_id INT NOT NULL,
    user_id INT NOT NULL,
    folder mailbox_folder DEFAULT 'inbox',
    unread_count INT DEFAULT 0,
    is_muted BOOLEAN DEFAULT false,
    last_read_at TIMESTAMP,

    PRIMARY KEY (thread_id, user_id),

    FOREIGN KEY (thread_id) REFERENCES mail_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mail_participants_user_id ON mail_thread_participants(user_id);

-- =========================
-- MAIL MESSAGES
-- =========================

CREATE TABLE mail_messages (
    id SERIAL PRIMARY KEY,
    thread_id INT NOT NULL,
    sender_id INT,
    body TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (thread_id) REFERENCES mail_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mail_messages_thread_id ON mail_messages(thread_id);

-- =========================
-- OPTIONAL TRIGGER
-- Keep updated_at current on task/thread updates
-- =========================

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER trg_mail_threads_updated_at
BEFORE UPDATE ON mail_threads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
