from __future__ import annotations

import random

from app.db import db_cursor

RANDOM_SEED = 2026
MAX_SCORE = 3
GROUP_STAGE_PHASE = "Fase de Grupos"


def fetch_group_stage_matches(cursor) -> list[dict]:
    cursor.execute(
        """
        SELECT id, time_a, time_b, data_hora, sub_phase
        FROM matches
        WHERE tournament_phase = %s
        ORDER BY data_hora ASC, id ASC
        """,
        (GROUP_STAGE_PHASE,),
    )
    return cursor.fetchall()


def update_match_result(cursor, match_id: str, home_score: int, away_score: int) -> None:
    cursor.execute(
        """
        UPDATE matches
        SET placar_a = %s,
            placar_b = %s,
            finalizado = 1
        WHERE id = %s
          AND tournament_phase = %s
        """,
        (home_score, away_score, match_id, GROUP_STAGE_PHASE),
    )


def seed_match_results() -> None:
    random_generator = random.Random(RANDOM_SEED)

    with db_cursor(commit=True) as cursor:
        group_matches = fetch_group_stage_matches(cursor)
        if not group_matches:
            raise RuntimeError("Nenhum jogo da Fase de Grupos foi encontrado no banco.")

        print(f"Encontrados {len(group_matches)} jogos da Fase de Grupos.")
        print("Atualizando placares oficiais simulados...")

        for match in group_matches:
            home_score = random_generator.randint(0, MAX_SCORE)
            away_score = random_generator.randint(0, MAX_SCORE)
            update_match_result(cursor, match["id"], home_score, away_score)

            print(
                f"Jogo {match['id']} atualizado: "
                f"{match['time_a']} {home_score} x {away_score} {match['time_b']}"
            )

    print("Resultados simulados da Fase de Grupos aplicados com sucesso.")
    print("Jogos da Fase Mata-Mata permaneceram sem alteracao.")


if __name__ == "__main__":
    seed_match_results()
