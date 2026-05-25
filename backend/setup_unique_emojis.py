from __future__ import annotations

from pymysql.err import MySQLError

from app.db import db_cursor


def reset_emojis(cursor) -> None:
    cursor.execute("UPDATE users SET emoji = NULL;")
    print(f"Emojis zerados. Usuarios afetados: {cursor.rowcount}.")


def drop_old_emoji_index(cursor) -> None:
    try:
        cursor.execute("ALTER TABLE users DROP INDEX emoji;")
        print("Indice antigo emoji removido.")
    except MySQLError as error:
        print(f"Nenhum indice antigo emoji para remover. Detalhe ignorado: {error.args}")


def enforce_binary_emoji_collation(cursor) -> None:
    cursor.execute(
        """
        ALTER TABLE users
        MODIFY emoji VARCHAR(10)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_bin
        NULL DEFAULT NULL;
        """
    )
    print("Coluna users.emoji ajustada para collation utf8mb4_bin.")


def create_unique_emoji_index(cursor) -> None:
    cursor.execute("ALTER TABLE users ADD UNIQUE (emoji);")
    print("Restricao UNIQUE criada para users.emoji.")


def setup_unique_emojis() -> None:
    with db_cursor(commit=True) as cursor:
        reset_emojis(cursor)
        drop_old_emoji_index(cursor)
        enforce_binary_emoji_collation(cursor)
        create_unique_emoji_index(cursor)

    print("Setup de emojis unicos concluido com sucesso.")


if __name__ == "__main__":
    setup_unique_emojis()
