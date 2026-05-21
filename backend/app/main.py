from __future__ import annotations

from functools import cmp_to_key
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pymysql.err import IntegrityError, MySQLError, OperationalError

from .db import db_cursor
from .security import create_access_token, decode_access_token, get_password_hash, verify_password

BET_PRICE = 100
PRIZE_DISTRIBUTION = {1: 0.60, 2: 0.30, 3: 0.10}
BET_LOCK_MINUTES = 30
SAO_PAULO_TZ = timezone(timedelta(hours=-3))
OUTCOME = Literal["home", "away", "draw"]
GROUP_LABELS = [f"Grupo {letter}" for letter in "ABCDEFGHIJKL"]

USER_COLUMNS = "id, name, username, email, password_hash, is_admin, department, pagou, is_paid_pool"
MATCH_COLUMNS = (
    "id, time_a, time_b, data_hora, fase, grupo, tournament_phase, sub_phase, "
    "estadio, placar_a, placar_b, finalizado"
)
BET_COLUMNS = "id, user_id, match_id, palpite_a, palpite_b, created_at"


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "*")
    if raw_origins.strip() == "*":
        return ["*"]
    return [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]


app = FastAPI(
    title="Bolao Copa API",
    version="0.2.0",
    summary="API do MVP do Bolao da Copa com persistencia em MySQL",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", # Mantemos o local para você testar no seu PC
    ],
    allow_origin_regex=r"https://.*\.vercel\.app", # A MÁGICA: Libera TODOS os links que a Vercel gerar!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OperationalError)
def handle_database_connection_error(_, __):
    return JSONResponse(
        status_code=503,
        content={"detail": "Banco de dados indisponivel. Tente novamente em instantes."},
    )


@app.exception_handler(IntegrityError)
def handle_integrity_error(_, __):
    return JSONResponse(
        status_code=409,
        content={"detail": "Registro duplicado ou conflito de dados."},
    )


@app.exception_handler(MySQLError)
def handle_database_error(_, __):
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro ao acessar o banco de dados."},
    )


class LoginRequest(BaseModel):
    username: str
    password: str


class SignUpRequest(BaseModel):
    username: str = Field(max_length=80)
    password: str = Field(max_length=128)


class CreateBetRequest(BaseModel):
    match_id: str
    predicted_home_score: int = Field(ge=0, le=20)
    predicted_away_score: int = Field(ge=0, le=20)


class UpdateBetRequest(BaseModel):
    predicted_home_score: int = Field(ge=0, le=20)
    predicted_away_score: int = Field(ge=0, le=20)


class UpdateMatchRequest(BaseModel):
    home_team: str = Field(max_length=80)
    away_team: str = Field(max_length=80)
    match_date: datetime
    tournament_phase: str = Field(max_length=40)
    sub_phase: str = Field(max_length=80)
    stadium: str = Field(default="", max_length=160)


class PaymentUpdateRequest(BaseModel):
    paid: bool | None = None
    pagou: bool | None = None
    is_paid_pool: bool | None = None


class MatchResultUpdateRequest(BaseModel):
    home_score: int = Field(ge=0, le=20)
    away_score: int = Field(ge=0, le=20)


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def coerce_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(value)

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=SAO_PAULO_TZ)
    return parsed.astimezone(SAO_PAULO_TZ)


def db_datetime_to_iso(value: datetime | str) -> str:
    return coerce_datetime(value).replace(microsecond=0).isoformat()


def now_for_database() -> datetime:
    return datetime.now(SAO_PAULO_TZ).replace(tzinfo=None, microsecond=0)


def normalize_login_value(value: str) -> str:
    return value.strip().lower()


def normalize_text_field(value: str) -> str:
    return " ".join(value.strip().split())


def normalize_tournament_phase(value: str) -> str:
    normalized = normalize_text_field(value)
    allowed_phases = {
        "fase de grupos": "Fase de Grupos",
        "fase mata-mata": "Fase Mata-Mata",
    }
    canonical_phase = allowed_phases.get(normalized.casefold())
    if canonical_phase is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fase invalida. Use Fase de Grupos ou Fase Mata-Mata.",
        )
    return canonical_phase


def normalize_knockout_sub_phase(value: str) -> str | None:
    normalized_key = normalize_text_field(value).casefold().replace("º", "o")
    allowed_knockout = {
        "16-avos de final": "16-avos de final",
        "oitavas de final": "Oitavas de final",
        "oitavas": "Oitavas de final",
        "quartas de final": "Quartas de final",
        "quartas": "Quartas de final",
        "semifinal": "Semifinal",
        "disputa do 3o lugar": "Disputa do 3º Lugar",
        "terceiro lugar": "Disputa do 3º Lugar",
        "final": "Final",
    }
    return allowed_knockout.get(normalized_key)


