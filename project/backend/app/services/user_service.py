from dataclasses import dataclass

from app.database import get_db_connection
from app.models.user import User


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
