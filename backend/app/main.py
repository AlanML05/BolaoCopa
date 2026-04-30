from __future__ import annotations

import unicodedata
from datetime import date as Date, datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import Body, Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymysql.err import IntegrityError

from .db import db_cursor
from .security import create_access_token, decode_access_token, verify_password
from .services.api_football import ApiFootballClient, ApiFootballError, FinishedMatchResult

BET_PRICE = 100
PRIZE_DISTRIBUTION = {1: 0.60, 2: 0.30, 3: 0.10}
BET_LOCK_MINUTES = 30
SAO_PAULO_TZ = timezone(timedelta(hours=-3))
OUTCOME = Literal["home", "away", "draw"]

USER_COLUMNS = "id, name, username, email, password_hash, is_admin, department, pagou"
MATCH_COLUMNS = "id, time_a, time_b, data_hora, fase, grupo, estadio, placar_a, placar_b, finalizado"
BET_COLUMNS = "id, user_id, match_id, palpite_a, palpite_b, created_at"

app = FastAPI(
    title="Bolao Copa API",
    version="0.2.0",
    summary="API do MVP do Bolao da Copa com persistencia em MySQL",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateBetRequest(BaseModel):
    match_id: str
    predicted_home_score: int = Field(ge=0, le=20)
    predicted_away_score: int = Field(ge=0, le=20)


class PaymentUpdateRequest(BaseModel):
    paid: bool | None = None


class MatchResultUpdateRequest(BaseModel):
    home_score: int = Field(ge=0, le=20)
    away_score: int = Field(ge=0, le=20)


class SyncMatchesRequest(BaseModel):
    date: Date | None = None


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




def normalize_team_lookup(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = "".join(character for character in normalized if not unicodedata.combining(character))
    return " ".join(ascii_value.casefold().split())


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
    }


def normalize_match(row: dict[str, Any]) -> dict[str, Any]:
    phase = resolve_phase(row["fase"], row.get("grupo"))
    return {
        "id": str(row["id"]),
        "stage": row["fase"],
        "group": row.get("grupo"),
        "grupo": row.get("grupo"),
        "phase": phase,
        "phase_label": "Fase de Grupos" if phase == "group" else "Mata-Mata",
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
            WHERE LOWER(username) = %s OR LOWER(email) = %s
            LIMIT 1
            """,
            (normalized_username, normalized_username),
        )
        return cursor.fetchone()


def fetch_user_by_login(normalized_username: str) -> dict[str, Any] | None:
    row = fetch_user_row_by_login(normalized_username)
    if row is None and normalized_username == "mariana.admin":
        row = fetch_user_row_by_login("admin")
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
        "is_admin": is_admin,
    }


def match_label(match: dict[str, Any]) -> str:
    return f'{match["home_team"]} x {match["away_team"]}'


def is_match_finished(match: dict[str, Any]) -> bool:
    return match["status"] == "finished" and match["home_score"] is not None and match["away_score"] is not None


def is_group_stage_match(match: dict[str, Any]) -> bool:
    return match.get("phase", "group") == "group"


def is_knockout_match(match: dict[str, Any]) -> bool:
    return match.get("phase") == "knockout"


def is_group_stage_complete(matches: list[dict[str, Any]] | None = None) -> bool:
    loaded_matches = fetch_all_matches() if matches is None else matches
    group_matches = [match for match in loaded_matches if is_group_stage_match(match)]
    return bool(group_matches) and all(is_match_finished(match) for match in group_matches)


def get_betting_closes_at(match: dict[str, Any]) -> datetime:
    return parse_datetime(match["kickoff_at"]) - timedelta(minutes=BET_LOCK_MINUTES)


def is_match_upcoming(match: dict[str, Any], reference_time: datetime | None = None) -> bool:
    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return match["status"] == "scheduled" and parse_datetime(match["kickoff_at"]) > now


def is_match_open_for_bet(
    match: dict[str, Any],
    reference_time: datetime | None = None,
    group_stage_complete: bool | None = None,
) -> bool:
    if is_knockout_match(match) and not (
        is_group_stage_complete() if group_stage_complete is None else group_stage_complete
    ):
        return False

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return is_match_upcoming(match, now) and now < get_betting_closes_at(match)


def get_betting_closed_reason(
    match: dict[str, Any],
    reference_time: datetime | None = None,
    group_stage_complete: bool | None = None,
) -> str | None:
    if is_knockout_match(match) and not (
        is_group_stage_complete() if group_stage_complete is None else group_stage_complete
    ):
        return "Aguardando definicao da Fase de Grupos."

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    kickoff_at = parse_datetime(match["kickoff_at"])

    if match["status"] != "scheduled" or kickoff_at <= now:
        return "Palpite encerrado."

    if now >= get_betting_closes_at(match):
        return f"Palpite encerrado: bloqueio de {BET_LOCK_MINUTES} minutos antes do jogo."

    return None


def is_match_available_for_result_entry(match: dict[str, Any], reference_time: datetime | None = None) -> bool:
    if is_match_finished(match):
        return True

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return parse_datetime(match["kickoff_at"]) <= now


def authenticate_user(username: str, password: str) -> dict[str, Any] | None:
    normalized_username = username.strip().lower()
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
            "eligible_for_prize": user["paid"],
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

    prize_eligible = [entry for entry in ranking if entry["eligible_for_prize"]]
    total_collected = len(prize_eligible) * BET_PRICE
    payout_breakdown = []

    for position, percentage in PRIZE_DISTRIBUTION.items():
        winner = prize_eligible[position - 1] if len(prize_eligible) >= position else None
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
        "bets": detailed_bets,
        "summary": {
            "finished_matches": finished_matches,
            "scheduled_matches": len(loaded_matches) - finished_matches,
            "total_bets": len(loaded_bets),
            "participants": len(participants),
        },
        "prize_pool": {
            "entry_price": BET_PRICE,
            "paid_participants": len(prize_eligible),
            "total_collected": total_collected,
            "distribution": payout_breakdown,
        },
    }


def serialize_match(match: dict[str, Any], group_stage_complete: bool | None = None) -> dict[str, Any]:
    betting_closes_at = get_betting_closes_at(match)
    return {
        "id": match["id"],
        "label": match_label(match),
        "stage": match["stage"],
        "group": match.get("group"),
        "grupo": match.get("grupo"),
        "phase": match.get("phase", "group"),
        "phase_label": match.get("phase_label", "Fase de Grupos"),
        "home_team": match["home_team"],
        "away_team": match["away_team"],
        "kickoff_at": match["kickoff_at"],
        "betting_closes_at": betting_closes_at.isoformat(),
        "stadium": match["stadium"],
        "status": match["status"],
        "home_score": match["home_score"],
        "away_score": match["away_score"],
        "betting_open": is_match_open_for_bet(match, group_stage_complete=group_stage_complete),
        "betting_closed_reason": get_betting_closed_reason(match, group_stage_complete=group_stage_complete),
        "has_result": is_match_finished(match),
        "result_entry_allowed": is_match_available_for_result_entry(match),
    }


def build_admin_dashboard_payload() -> dict[str, Any]:
    users = fetch_all_users()
    matches = fetch_all_matches()
    bets = fetch_all_bets()
    group_stage_complete = is_group_stage_complete(matches)
    ranking_data = build_ranking(users=users, matches=matches, bets=bets)

    return {
        **ranking_data,
        "metadata": {
            "group_stage_complete": group_stage_complete,
            "bet_lock_minutes": BET_LOCK_MINUTES,
        },
        "users": [serialize_user(user) for user in users if user["role"] == "user"],
        "matches": [
            serialize_match(match, group_stage_complete=group_stage_complete)
            for match in sorted(matches, key=lambda item: parse_datetime(item["kickoff_at"]))
        ],
    }


def apply_synced_match_results(results: list[FinishedMatchResult]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    matches = fetch_all_matches()
    match_index = {
        (normalize_team_lookup(match["home_team"]), normalize_team_lookup(match["away_team"])): match
        for match in matches
    }
    updated_matches: list[dict[str, Any]] = []
    skipped_matches: list[dict[str, Any]] = []

    if not results:
        return updated_matches, skipped_matches

    with db_cursor(commit=True) as cursor:
        for result in results:
            direct_key = (normalize_team_lookup(result.home_team), normalize_team_lookup(result.away_team))
            reverse_key = (normalize_team_lookup(result.away_team), normalize_team_lookup(result.home_team))

            match = match_index.get(direct_key)
            if match is not None:
                home_score = result.home_score
                away_score = result.away_score
            else:
                match = match_index.get(reverse_key)
                if match is None:
                    skipped_matches.append(
                        {
                            "api_fixture_id": result.api_fixture_id,
                            "home_team": result.home_team,
                            "away_team": result.away_team,
                            "reason": "Partida nao encontrada na tabela matches.",
                        }
                    )
                    continue
                home_score = result.away_score
                away_score = result.home_score

            cursor.execute(
                """
                UPDATE matches
                SET placar_a = %s,
                    placar_b = %s,
                    finalizado = 1
                WHERE id = %s
                """,
                (home_score, away_score, match["id"]),
            )
            updated_matches.append(
                {
                    "match_id": match["id"],
                    "match_label": match_label(match),
                    "api_fixture_id": result.api_fixture_id,
                    "home_score": home_score,
                    "away_score": away_score,
                    "status": result.status,
                    "played_at": result.played_at,
                }
            )

    return updated_matches, skipped_matches


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
            "/admin/dashboard",
            "/admin/sync-matches",
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


@app.get("/me/bets-overview")
def get_my_bets_overview(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if current_user["role"] != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A tela de palpites e exclusiva para usuarios comuns.",
        )

    matches = fetch_all_matches()
    matches_by_id = {match["id"]: match for match in matches}
    group_stage_complete = is_group_stage_complete(matches)
    user_bets = fetch_bets_by_user(current_user["id"])
    bets_by_match = {bet["match_id"]: bet for bet in user_bets}
    upcoming_matches = []

    for match in matches:
        existing_bet = bets_by_match.get(match["id"])
        if not is_match_upcoming(match):
            continue

        match_payload = serialize_match(match, group_stage_complete=group_stage_complete)
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
                    **serialize_match(match, group_stage_complete=group_stage_complete),
                },
            }
        )

    return {
        "user": serialize_user(current_user),
        "metadata": {
            "group_stage_complete": group_stage_complete,
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
            detail="Palpite ja registrado. O MVP nao permite edicao apos salvar.",
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
            detail="Palpite ja registrado. O MVP nao permite edicao apos salvar.",
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


@app.get("/admin/dashboard")
def get_admin_dashboard(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return build_admin_dashboard_payload()


@app.post("/admin/sync-matches")
def sync_matches(
    payload: SyncMatchesRequest | None = Body(default=None),
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    sync_date = payload.date if payload and payload.date is not None else datetime.now(SAO_PAULO_TZ).date()
    sync_source = "api-football"
    api_error_detail = None
    client = ApiFootballClient()

    try:
        api_results = client.get_finished_matches_by_date(sync_date)
    except ApiFootballError as error:
        fallback_results = client.get_local_finished_matches_by_date(sync_date)
        if not client.should_use_local_fallback() or not fallback_results:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error)) from error

        api_results = fallback_results
        sync_source = "local-2022-fallback"
        api_error_detail = str(error)

    try:
        updated_matches, skipped_matches = apply_synced_match_results(api_results)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Nao foi possivel atualizar as partidas no banco de dados.",
        ) from error

    return {
        "message": "Sincronizacao concluida. Ranking recalculado.",
        "sync_date": sync_date.isoformat(),
        "sync_source": sync_source,
        "api_error": api_error_detail,
        "api_finished_matches": len(api_results),
        "updated_matches": updated_matches,
        "skipped_matches": skipped_matches,
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

    new_paid = (not user["paid"]) if payload.paid is None else payload.paid
    with db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET pagou = %s
            WHERE id = %s
            """,
            (new_paid, user_id),
        )

    updated_user = get_user(user_id)
    return {
        "message": "Status de pagamento atualizado.",
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