def resolve_match_stage_and_group(tournament_phase: str, sub_phase: str) -> tuple[str, str, str, str]:
    canonical_phase = normalize_tournament_phase(tournament_phase)
    canonical_sub_phase = normalize_text_field(sub_phase)

    if not canonical_sub_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe a sub-fase da partida.",
        )

    if canonical_phase == "Fase de Grupos":
        allowed_groups = {f"Grupo {letter}" for letter in "ABCDEFGHIJKL"}
        if canonical_sub_phase not in allowed_groups:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sub-fase invalida para fase de grupos.",
            )
        group_code = canonical_sub_phase.split()[-1]
        return canonical_sub_phase, group_code, canonical_phase, canonical_sub_phase

    canonical_knockout_sub_phase = normalize_knockout_sub_phase(canonical_sub_phase)
    if canonical_knockout_sub_phase is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sub-fase invalida para mata-mata.",
        )
    return canonical_knockout_sub_phase, "Mata-Mata", canonical_phase, canonical_knockout_sub_phase


def resolve_phase(fase: str, grupo: str | None) -> str:
    normalized_stage = fase.strip().lower()
    normalized_group = (grupo or "").strip().lower()
    if normalized_stage.startswith("grupo"):
        return "group"
    if normalized_group and normalized_group != "mata-mata" and len(normalized_group) <= 2:
        return "group"
    return "knockout"


def normalize_user(row: dict[str, Any]) -> dict[str, Any]:
    is_admin = bool(row["is_admin"])
    return {
        "id": str(row["id"]),
        "name": row.get("name") or row["username"],
        "username": row["username"],
        "email": row.get("email") or "",
        "password_hash": row["password_hash"],
        "role": "admin" if is_admin else "user",
        "department": row.get("department") or "",
        "paid": bool(row["pagou"]),
        "is_paid_pool": bool(row["is_paid_pool"]),
    }


def normalize_match(row: dict[str, Any]) -> dict[str, Any]:
    tournament_phase = row.get("tournament_phase") or (
        "Fase de Grupos" if resolve_phase(row["fase"], row.get("grupo")) == "group" else "Fase Mata-Mata"
    )
    sub_phase = row.get("sub_phase") or row["fase"]
    phase = "group" if tournament_phase == "Fase de Grupos" else "knockout"
    return {
        "id": str(row["id"]),
        "stage": row["fase"],
        "group": row.get("grupo"),
        "grupo": row.get("grupo"),
        "phase": phase,
        "phase_label": "Fase de Grupos" if phase == "group" else "Mata-Mata",
        "tournament_phase": tournament_phase,
        "sub_phase": sub_phase,
        "home_team": row["time_a"],
        "away_team": row["time_b"],
        "kickoff_at": db_datetime_to_iso(row["data_hora"]),
        "stadium": row.get("estadio") or "",
        "status": "finished" if bool(row["finalizado"]) else "scheduled",
        "home_score": row["placar_a"],
        "away_score": row["placar_b"],
    }


def normalize_bet(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "match_id": str(row["match_id"]),
        "predicted_home_score": row["palpite_a"],
        "predicted_away_score": row["palpite_b"],
        "created_at": db_datetime_to_iso(row["created_at"]),
    }


def fetch_user_row_by_login(normalized_username: str) -> dict[str, Any] | None:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {USER_COLUMNS}
            FROM users
            WHERE username = %s OR email = %s
            LIMIT 1
            """,
            (normalized_username, normalized_username),
        )
        return cursor.fetchone()


def fetch_user_by_login(normalized_username: str) -> dict[str, Any] | None:
    row = fetch_user_row_by_login(normalized_username)
    return None if row is None else normalize_user(row)


def fetch_all_users() -> list[dict[str, Any]]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {USER_COLUMNS}
            FROM users
            ORDER BY is_admin DESC, name
            """
        )
        return [normalize_user(row) for row in cursor.fetchall()]


def get_user(user_id: str) -> dict[str, Any]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {USER_COLUMNS}
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado.")
    return normalize_user(row)


def fetch_all_matches() -> list[dict[str, Any]]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {MATCH_COLUMNS}
            FROM matches
            ORDER BY data_hora, id
            """
        )
        return [normalize_match(row) for row in cursor.fetchall()]


def fetch_group_stage_matches() -> list[dict[str, Any]]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {MATCH_COLUMNS}
            FROM matches
            WHERE tournament_phase = %s
            ORDER BY grupo, data_hora, id
            """,
            ("Fase de Grupos",),
        )
        return [normalize_match(row) for row in cursor.fetchall()]


def get_match(match_id: str) -> dict[str, Any]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {MATCH_COLUMNS}
            FROM matches
            WHERE id = %s
            """,
            (match_id,),
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partida nao encontrada.")
    return normalize_match(row)


def fetch_all_bets() -> list[dict[str, Any]]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {BET_COLUMNS}
            FROM bets
            ORDER BY created_at, id
            """
        )
        return [normalize_bet(row) for row in cursor.fetchall()]


