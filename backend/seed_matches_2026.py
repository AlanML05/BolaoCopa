from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from app.db import db_cursor
from app.main import coerce_datetime, next_match_id, resolve_match_stage_and_group


def load_matches(json_path: Path) -> list[dict[str, Any]]:
    with json_path.open(encoding="utf-8") as file:
        payload = json.load(file)

    if not isinstance(payload, list):
        raise ValueError("O arquivo JSON precisa conter uma lista de partidas.")

    return payload


def required_text(match: dict[str, Any], field: str) -> str:
    value = match.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Campo obrigatorio ausente ou invalido: {field}")
    return value.strip()


def seed_matches(json_path: Path) -> int:
    matches = load_matches(json_path)

    with db_cursor(commit=True) as cursor:
        for item in matches:
            home_team = required_text(item, "home_team")
            away_team = required_text(item, "away_team")
            match_date = required_text(item, "match_date")
            tournament_phase = required_text(item, "tournament_phase")
            requested_sub_phase = required_text(item, "sub_phase")
            stadium = str(item.get("stadium", "")).strip()

            stage, group, canonical_phase, canonical_sub_phase = resolve_match_stage_and_group(
                tournament_phase,
                requested_sub_phase,
            )
            kickoff_at = coerce_datetime(match_date).replace(tzinfo=None, microsecond=0)
            match_id = item.get("id") or next_match_id(cursor)

            cursor.execute(
                """
                INSERT INTO matches (
                    id, time_a, time_b, data_hora, fase, grupo,
                    tournament_phase, sub_phase, estadio,
                    placar_a, placar_b, finalizado
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL, 0)
                """,
                (
                    match_id,
                    home_team,
                    away_team,
                    kickoff_at,
                    stage,
                    group,
                    canonical_phase,
                    canonical_sub_phase,
                    stadium,
                ),
            )

    return len(matches)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Carrega partidas iniciais da Copa 2026 a partir de um arquivo JSON.",
    )
    parser.add_argument(
        "json_path",
        type=Path,
        help="Caminho para o arquivo JSON com a lista de partidas.",
    )
    args = parser.parse_args()

    inserted_count = seed_matches(args.json_path)
    print(f"{inserted_count} partidas inseridas com sucesso.")


if __name__ == "__main__":
    main()
