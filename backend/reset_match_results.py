from __future__ import annotations

from app.db import db_cursor

GROUP_STAGE_PHASE = "Fase de Grupos"


def fetch_group_stage_matches(cursor) -> list[dict]:
    cursor.execute(
        """
        SELECT id, time_a, time_b, placar_a, placar_b, finalizado
        FROM matches
        WHERE tournament_phase = %s
        ORDER BY data_hora ASC, id ASC
        """,
        (GROUP_STAGE_PHASE,),
    )
    return cursor.fetchall()


def reset_match_result(cursor, match_id: str) -> None:
    cursor.execute(
        """
        UPDATE matches
        SET placar_a = NULL,
            placar_b = NULL,
            finalizado = 0
        WHERE id = %s
          AND tournament_phase = %s
        """,
        (match_id, GROUP_STAGE_PHASE),
    )


def reset_match_results() -> None:
    with db_cursor(commit=True) as cursor:
        group_matches = fetch_group_stage_matches(cursor)
        if not group_matches:
            raise RuntimeError("Nenhum jogo da Fase de Grupos foi encontrado no banco.")

        print(f"Encontrados {len(group_matches)} jogos da Fase de Grupos.")
        print("Reabrindo jogos e removendo placares oficiais simulados...")

        for match in group_matches:
            reset_match_result(cursor, match["id"])
            previous_score = (
                f"{match['placar_a']} x {match['placar_b']}"
                if match["placar_a"] is not None and match["placar_b"] is not None
                else "sem placar"
            )
            print(
                f"Jogo {match['id']} reaberto: "
                f"{match['time_a']} x {match['time_b']} "
                f"(antes: {previous_score})"
            )

    print("Reset concluido com sucesso.")
    print("Jogos da Fase de Grupos agora estao sem placar e com finalizado = 0.")
    print("Jogos da Fase Mata-Mata permaneceram sem alteracao.")


if __name__ == "__main__":
    reset_match_results()