def fetch_bets_by_user(user_id: str) -> list[dict[str, Any]]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {BET_COLUMNS}
            FROM bets
            WHERE user_id = %s
            ORDER BY created_at, id
            """,
            (user_id,),
        )
        return [normalize_bet(row) for row in cursor.fetchall()]


def fetch_existing_bet(user_id: str, match_id: str) -> dict[str, Any] | None:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {BET_COLUMNS}
            FROM bets
            WHERE user_id = %s AND match_id = %s
            LIMIT 1
            """,
            (user_id, match_id),
        )
        row = cursor.fetchone()
    return None if row is None else normalize_bet(row)


def get_bet_for_user(bet_id: str, user_id: str) -> dict[str, Any]:
    with db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {BET_COLUMNS}
            FROM bets
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (bet_id, user_id),
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Palpite nao encontrado.")
    return normalize_bet(row)


def count_bets_by_match(match_id: str) -> int:
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM bets
            WHERE match_id = %s
            """,
            (match_id,),
        )
        row = cursor.fetchone()
    return int(row["total"])


def next_match_id(cursor: Any) -> str:
    cursor.execute(
        """
        SELECT COALESCE(MAX(CAST(SUBSTRING(id, 7) AS UNSIGNED)), 0) + 1 AS next_number
        FROM matches
        WHERE id REGEXP '^match-[0-9]+$'
        """
    )
    row = cursor.fetchone()
    return f'match-{int(row["next_number"]):03d}'


def next_bet_id(cursor: Any) -> str:
    cursor.execute(
        """
        SELECT COALESCE(MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)), 0) + 1 AS next_number
        FROM bets
        WHERE id REGEXP '^bet-[0-9]+$'
        """
    )
    row = cursor.fetchone()
    return f'bet-{int(row["next_number"]):03d}'


def serialize_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "department": user["department"],
        "paid": user["paid"],
        "is_paid_pool": user["is_paid_pool"],
    }


def serialize_authenticated_user(user: dict[str, Any]) -> dict[str, Any]:
    is_admin = user["role"] == "admin"
    return {
        "id": user["id"],
        "name": user["name"],
        "nome": user["name"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "department": user["department"],
        "paid": user["paid"],
        "pagou": user["paid"],
        "is_paid_pool": user["is_paid_pool"],
        "is_admin": is_admin,
    }


def match_label(match: dict[str, Any]) -> str:
    return f'{match["home_team"]} x {match["away_team"]}'


def is_match_finished(match: dict[str, Any]) -> bool:
    return match["status"] == "finished" and match["home_score"] is not None and match["away_score"] is not None


PLACEHOLDER_TEAM_MARKERS = ("grupo", "jogo", "vencedor", "perdedor")


def has_placeholder_team(match: dict[str, Any]) -> bool:
    team_names = (match.get("home_team") or "", match.get("away_team") or "")
    return any(
        marker in team_name.casefold()
        for team_name in team_names
        for marker in PLACEHOLDER_TEAM_MARKERS
    )


def get_betting_closes_at(match: dict[str, Any]) -> datetime:
    return parse_datetime(match["kickoff_at"]) - timedelta(minutes=BET_LOCK_MINUTES)


def is_match_upcoming(match: dict[str, Any], reference_time: datetime | None = None) -> bool:
    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return match["status"] == "scheduled" and parse_datetime(match["kickoff_at"]) > now


def is_match_open_for_bet(
    match: dict[str, Any],
    reference_time: datetime | None = None,
) -> bool:
    if has_placeholder_team(match):
        return False

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return is_match_upcoming(match, now) and now < get_betting_closes_at(match)


def get_betting_closed_reason(
    match: dict[str, Any],
    reference_time: datetime | None = None,
) -> str | None:
    if has_placeholder_team(match):
        return "Aguardando definição dos confrontos."

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    kickoff_at = parse_datetime(match["kickoff_at"])

    if match["status"] != "scheduled" or kickoff_at <= now:
        return "Palpite encerrado."

    if now >= get_betting_closes_at(match):
        return f"Palpite encerrado: bloqueio de {BET_LOCK_MINUTES} minutos antes do jogo."

    return None


def get_bet_edit_closed_reason(
    match: dict[str, Any],
    reference_time: datetime | None = None,
) -> str | None:
    if has_placeholder_team(match):
        return "Aguardando definição dos confrontos."

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    kickoff_at = parse_datetime(match["kickoff_at"])

    if match["status"] != "scheduled" or kickoff_at <= now:
        return "Edicao encerrada."

    if now >= get_betting_closes_at(match):
        return f"Edicao encerrada: bloqueio de {BET_LOCK_MINUTES} minutos antes do jogo."

    return None


def is_match_available_for_result_entry(match: dict[str, Any], reference_time: datetime | None = None) -> bool:
    if is_match_finished(match):
        return True

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return parse_datetime(match["kickoff_at"]) <= now


def authenticate_user(username: str, password: str) -> dict[str, Any] | None:
    normalized_username = normalize_login_value(username)
    user = fetch_user_by_login(normalized_username)
    if user is not None and verify_password(password, user["password_hash"]):
        return user
    return None


def get_outcome(home_score: int, away_score: int) -> OUTCOME:
    if home_score > away_score:
        return "home"
    if away_score > home_score:
        return "away"
    return "draw"


def evaluate_bet(match: dict[str, Any], bet: dict[str, Any]) -> dict[str, Any]:
    if not is_match_finished(match):
        return {
            "counted": False,
            "points": 0,
            "exact_hit": False,
            "draw_tendency_hit": False,
            "winner_tendency_hit": False,
            "reason": "Partida ainda nao finalizada.",
        }

    actual_home = match["home_score"]
    actual_away = match["away_score"]
    predicted_home = bet["predicted_home_score"]
    predicted_away = bet["predicted_away_score"]

    exact_hit = actual_home == predicted_home and actual_away == predicted_away
    actual_outcome = get_outcome(actual_home, actual_away)
    predicted_outcome = get_outcome(predicted_home, predicted_away)
    draw_tendency_hit = not exact_hit and actual_outcome == "draw" and predicted_outcome == "draw"
    winner_tendency_hit = not exact_hit and actual_outcome in {"home", "away"} and actual_outcome == predicted_outcome

    if exact_hit:
        points = 2
        reason = "Placar exato."
    elif draw_tendency_hit or winner_tendency_hit:
        points = 1
        reason = "Acerto de tendencia."
    else:
        points = 0
        reason = "Sem pontuacao."

    return {
        "counted": True,
        "points": points,
        "exact_hit": exact_hit,
        "draw_tendency_hit": draw_tendency_hit,
        "winner_tendency_hit": winner_tendency_hit,
        "reason": reason,
    }


def build_ranking(
    users: list[dict[str, Any]] | None = None,
    matches: list[dict[str, Any]] | None = None,
    bets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    loaded_users = fetch_all_users() if users is None else users
    loaded_matches = fetch_all_matches() if matches is None else matches
    loaded_bets = fetch_all_bets() if bets is None else bets
    matches_by_id = {match["id"]: match for match in loaded_matches}

    participants = [user for user in loaded_users if user["role"] == "user"]
    participant_map = {
        user["id"]: {
            "user_id": user["id"],
            "name": user["name"],
            "department": user["department"],
            "paid": user["paid"],
            "is_paid_pool": user["is_paid_pool"],
            "eligible_for_prize": user["is_paid_pool"],
            "total_points": 0,
            "exact_hits": 0,
            "draw_tendency_hits": 0,
            "winner_tendency_hits": 0,
            "evaluated_bets": 0,
        }
        for user in participants
    }

    detailed_bets: list[dict[str, Any]] = []
    finished_matches = sum(1 for match in loaded_matches if is_match_finished(match))

    for bet in loaded_bets:
        if bet["user_id"] not in participant_map:
            continue

        match = matches_by_id.get(bet["match_id"])
        if match is None:
            continue

        evaluation = evaluate_bet(match, bet)
        participant = participant_map[bet["user_id"]]

        if evaluation["counted"]:
            participant["total_points"] += evaluation["points"]
            participant["exact_hits"] += int(evaluation["exact_hit"])
            participant["draw_tendency_hits"] += int(evaluation["draw_tendency_hit"])
            participant["winner_tendency_hits"] += int(evaluation["winner_tendency_hit"])
            participant["evaluated_bets"] += 1

        detailed_bets.append(
            {
                "bet_id": bet["id"],
                "user_id": bet["user_id"],
                "user_name": participant["name"],
                "match_id": match["id"],
                "match_label": match_label(match),
                "stage": match["stage"],
                "group": match.get("group"),
                "phase": match.get("phase", "group"),
                "status": match["status"],
                "predicted_score": f'{bet["predicted_home_score"]} x {bet["predicted_away_score"]}',
                "actual_score": None if not is_match_finished(match) else f'{match["home_score"]} x {match["away_score"]}',
                "points": evaluation["points"],
                "exact_hit": evaluation["exact_hit"],
                "draw_tendency_hit": evaluation["draw_tendency_hit"],
                "winner_tendency_hit": evaluation["winner_tendency_hit"],
                "reason": evaluation["reason"],
                "created_at": bet["created_at"],
            }
        )

    ranking = sorted(
        participant_map.values(),
        key=lambda item: (
            -item["total_points"],
            -item["exact_hits"],
            -item["draw_tendency_hits"],
            -item["winner_tendency_hits"],
            item["name"].lower(),
        ),
    )

    for index, entry in enumerate(ranking, start=1):
        entry["rank"] = index

    paid_ranking = [{**entry} for entry in ranking if entry["is_paid_pool"]]
    for index, entry in enumerate(paid_ranking, start=1):
        entry["rank"] = index

    payment_confirmed = [entry for entry in paid_ranking if entry["paid"]]
    total_collected = len(payment_confirmed) * BET_PRICE
    payout_breakdown = []

    for position, percentage in PRIZE_DISTRIBUTION.items():
        winner = paid_ranking[position - 1] if len(paid_ranking) >= position else None
        payout_breakdown.append(
            {
                "position": position,
                "percentage": percentage,
                "amount": round(total_collected * percentage, 2),
                "user_id": None if winner is None else winner["user_id"],
                "user_name": None if winner is None else winner["name"],
            }
        )

    return {
        "generated_at": datetime.now(SAO_PAULO_TZ).isoformat(),
        "ranking": ranking,
        "paid_ranking": paid_ranking,
        "bets": detailed_bets,
        "summary": {
            "finished_matches": finished_matches,
            "scheduled_matches": len(loaded_matches) - finished_matches,
            "total_bets": len(loaded_bets),
            "participants": len(participants),
        },
        "prize_pool": {
            "entry_price": BET_PRICE,
            "paid_participants": len(payment_confirmed),
            "paid_pool_participants": len(paid_ranking),
            "total_collected": total_collected,
            "distribution": payout_breakdown,
        },
    }


def get_group_label_for_match(match: dict[str, Any]) -> str | None:
    sub_phase = match.get("sub_phase") or match.get("stage") or ""
    if sub_phase in GROUP_LABELS:
        return sub_phase

    group = (match.get("group") or match.get("grupo") or "").strip()
    if len(group) == 1 and group.isalpha():
        return f"Grupo {group.upper()}"
    if group in GROUP_LABELS:
        return group

    return None


def create_empty_standing(team: str) -> dict[str, Any]:
    return {
        "team": team,
        "played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_for": 0,
        "goals_against": 0,
        "goal_difference": 0,
        "points": 0,
    }


def has_match_score(match: dict[str, Any]) -> bool:
    return match["home_score"] is not None and match["away_score"] is not None


def apply_group_match_result(
    home_standing: dict[str, Any],
    away_standing: dict[str, Any],
    home_score: int,
    away_score: int,
) -> None:
    home_standing["played"] += 1
    away_standing["played"] += 1
    home_standing["goals_for"] += home_score
    home_standing["goals_against"] += away_score
    away_standing["goals_for"] += away_score
    away_standing["goals_against"] += home_score
    home_standing["goal_difference"] = home_standing["goals_for"] - home_standing["goals_against"]
    away_standing["goal_difference"] = away_standing["goals_for"] - away_standing["goals_against"]

    if home_score > away_score:
        home_standing["wins"] += 1
        away_standing["losses"] += 1
        home_standing["points"] += 3
        return

    if away_score > home_score:
        away_standing["wins"] += 1
        home_standing["losses"] += 1
        away_standing["points"] += 3
        return

    home_standing["draws"] += 1
    away_standing["draws"] += 1
    home_standing["points"] += 1
    away_standing["points"] += 1


def compare_basic_standing(first: dict[str, Any], second: dict[str, Any]) -> int:
    for key in ("points", "goal_difference", "goals_for"):
        if first[key] != second[key]:
            return -1 if first[key] > second[key] else 1
    return 0


def get_head_to_head_winner(
    first_team: str,
    second_team: str,
    group_matches: list[dict[str, Any]],
) -> str | None:
    first_points = 0
    second_points = 0
    direct_match_found = False

    for match in group_matches:
        if not has_match_score(match):
            continue

        home_team = match["home_team"]
        away_team = match["away_team"]
        if {home_team, away_team} != {first_team, second_team}:
            continue

        direct_match_found = True
        home_score = int(match["home_score"])
        away_score = int(match["away_score"])
        if home_score == away_score:
            first_points += 1
            second_points += 1
            continue

        winner = home_team if home_score > away_score else away_team
        if winner == first_team:
            first_points += 3
        else:
            second_points += 3

    if not direct_match_found or first_points == second_points:
        return None
    return first_team if first_points > second_points else second_team


def compare_group_standings(
    group_matches: list[dict[str, Any]],
    group_teams: list[dict[str, Any]],
    first: dict[str, Any],
    second: dict[str, Any],
) -> int:
    if first["team"].casefold() == second["team"].casefold():
        return 0

    basic_comparison = compare_basic_standing(first, second)
    if basic_comparison != 0:
        return basic_comparison

    tied_on_basic_criteria = [
        team
        for team in group_teams
        if team["points"] == first["points"]
        and team["goal_difference"] == first["goal_difference"]
        and team["goals_for"] == first["goals_for"]
    ]
    if len(tied_on_basic_criteria) == 2:
        head_to_head_winner = get_head_to_head_winner(first["team"], second["team"], group_matches)
        if head_to_head_winner == first["team"]:
            return -1
        if head_to_head_winner == second["team"]:
            return 1

    return -1 if first["team"].casefold() < second["team"].casefold() else 1


def compare_third_place_standings(first: dict[str, Any], second: dict[str, Any]) -> int:
    basic_comparison = compare_basic_standing(first, second)
    if basic_comparison != 0:
        return basic_comparison
    if first["team"].casefold() == second["team"].casefold():
        return 0
    return -1 if first["team"].casefold() < second["team"].casefold() else 1


def build_group_standings(matches: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    loaded_matches = fetch_group_stage_matches() if matches is None else matches
    grouped: dict[str, dict[str, dict[str, Any]]] = {group: {} for group in GROUP_LABELS}
    matches_by_group: dict[str, list[dict[str, Any]]] = {group: [] for group in GROUP_LABELS}

    for match in loaded_matches:
        group_label = get_group_label_for_match(match)
        if group_label not in grouped:
            continue

        matches_by_group[group_label].append(match)
        home_team = match["home_team"]
        away_team = match["away_team"]
        grouped[group_label].setdefault(home_team, create_empty_standing(home_team))
        grouped[group_label].setdefault(away_team, create_empty_standing(away_team))

        if not has_match_score(match):
            continue

        apply_group_match_result(
            grouped[group_label][home_team],
            grouped[group_label][away_team],
            int(match["home_score"]),
            int(match["away_score"]),
        )

    groups = []
    for group_label in GROUP_LABELS:
        group_teams = list(grouped[group_label].values())
        teams = sorted(
            group_teams,
            key=cmp_to_key(
                lambda first, second: compare_group_standings(
                    matches_by_group[group_label],
                    group_teams,
                    first,
                    second,
                )
            ),
        )

        for index, team in enumerate(teams, start=1):
            team["rank"] = index
            team["qualified_direct"] = index <= 2

        groups.append(
            {
                "group": group_label,
                "teams": teams,
            }
        )

    best_thirds = []
    for group in groups:
        if len(group["teams"]) < 3:
            continue

        third_place = {**group["teams"][2]}
        third_place["group"] = group["group"]
        third_place["group_rank"] = 3
        third_place.pop("qualified_direct", None)
        best_thirds.append(third_place)

    best_thirds = sorted(best_thirds, key=cmp_to_key(compare_third_place_standings))
    for index, team in enumerate(best_thirds, start=1):
        team["rank"] = index
        team["qualified_third"] = index <= 8

    return {
        "generated_at": datetime.now(SAO_PAULO_TZ).isoformat(),
        "tie_breakers": ["points", "goal_difference", "goals_for", "head_to_head"],
        "groups": groups,
        "best_thirds": best_thirds,
    }


def serialize_match(match: dict[str, Any]) -> dict[str, Any]:
    betting_closes_at = get_betting_closes_at(match)
    return {
        "id": match["id"],
        "label": match_label(match),
        "stage": match["stage"],
        "group": match.get("group"),
        "grupo": match.get("grupo"),
        "phase": match.get("phase", "group"),
        "phase_label": match.get("phase_label", "Fase de Grupos"),
        "tournament_phase": match["tournament_phase"],
        "sub_phase": match["sub_phase"],
        "home_team": match["home_team"],
        "away_team": match["away_team"],
        "kickoff_at": match["kickoff_at"],
        "betting_closes_at": betting_closes_at.isoformat(),
        "stadium": match["stadium"],
        "status": match["status"],
        "home_score": match["home_score"],
        "away_score": match["away_score"],
        "betting_open": is_match_open_for_bet(match),
        "betting_closed_reason": get_betting_closed_reason(match),
        "has_result": is_match_finished(match),
        "result_entry_allowed": is_match_available_for_result_entry(match),
    }


def build_admin_dashboard_payload() -> dict[str, Any]:
    users = fetch_all_users()
    matches = fetch_all_matches()
    bets = fetch_all_bets()
    ranking_data = build_ranking(users=users, matches=matches, bets=bets)

    return {
        **ranking_data,
        "metadata": {
            "bet_lock_minutes": BET_LOCK_MINUTES,
        },
        "users": [serialize_user(user) for user in users if user["role"] == "user"],
        "matches": [
            serialize_match(match)
            for match in sorted(matches, key=lambda item: parse_datetime(item["kickoff_at"]))
        ],
    }

def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessao expirada ou token invalido.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization:
        raise credentials_exception

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise credentials_exception

    try:
        payload = decode_access_token(token)
    except ValueError as error:
        raise credentials_exception from error

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise credentials_exception

    try:
        return get_user(user_id)
    except HTTPException as error:
        if error.status_code == status.HTTP_404_NOT_FOUND:
            raise credentials_exception from error
        raise


def require_admin(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao administrador.",
        )
    return current_user


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "message": "Bolao Copa API com persistencia em MySQL.",
        "frontend_hint": "O frontend autentica via /login e envia Authorization: Bearer <token> nas rotas protegidas.",
        "available_routes": [
            "/login",
            "/me/bets-overview",
            "/me/bets",
            "/me/bets/{bet_id}",
            "/standings",
            "/signup",
            "/admin/dashboard",
            "/admin/matches/{match_id}",
            "/admin/matches/{match_id}/result",
            "/admin/users/{user_id}/payment",
        ],
    }


@app.post("/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    user = authenticate_user(payload.username, payload.password)
    if user is not None:
        access_token = create_access_token(user["id"], {"role": user["role"]})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": serialize_authenticated_user(user),
        }
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas.")


@app.get("/standings")
def get_standings(_: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return build_group_standings()


@app.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest) -> dict[str, Any]:
    username = normalize_login_value(payload.username)
    password = payload.password

    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe um usuario com pelo menos 3 caracteres.",
        )

    if any(character.isspace() for character in username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use um usuario sem espacos.",
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe uma senha com pelo menos 6 caracteres.",
        )

    if fetch_user_row_by_login(username) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este usuario ja existe. Escolha outro nome de usuario.",
        )

    user_id = f"user-{uuid4().hex[:12]}"
    password_hash = get_password_hash(password)

    try:
        with db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO users (id, name, username, email, password_hash, is_admin, department, pagou, is_paid_pool)
                VALUES (%s, %s, %s, %s, %s, 0, %s, 0, 0)
                """,
                (
                    user_id,
                    username,
                    username,
                    f"{user_id}@users.bolao.local",
                    password_hash,
                    "",
                ),
            )
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este usuario ja existe. Escolha outro nome de usuario.",
        ) from error

    created_user = get_user(user_id)
    return {
        "message": "Cadastro criado com sucesso. Faca login para continuar.",
        "user": serialize_user(created_user),
    }


