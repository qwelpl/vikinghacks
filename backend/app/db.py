import secrets
import sqlite3
from pathlib import Path

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
            password TEXT NOT NULL,
            account_token TEXT NOT NULL UNIQUE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS permit_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goal TEXT NOT NULL,
            website TEXT NOT NULL,
            reason TEXT NOT NULL,
            decision TEXT NOT NULL,
            explanation TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """
    )

    conn.commit()
    conn.close()


def generate_account_token() -> str:
    return secrets.token_urlsafe(32)


def create_user(username: str, email: str, password: str):
    conn = get_connection()
    cursor = conn.cursor()

    account_token = generate_account_token()

    cursor.execute(
        """
        INSERT INTO users (username, email, password, account_token)
        VALUES (?, ?, ?, ?)
        """,
        (username, email, password, account_token),
    )

    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id, account_token


def get_user_by_email(email: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, username, email, password, account_token
        FROM users
        WHERE email = ?
        """,
        (email,),
    )

    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_username(username: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, username, email, password, account_token
        FROM users
        WHERE username = ?
        """,
        (username,),
    )

    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_account_token(account_token: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, username, email, password, account_token
        FROM users
        WHERE account_token = ?
        """,
        (account_token,),
    )

    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def save_permit_request(user_id: int, goal: str, website: str, reason: str, decision: str, explanation: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO permit_requests (user_id, goal, website, reason, decision, explanation)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (user_id, goal, website, reason, decision, explanation),
    )

    conn.commit()
    request_id = cursor.lastrowid
    conn.close()
    return request_id