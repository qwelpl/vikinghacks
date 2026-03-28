import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path("warden.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


def create_user(username: str, email: str, password: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
        """,
        (username, email, password),
    )

    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id


def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, username, email, password
        FROM users
        WHERE email = ?
        """,
        (email,),
    )

    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def get_user_by_username(username: str) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, username, email, password
        FROM users
        WHERE username = ?
        """,
        (username,),
    )

    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None