@app.get("/me/bets-overview")
def get_my_bets_overview(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if current_user["role"] != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A tela de palpites e exclusiva para usuarios comuns.",
        )

    matches = fetch_all_matches()
    matches_by_id = {match["id"]: match for match in matches}
    user_bets = fetch_bets_by_user(current_user["id"])
    bets_by_match = {bet["match_id"]: bet for bet in user_bets}
    upcoming_matches = []

    for match in matches:
        existing_bet = bets_by_match.get(match["id"])

        match_payload = serialize_match(match)
        match_payload["existing_bet"] = None if existing_bet is None else {
            "bet_id": existing_bet["id"],
            "predicted_home_score": existing_bet["predicted_home_score"],
            "predicted_away_score": existing_bet["predicted_away_score"],
            "created_at": existing_bet["created_at"],
        }
        upcoming_matches.append(match_payload)

    submitted_bets = []
    sorted_user_bets = sorted(
        user_bets,
        key=lambda item: parse_datetime(matches_by_id[item["match_id"]]["kickoff_at"])
        if item["match_id"] in matches_by_id
        else datetime.max.replace(tzinfo=SAO_PAULO_TZ),
    )

    for bet in sorted_user_bets:
        match = matches_by_id.get(bet["match_id"])
        if match is None:
            continue

        submitted_bets.append(
            {
                "bet_id": bet["id"],
                "created_at": bet["created_at"],
                "predicted_home_score": bet["predicted_home_score"],
                "predicted_away_score": bet["predicted_away_score"],
                "match": {
                    **serialize_match(match),
                },
            }
        )

    return {
        "user": serialize_user(current_user),
        "metadata": {
            "bet_lock_minutes": BET_LOCK_MINUTES,
        },
        "summary": {
            "upcoming_matches": len(upcoming_matches),
            "registered_upcoming_bets": sum(1 for match in upcoming_matches if match["existing_bet"] is not None),
            "open_matches_without_bet": sum(
                1 for match in upcoming_matches if match["existing_bet"] is None and match["betting_open"]
            ),
        },
        "upcoming_matches": upcoming_matches,
        "submitted_bets": submitted_bets,
    }


