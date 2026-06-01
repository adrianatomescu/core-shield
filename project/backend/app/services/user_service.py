from dataclasses import dataclass

from app.database import get_db_connection
from app.models.user import User
from app.core.security import hash_password


@dataclass
class UserRecord(User):
    password: str


def get_user_by_email(email: str):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT id, email, password, role, enabled
            FROM users
            WHERE email = %s
            """,
            (email,),
        )
        row = cursor.fetchone()
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    if row is None:
        return None

    return UserRecord(
        id=row[0],
        email=row[1],
        password=row[2],
        role=row[3],
        enabled=row[4],
    )


def create_user(email: str, password: str, role: str, enabled: bool = True):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO users (email, password, role, enabled)
            VALUES (%s, %s, %s, %s)
            RETURNING id, email, role, enabled
            """,
            (email, hash_password(password), role, enabled),
        )
        row = cursor.fetchone()
        connection.commit()
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    return User(
        id=row[0],
        email=row[1],
        role=row[2],
        enabled=row[3],
    )


def get_all_users():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT id, email, role, enabled
            FROM users
            ORDER BY id ASC
            """
        )
        rows = cursor.fetchall()
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    return [
        User(
            id=row[0],
            email=row[1],
            role=row[2],
            enabled=row[3],
        )
        for row in rows
    ]


def get_chat_directory():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT id, email, role, enabled
            FROM users
            WHERE role <> 'ADMIN'
              AND enabled = TRUE
            ORDER BY role ASC, email ASC
            """
        )
        rows = cursor.fetchall()
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    users = [
        {
            "id": row[0],
            "email": row[1],
            "role": row[2],
            "enabled": row[3],
        }
        for row in rows
    ]
    groups = [
        {
            "id": "all-team",
            "label": "CoreShield Team",
            "role": None,
            "participants": [user["email"] for user in users],
        }
    ]

    for role in ("MANAGER", "SECURITY_ENGINEER", "ANALYST", "AUDITOR"):
        groups.append(
            {
                "id": f"role-{role.lower()}",
                "label": role.replace("_", " ").title(),
                "role": role,
                "participants": [
                    user["email"]
                    for user in users
                    if user["role"] == role
                ],
            }
        )

    return {
        "users": users,
        "groups": groups,
    }
