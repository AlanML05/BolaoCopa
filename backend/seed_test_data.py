from __future__ import annotations

import random
from uuid import uuid4

from app.db import db_cursor
from app.security import get_password_hash

FIRST_TEST_USER = 5
LAST_TEST_USER = 50
PASSWORDS = ("123456", "987654")
RANDOM_SEED = 2026
MAX_SCORE = 4
TEST_EMOJIS = (
    "😀",
    "😎",
    "🤩",
    "🥳",
    "😈",
    "🤠",
    "🥶",
    "🤯",
    "🤖",
    "👽",
    "🐶",
    "🐱",
    "🦁",
    "🐺",
    "🐯",
    "🐼",
    "🐸",
    "🦊",
    "🐲",
    "🦅",
    "🦈",
    "🐬",
    "🐳",
    "🐙",
    "🐢",
    "🦋",
    "🦜",
    "🦚",
    "🦂",
    "🚀",
    "🛸",
    "🚁",
    "🚲",
    "🛵",
    "🚂",
    "🚢",
    "🚗",
    "🚌",
    "🚓",
    "🚑",
    "🚒",
    "🚜",
    "🎮",
    "🎲",
    "🎯",
    "🎸",
    "🎧",
    "🎤",
    "🎬",
    "📚",
    "💎",
    "🔮",
    "🧩",
    "🧠",
    "🧬",
    "🧲",
    "🪄",
    "🥊",
    "🏀",
    "🏆",
)


def fetch_group_stage_matches(cursor) -> list[dict]:
    cursor.execute(
        """
        SELECT id, time_a, time_b, data_hora, sub_phase
        FROM matches
        WHERE tournament_phase = %s
        ORDER BY data_hora ASC, id ASC
        """,
        ("Fase de Grupos",),
    )
    return cursor.fetchall()


def upsert_test_user(cursor, user_number: int, password: str) -> str:
    username = f"teste{user_number}"
    user_id = f"seed-user-{username}"
    password_hash = get_password_hash(password)
    emoji = TEST_EMOJIS[(user_number - FIRST_TEST_USER) % len(TEST_EMOJIS)]

    cursor.execute(
        """
        INSERT INTO users (
            id, name, username, email, password_hash,
            is_admin, department, pagou, is_paid_pool, emoji
        )
        VALUES (%s, %s, %s, %s, %s, 0, %s, 0, 0, %s)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            password_hash = VALUES(password_hash),
            is_admin = 0,
            department = VALUES(department),
            pagou = 0,
            is_paid_pool = 0,
            emoji = VALUES(emoji)
        """,
        (
            user_id,
            f"Teste {user_number}",
            username,
            f"{username}@users.bolao.local",
            password_hash,
            "Carga de teste",
            emoji,
        ),
    )

    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    user_row = cursor.fetchone()
    if user_row is None:
        raise RuntimeError(f"Nao foi possivel localizar o usuario {username} apos o upsert.")

    return str(user_row["id"])


def upsert_bet(cursor, user_id: str, match_id: str, home_score: int, away_score: int) -> None:
    cursor.execute(
        """
        INSERT INTO bets (id, user_id, match_id, palpite_a, palpite_b, created_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE
            palpite_a = VALUES(palpite_a),
            palpite_b = VALUES(palpite_b)
        """,
        (
            f"seed-bet-{uuid4().hex[:12]}",
            user_id,
            match_id,
            home_score,
            away_score,
        ),
    )


def seed_test_data() -> None:
    random_generator = random.Random(RANDOM_SEED)

    with db_cursor(commit=True) as cursor:
        group_matches = fetch_group_stage_matches(cursor)
        if not group_matches:
            raise RuntimeError("Nenhuma partida da Fase de Grupos foi encontrada no banco.")

        total_users = LAST_TEST_USER - FIRST_TEST_USER + 1
        total_bets = 0

        print(f"Encontrados {len(group_matches)} jogos da Fase de Grupos.")
        print(f"Criando/atualizando {total_users} usuarios de teste...")

        for index, user_number in enumerate(range(FIRST_TEST_USER, LAST_TEST_USER + 1)):
            username = f"teste{user_number}"
            password = PASSWORDS[index % len(PASSWORDS)]
            user_id = upsert_test_user(cursor, user_number, password)

            for match in group_matches:
                home_score = random_generator.randint(0, MAX_SCORE)
                away_score = random_generator.randint(0, MAX_SCORE)
                upsert_bet(cursor, user_id, match["id"], home_score, away_score)
                total_bets += 1

            print(
                f"Usuario {username} criado/atualizado com senha {password} "
                f"e {len(group_matches)} palpites gerados."
            )

    print("Carga de teste concluida com sucesso.")
    print(f"Usuarios processados: {total_users}")
    print(f"Palpites processados: {total_bets}")


if __name__ == "__main__":
    seed_test_data()
