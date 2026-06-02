from psycopg2.extras import RealDictCursor

from app.database import get_db_connection


def _normalize_email(email: str):
    return email.strip().lower()


def get_threads(user_email: str):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id FROM users WHERE email = %s AND enabled = TRUE", (_normalize_email(user_email),))
        user = cursor.fetchone()
        if user is None:
            return None

        cursor.execute(
            """
            SELECT mail_threads.id, mail_threads.subject,
                COALESCE(mail_thread_participants.unread_count, 0) > 0 AS unread
            FROM mail_threads
            JOIN mail_thread_participants
                ON mail_thread_participants.thread_id = mail_threads.id
            WHERE mail_thread_participants.user_id = %s
            ORDER BY mail_threads.updated_at DESC, mail_threads.id DESC
            """,
            (user["id"],),
        )
        threads = [dict(row) for row in cursor.fetchall()]

        for thread in threads:
            cursor.execute(
                """
                SELECT users.email
                FROM mail_thread_participants
                JOIN users ON users.id = mail_thread_participants.user_id
                WHERE mail_thread_participants.thread_id = %s
                ORDER BY users.email
                """,
                (thread["id"],),
            )
            participants = [row["email"] for row in cursor.fetchall()]
            cursor.execute(
                """
                SELECT COALESCE(users.email, 'CoreShield') AS sender,
                    mail_messages.body,
                    TO_CHAR(mail_messages.sent_at, 'Mon DD, HH24:MI') AS timestamp
                FROM mail_messages
                LEFT JOIN users ON users.id = mail_messages.sender_id
                WHERE mail_messages.thread_id = %s
                ORDER BY mail_messages.sent_at, mail_messages.id
                """,
                (thread["id"],),
            )
            messages = [dict(row) for row in cursor.fetchall()]
            thread["id"] = str(thread["id"])
            thread["kind"] = "direct" if len(participants) == 2 else "group"
            thread["participants"] = participants
            thread["messages"] = messages
            thread["preview"] = messages[-1]["body"] if messages else "No messages yet."

        cursor.execute(
            "UPDATE mail_thread_participants SET unread_count = 0, last_read_at = CURRENT_TIMESTAMP WHERE user_id = %s",
            (user["id"],),
        )
        connection.commit()
        return {"conversations": threads}
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def create_thread(subject: str, creator_email: str, participant_emails: list[str]):
    connection = None
    cursor = None
    try:
        emails = sorted(set([_normalize_email(creator_email), *[_normalize_email(email) for email in participant_emails]]))
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            "SELECT id, email FROM users WHERE email = ANY(%s) AND enabled = TRUE AND role <> 'ADMIN' ORDER BY email",
            (emails,),
        )
        users = [dict(row) for row in cursor.fetchall()]
        if len(users) != len(emails):
            return None

        cursor.execute(
            "INSERT INTO mail_threads (subject, created_by) VALUES (%s, %s) RETURNING id",
            (subject.strip(), next(user["id"] for user in users if user["email"] == _normalize_email(creator_email))),
        )
        thread_id = cursor.fetchone()["id"]
        for user in users:
            cursor.execute(
                "INSERT INTO mail_thread_participants (thread_id, user_id) VALUES (%s, %s)",
                (thread_id, user["id"]),
            )
        connection.commit()
        return {"id": str(thread_id)}
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def create_message(thread_id: int, sender_email: str, body: str):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT users.id
            FROM users
            JOIN mail_thread_participants ON mail_thread_participants.user_id = users.id
            WHERE users.email = %s AND users.enabled = TRUE
              AND mail_thread_participants.thread_id = %s
            """,
            (_normalize_email(sender_email), thread_id),
        )
        sender = cursor.fetchone()
        if sender is None:
            return None

        cursor.execute(
            "INSERT INTO mail_messages (thread_id, sender_id, body) VALUES (%s, %s, %s) RETURNING id",
            (thread_id, sender["id"], body.strip()),
        )
        message = dict(cursor.fetchone())
        cursor.execute("UPDATE mail_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (thread_id,))
        cursor.execute(
            """
            UPDATE mail_thread_participants
            SET unread_count = unread_count + 1
            WHERE thread_id = %s AND user_id <> %s
            """,
            (thread_id, sender["id"]),
        )
        connection.commit()
        return message
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()