@app.post("/me/bets", status_code=status.HTTP_201_CREATED)
def create_bet(
    payload: CreateBetRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if current_user["role"] != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente usuarios comuns podem apostar.")

    match = get_match(payload.match_id)
    betting_closed_reason = get_betting_closed_reason(match)
    if betting_closed_reason is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=betting_closed_reason,
        )

    existing_bet = fetch_existing_bet(current_user["id"], payload.match_id)
    if existing_bet:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Palpite ja registrado. Edite pelo historico antes do bloqueio do jogo.",
        )

    created_at = now_for_database()

    try:
        with db_cursor(commit=True) as cursor:
            new_bet_id = next_bet_id(cursor)
            cursor.execute(
                """
                INSERT INTO bets (id, user_id, match_id, palpite_a, palpite_b, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    new_bet_id,
                    current_user["id"],
                    payload.match_id,
                    payload.predicted_home_score,
                    payload.predicted_away_score,
                    created_at,
                ),
            )
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Palpite ja registrado. Edite pelo historico antes do bloqueio do jogo.",
        ) from error

    new_bet = {
        "id": new_bet_id,
        "match_id": payload.match_id,
        "predicted_home_score": payload.predicted_home_score,
        "predicted_away_score": payload.predicted_away_score,
        "created_at": db_datetime_to_iso(created_at),
    }

    return {
        "message": "Palpite salvo com sucesso.",
        "bet": new_bet,
    }


@app.put("/me/bets/{bet_id}")
def update_bet(
    bet_id: str,
    payload: UpdateBetRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if current_user["role"] != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente usuarios comuns podem editar palpites.")

    bet = get_bet_for_user(bet_id, current_user["id"])
    match = get_match(bet["match_id"])
    betting_closed_reason = get_bet_edit_closed_reason(match)
    if betting_closed_reason is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=betting_closed_reason,
        )

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE bets
            SET palpite_a = %s,
                palpite_b = %s
            WHERE id = %s AND user_id = %s
            """,
            (
                payload.predicted_home_score,
                payload.predicted_away_score,
                bet_id,
                current_user["id"],
            ),
        )

    updated_bet = get_bet_for_user(bet_id, current_user["id"])
    return {
        "message": "Palpite atualizado com sucesso.",
        "bet": {
            "id": updated_bet["id"],
            "match_id": updated_bet["match_id"],
            "predicted_home_score": updated_bet["predicted_home_score"],
            "predicted_away_score": updated_bet["predicted_away_score"],
            "created_at": updated_bet["created_at"],
        },
    }


@app.get("/admin/dashboard")
def get_admin_dashboard(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return build_admin_dashboard_payload()


@app.put("/admin/matches/{match_id}")
def update_match(
    match_id: str,
    payload: UpdateMatchRequest,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    get_match(match_id)

    home_team = normalize_text_field(payload.home_team)
    away_team = normalize_text_field(payload.away_team)
    stadium_name = normalize_text_field(payload.stadium) if payload.stadium else ""
    stage, group, tournament_phase, sub_phase = resolve_match_stage_and_group(
        payload.tournament_phase,
        payload.sub_phase,
    )

    if not home_team or not away_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe os dois times da partida.",
        )

    if home_team.casefold() == away_team.casefold():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Os times da partida precisam ser diferentes.",
        )

    kickoff_at = coerce_datetime(payload.match_date).replace(tzinfo=None, microsecond=0)

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE matches
            SET time_a = %s,
                time_b = %s,
                data_hora = %s,
                fase = %s,
                grupo = %s,
                tournament_phase = %s,
                sub_phase = %s,
                estadio = %s
            WHERE id = %s
            """,
            (
                home_team,
                away_team,
                kickoff_at,
                stage,
                group,
                tournament_phase,
                sub_phase,
                stadium_name,
                match_id,
            ),
        )

    updated_match = get_match(match_id)
    return {
        "message": "Partida atualizada com sucesso.",
        "match": serialize_match(updated_match),
        "dashboard": build_admin_dashboard_payload(),
    }


@app.delete("/admin/matches/{match_id}")
def delete_match(
    match_id: str,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    match = get_match(match_id)
    if count_bets_by_match(match_id) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao e possivel excluir uma partida que ja possui palpites registrados.",
        )

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            DELETE FROM matches
            WHERE id = %s
            """,
            (match_id,),
        )

    return {
        "message": "Partida removida com sucesso.",
        "match": serialize_match(match),
        "dashboard": build_admin_dashboard_payload(),
    }


@app.post("/admin/users/{user_id}/payment")
def update_payment_status(
    user_id: str,
    payload: PaymentUpdateRequest,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    user = get_user(user_id)
    if user["role"] != "user":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pagamento so pode ser alterado para participantes.")

    payload_paid = payload.paid if payload.paid is not None else payload.pagou
    new_is_paid_pool = user["is_paid_pool"] if payload.is_paid_pool is None else payload.is_paid_pool
    new_paid = (not user["paid"]) if payload_paid is None and payload.is_paid_pool is None else (
        user["paid"] if payload_paid is None else payload_paid
    )

    if not new_is_paid_pool:
        new_paid = False

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET is_paid_pool = %s,
                pagou = %s
            WHERE id = %s
            """,
            (new_is_paid_pool, new_paid, user_id),
        )

    updated_user = get_user(user_id)
    return {
        "message": "Status financeiro atualizado.",
        "user": serialize_user(updated_user),
        "dashboard": build_admin_dashboard_payload(),
    }


@app.post("/admin/matches/{match_id}/result")
def update_match_result(
    match_id: str,
    payload: MatchResultUpdateRequest,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    match = get_match(match_id)
    if not is_match_available_for_result_entry(match):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O placar real so pode ser informado para partidas que ja chegaram ao horario do jogo.",
        )

    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE matches
            SET placar_a = %s,
                placar_b = %s,
                finalizado = 1
            WHERE id = %s
            """,
            (payload.home_score, payload.away_score, match_id),
        )

    updated_match = get_match(match_id)
    return {
        "message": "Placar real salvo com sucesso. Ranking recalculado.",
        "match": serialize_match(updated_match),
        "dashboard": build_admin_dashboard_payload(),
    }
