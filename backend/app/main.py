from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BET_PRICE = 100
PRIZE_DISTRIBUTION = {1: 0.60, 2: 0.30, 3: 0.10}
OUTCOME = Literal["home", "away", "draw"]

app = FastAPI(
    title="Bolao Copa OST API",
    version="0.1.0",
    summary="API mockada em memoria para o MVP do Bolao da Copa 2026",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USERS: list[dict[str, Any]] = [
    {
        "id": "admin-ost",
        "name": "Mariana Admin",
        "username": "mariana.admin",
        "email": "admin@ost.com.br",
        "password": "admin123",
        "role": "admin",
        "department": "Operacoes",
        "paid": False,
    },
    {
        "id": "ana-silva",
        "name": "Ana Silva",
        "username": "ana.silva",
        "email": "ana@ost.com.br",
        "password": "123456",
        "role": "user",
        "department": "Financeiro",
        "paid": True,
    },
    {
        "id": "bruno-costa",
        "name": "Bruno Costa",
        "username": "bruno.costa",
        "email": "bruno@ost.com.br",
        "password": "123456",
        "role": "user",
        "department": "Comercial",
        "paid": True,
    },
    {
        "id": "carla-souza",
        "name": "Carla Souza",
        "username": "carla.souza",
        "email": "carla@ost.com.br",
        "password": "123456",
        "role": "user",
        "department": "RH",
        "paid": False,
    },
    {
        "id": "diego-lima",
        "name": "Diego Lima",
        "username": "diego.lima",
        "email": "diego@ost.com.br",
        "password": "123456",
        "role": "user",
        "department": "Tecnologia",
        "paid": True,
    },
    {
        "id": "elisa-almeida",
        "name": "Elisa Almeida",
        "username": "elisa.almeida",
        "email": "elisa@ost.com.br",
        "password": "123456",
        "role": "user",
        "department": "Marketing",
        "paid": True,
    },
    {
        "id": "felipe-rocha",
        "name": "Felipe Rocha",
        "username": "felipe.rocha",
        "email": "felipe@ost.com.br",
        "password": "123456",
        "role": "user",
        "department": "Juridico",
        "paid": False,
    },
]

MATCHES: list[dict[str, Any]] = [
    {
        "id": "match-001",
        "stage": "Grupo A",
        "home_team": "Brasil",
        "away_team": "Japao",
        "kickoff_at": "2026-04-17T19:00:00-03:00",
        "stadium": "MetLife Stadium",
        "status": "finished",
        "home_score": 2,
        "away_score": 1,
    },
    {
        "id": "match-002",
        "stage": "Grupo B",
        "home_team": "Franca",
        "away_team": "Mexico",
        "kickoff_at": "2026-04-18T16:00:00-03:00",
        "stadium": "SoFi Stadium",
        "status": "finished",
        "home_score": 1,
        "away_score": 1,
    },
    {
        "id": "match-003",
        "stage": "Grupo C",
        "home_team": "Argentina",
        "away_team": "Estados Unidos",
        "kickoff_at": "2026-04-19T20:00:00-03:00",
        "stadium": "AT&T Stadium",
        "status": "finished",
        "home_score": 0,
        "away_score": 2,
    },
    {
        "id": "match-004",
        "stage": "Grupo D",
        "home_team": "Alemanha",
        "away_team": "Senegal",
        "kickoff_at": "2026-04-20T18:00:00-03:00",
        "stadium": "Mercedes-Benz Stadium",
        "status": "finished",
        "home_score": 3,
        "away_score": 0,
    },
    {
        "id": "match-005",
        "stage": "Grupo E",
        "home_team": "Espanha",
        "away_team": "Canada",
        "kickoff_at": "2026-04-21T17:00:00-03:00",
        "stadium": "Estadio Akron",
        "status": "finished",
        "home_score": 0,
        "away_score": 0,
    },
    {
        "id": "match-006",
        "stage": "Grupo F",
        "home_team": "Portugal",
        "away_team": "Coreia do Sul",
        "kickoff_at": "2026-04-22T19:00:00-03:00",
        "stadium": "BC Place",
        "status": "scheduled",
        "home_score": None,
        "away_score": None,
    },
    {
        "id": "match-007",
        "stage": "Grupo G",
        "home_team": "Inglaterra",
        "away_team": "Uruguai",
        "kickoff_at": "2026-04-23T10:00:00-03:00",
        "stadium": "Lumen Field",
        "status": "scheduled",
        "home_score": None,
        "away_score": None,
    },
    {
        "id": "match-008",
        "stage": "Grupo H",
        "home_team": "Holanda",
        "away_team": "Marrocos",
        "kickoff_at": "2026-06-15T20:00:00-03:00",
        "stadium": "NRG Stadium",
        "status": "scheduled",
        "home_score": None,
        "away_score": None,
    },
    {
        "id": "match-009",
        "stage": "Grupo I",
        "home_team": "Italia",
        "away_team": "Colombia",
        "kickoff_at": "2026-06-16T18:00:00-03:00",
        "stadium": "Lincoln Financial Field",
        "status": "scheduled",
        "home_score": None,
        "away_score": None,
    },
]

BETS: list[dict[str, Any]] = [
    {"id": "bet-001", "user_id": "ana-silva", "match_id": "match-001", "predicted_home_score": 2, "predicted_away_score": 1, "created_at": "2026-04-10T09:15:00-03:00"},
    {"id": "bet-002", "user_id": "ana-silva", "match_id": "match-002", "predicted_home_score": 0, "predicted_away_score": 0, "created_at": "2026-04-10T09:16:00-03:00"},
    {"id": "bet-003", "user_id": "ana-silva", "match_id": "match-003", "predicted_home_score": 1, "predicted_away_score": 2, "created_at": "2026-04-10T09:17:00-03:00"},
    {"id": "bet-004", "user_id": "ana-silva", "match_id": "match-004", "predicted_home_score": 2, "predicted_away_score": 0, "created_at": "2026-04-10T09:18:00-03:00"},
    {"id": "bet-005", "user_id": "ana-silva", "match_id": "match-005", "predicted_home_score": 1, "predicted_away_score": 1, "created_at": "2026-04-10T09:19:00-03:00"},
    {"id": "bet-006", "user_id": "bruno-costa", "match_id": "match-001", "predicted_home_score": 1, "predicted_away_score": 0, "created_at": "2026-04-10T09:25:00-03:00"},
    {"id": "bet-007", "user_id": "bruno-costa", "match_id": "match-002", "predicted_home_score": 1, "predicted_away_score": 1, "created_at": "2026-04-10T09:26:00-03:00"},
    {"id": "bet-008", "user_id": "bruno-costa", "match_id": "match-003", "predicted_home_score": 0, "predicted_away_score": 2, "created_at": "2026-04-10T09:27:00-03:00"},
    {"id": "bet-009", "user_id": "bruno-costa", "match_id": "match-004", "predicted_home_score": 2, "predicted_away_score": 0, "created_at": "2026-04-10T09:28:00-03:00"},
    {"id": "bet-010", "user_id": "bruno-costa", "match_id": "match-005", "predicted_home_score": 0, "predicted_away_score": 0, "created_at": "2026-04-10T09:29:00-03:00"},
    {"id": "bet-011", "user_id": "carla-souza", "match_id": "match-001", "predicted_home_score": 2, "predicted_away_score": 1, "created_at": "2026-04-10T09:35:00-03:00"},
    {"id": "bet-012", "user_id": "carla-souza", "match_id": "match-002", "predicted_home_score": 2, "predicted_away_score": 2, "created_at": "2026-04-10T09:36:00-03:00"},
    {"id": "bet-013", "user_id": "carla-souza", "match_id": "match-003", "predicted_home_score": 1, "predicted_away_score": 2, "created_at": "2026-04-10T09:37:00-03:00"},
    {"id": "bet-014", "user_id": "carla-souza", "match_id": "match-004", "predicted_home_score": 0, "predicted_away_score": 1, "created_at": "2026-04-10T09:38:00-03:00"},
    {"id": "bet-015", "user_id": "carla-souza", "match_id": "match-005", "predicted_home_score": 0, "predicted_away_score": 0, "created_at": "2026-04-10T09:39:00-03:00"},
    {"id": "bet-016", "user_id": "diego-lima", "match_id": "match-001", "predicted_home_score": 2, "predicted_away_score": 1, "created_at": "2026-04-10T09:45:00-03:00"},
    {"id": "bet-017", "user_id": "diego-lima", "match_id": "match-002", "predicted_home_score": 0, "predicted_away_score": 1, "created_at": "2026-04-10T09:46:00-03:00"},
    {"id": "bet-018", "user_id": "diego-lima", "match_id": "match-003", "predicted_home_score": 0, "predicted_away_score": 2, "created_at": "2026-04-10T09:47:00-03:00"},
    {"id": "bet-019", "user_id": "diego-lima", "match_id": "match-004", "predicted_home_score": 1, "predicted_away_score": 0, "created_at": "2026-04-10T09:48:00-03:00"},
    {"id": "bet-020", "user_id": "diego-lima", "match_id": "match-005", "predicted_home_score": 2, "predicted_away_score": 2, "created_at": "2026-04-10T09:49:00-03:00"},
    {"id": "bet-021", "user_id": "elisa-almeida", "match_id": "match-001", "predicted_home_score": 0, "predicted_away_score": 1, "created_at": "2026-04-10T09:55:00-03:00"},
    {"id": "bet-022", "user_id": "elisa-almeida", "match_id": "match-002", "predicted_home_score": 2, "predicted_away_score": 2, "created_at": "2026-04-10T09:56:00-03:00"},
    {"id": "bet-023", "user_id": "elisa-almeida", "match_id": "match-003", "predicted_home_score": 0, "predicted_away_score": 2, "created_at": "2026-04-10T09:57:00-03:00"},
    {"id": "bet-024", "user_id": "elisa-almeida", "match_id": "match-004", "predicted_home_score": 3, "predicted_away_score": 0, "created_at": "2026-04-10T09:58:00-03:00"},
    {"id": "bet-025", "user_id": "elisa-almeida", "match_id": "match-005", "predicted_home_score": 1, "predicted_away_score": 1, "created_at": "2026-04-10T09:59:00-03:00"},
    {"id": "bet-026", "user_id": "felipe-rocha", "match_id": "match-001", "predicted_home_score": 1, "predicted_away_score": 1, "created_at": "2026-04-10T10:05:00-03:00"},
    {"id": "bet-027", "user_id": "felipe-rocha", "match_id": "match-002", "predicted_home_score": 1, "predicted_away_score": 0, "created_at": "2026-04-10T10:06:00-03:00"},
    {"id": "bet-028", "user_id": "felipe-rocha", "match_id": "match-003", "predicted_home_score": 0, "predicted_away_score": 2, "created_at": "2026-04-10T10:07:00-03:00"},
    {"id": "bet-029", "user_id": "felipe-rocha", "match_id": "match-004", "predicted_home_score": 2, "predicted_away_score": 0, "created_at": "2026-04-10T10:08:00-03:00"},
    {"id": "bet-030", "user_id": "felipe-rocha", "match_id": "match-005", "predicted_home_score": 3, "predicted_away_score": 3, "created_at": "2026-04-10T10:09:00-03:00"},
    {"id": "bet-031", "user_id": "ana-silva", "match_id": "match-006", "predicted_home_score": 2, "predicted_away_score": 1, "created_at": "2026-04-22T10:00:00-03:00"},
    {"id": "bet-032", "user_id": "ana-silva", "match_id": "match-007", "predicted_home_score": 1, "predicted_away_score": 0, "created_at": "2026-04-22T10:05:00-03:00"},
    {"id": "bet-033", "user_id": "bruno-costa", "match_id": "match-006", "predicted_home_score": 1, "predicted_away_score": 1, "created_at": "2026-04-22T10:10:00-03:00"},
    {"id": "bet-034", "user_id": "bruno-costa", "match_id": "match-008", "predicted_home_score": 2, "predicted_away_score": 0, "created_at": "2026-04-22T10:15:00-03:00"},
    {"id": "bet-035", "user_id": "carla-souza", "match_id": "match-006", "predicted_home_score": 0, "predicted_away_score": 2, "created_at": "2026-04-22T10:20:00-03:00"},
    {"id": "bet-036", "user_id": "carla-souza", "match_id": "match-009", "predicted_home_score": 1, "predicted_away_score": 1, "created_at": "2026-04-22T10:25:00-03:00"},
    {"id": "bet-037", "user_id": "diego-lima", "match_id": "match-007", "predicted_home_score": 2, "predicted_away_score": 1, "created_at": "2026-04-22T10:30:00-03:00"},
    {"id": "bet-038", "user_id": "diego-lima", "match_id": "match-009", "predicted_home_score": 0, "predicted_away_score": 1, "created_at": "2026-04-22T10:35:00-03:00"},
    {"id": "bet-039", "user_id": "elisa-almeida", "match_id": "match-006", "predicted_home_score": 3, "predicted_away_score": 1, "created_at": "2026-04-22T10:40:00-03:00"},
    {"id": "bet-040", "user_id": "elisa-almeida", "match_id": "match-008", "predicted_home_score": 1, "predicted_away_score": 0, "created_at": "2026-04-22T10:45:00-03:00"},
]


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


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def get_match(match_id: str) -> dict[str, Any]:
    for match in MATCHES:
        if match["id"] == match_id:
            return match
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partida nao encontrada.")


def get_user(user_id: str) -> dict[str, Any]:
    for user in USERS:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado.")


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


def is_match_upcoming(match: dict[str, Any], reference_time: datetime | None = None) -> bool:
    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return match["status"] == "scheduled" and parse_datetime(match["kickoff_at"]) > now


def is_match_open_for_bet(match: dict[str, Any], reference_time: datetime | None = None) -> bool:
    return is_match_upcoming(match, reference_time)


def is_match_available_for_result_entry(match: dict[str, Any], reference_time: datetime | None = None) -> bool:
    if is_match_finished(match):
        return True

    now = reference_time or datetime.now(parse_datetime(match["kickoff_at"]).tzinfo)
    return parse_datetime(match["kickoff_at"]) <= now


def authenticate_user(username: str, password: str) -> dict[str, Any] | None:
    normalized_username = username.strip().lower()
    for user in USERS:
        login_candidates = {
            user["username"].lower(),
            user["email"].lower(),
        }
        if normalized_username in login_candidates and user["password"] == password:
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


def build_ranking() -> dict[str, Any]:
    participants = [user for user in USERS if user["role"] == "user"]
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
    finished_matches = 0

    for match in MATCHES:
        if is_match_finished(match):
            finished_matches += 1

    for bet in BETS:
        if bet["user_id"] not in participant_map:
            continue

        match = get_match(bet["match_id"])
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
        "generated_at": datetime.now().isoformat(),
        "ranking": ranking,
        "bets": detailed_bets,
        "summary": {
            "finished_matches": finished_matches,
            "scheduled_matches": len(MATCHES) - finished_matches,
            "total_bets": len(BETS),
            "participants": len(participants),
        },
        "prize_pool": {
            "entry_price": BET_PRICE,
            "paid_participants": len(prize_eligible),
            "total_collected": total_collected,
            "distribution": payout_breakdown,
        },
    }


def serialize_match(match: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": match["id"],
        "label": match_label(match),
        "stage": match["stage"],
        "home_team": match["home_team"],
        "away_team": match["away_team"],
        "kickoff_at": match["kickoff_at"],
        "stadium": match["stadium"],
        "status": match["status"],
        "home_score": match["home_score"],
        "away_score": match["away_score"],
        "betting_open": is_match_open_for_bet(match),
        "has_result": is_match_finished(match),
        "result_entry_allowed": is_match_available_for_result_entry(match),
    }


def build_admin_dashboard_payload() -> dict[str, Any]:
    ranking_data = build_ranking()
    return {
        **ranking_data,
        "users": [serialize_user(user) for user in USERS if user["role"] == "user"],
        "matches": [serialize_match(match) for match in sorted(MATCHES, key=lambda item: parse_datetime(item["kickoff_at"]))],
    }


def get_current_user(x_user_id: str | None = Header(default=None)) -> dict[str, Any]:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cabecalho X-User-Id obrigatorio.",
        )
    return get_user(x_user_id)


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
        "message": "Bolao Copa OST API em memoria.",
        "frontend_hint": "O frontend autentica via /login e usa o id do usuario em memoria nas chamadas protegidas.",
        "available_routes": [
            "/login",
            "/me/bets-overview",
            "/me/bets",
            "/admin/dashboard",
            "/admin/matches/{match_id}/result",
            "/admin/users/{user_id}/payment",
        ],
    }


@app.post("/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    user = authenticate_user(payload.username, payload.password)
    if user is not None:
        return {"user": serialize_authenticated_user(user)}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas.")


@app.get("/me/bets-overview")
def get_my_bets_overview(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if current_user["role"] != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A tela de palpites e exclusiva para usuarios comuns.",
        )

    user_bets = [bet for bet in BETS if bet["user_id"] == current_user["id"]]
    bets_by_match = {bet["match_id"]: bet for bet in user_bets}
    upcoming_matches = []

    for match in MATCHES:
        existing_bet = bets_by_match.get(match["id"])
        if not is_match_upcoming(match):
            continue

        upcoming_matches.append(
            {
                "id": match["id"],
                "label": match_label(match),
                "stage": match["stage"],
                "home_team": match["home_team"],
                "away_team": match["away_team"],
                "kickoff_at": match["kickoff_at"],
                "stadium": match["stadium"],
                "status": match["status"],
                "betting_open": is_match_open_for_bet(match),
                "existing_bet": None
                if existing_bet is None
                else {
                    "bet_id": existing_bet["id"],
                    "predicted_home_score": existing_bet["predicted_home_score"],
                    "predicted_away_score": existing_bet["predicted_away_score"],
                    "created_at": existing_bet["created_at"],
                },
            }
        )

    submitted_bets = []
    for bet in sorted(user_bets, key=lambda item: parse_datetime(get_match(item["match_id"])["kickoff_at"])):
        match = get_match(bet["match_id"])
        submitted_bets.append(
            {
                "bet_id": bet["id"],
                "created_at": bet["created_at"],
                "predicted_home_score": bet["predicted_home_score"],
                "predicted_away_score": bet["predicted_away_score"],
                "match": {
                    "id": match["id"],
                    "label": match_label(match),
                    "stage": match["stage"],
                    "home_team": match["home_team"],
                    "away_team": match["away_team"],
                    "kickoff_at": match["kickoff_at"],
                    "stadium": match["stadium"],
                    "status": match["status"],
                    "home_score": match["home_score"],
                    "away_score": match["away_score"],
                },
            }
        )

    return {
        "user": serialize_user(current_user),
        "summary": {
            "upcoming_matches": len(upcoming_matches),
            "registered_upcoming_bets": sum(1 for match in upcoming_matches if match["existing_bet"] is not None),
            "open_matches_without_bet": sum(1 for match in upcoming_matches if match["existing_bet"] is None and match["betting_open"]),
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
    if not is_match_open_for_bet(match):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nao e permitido apostar em partidas encerradas ou bloqueadas.",
        )

    existing_bet = next(
        (bet for bet in BETS if bet["user_id"] == current_user["id"] and bet["match_id"] == payload.match_id),
        None,
    )
    if existing_bet:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Palpite ja registrado. O MVP nao permite edicao apos salvar.",
        )

    new_bet = {
        "id": f'bet-{len(BETS) + 1:03d}',
        "user_id": current_user["id"],
        "match_id": payload.match_id,
        "predicted_home_score": payload.predicted_home_score,
        "predicted_away_score": payload.predicted_away_score,
        "created_at": datetime.now(parse_datetime(match["kickoff_at"]).tzinfo).isoformat(),
    }
    BETS.append(new_bet)

    return {
        "message": "Palpite salvo com sucesso.",
        "bet": {
            "id": new_bet["id"],
            "match_id": new_bet["match_id"],
            "predicted_home_score": new_bet["predicted_home_score"],
            "predicted_away_score": new_bet["predicted_away_score"],
            "created_at": new_bet["created_at"],
        },
    }


@app.get("/admin/dashboard")
def get_admin_dashboard(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return build_admin_dashboard_payload()


@app.post("/admin/users/{user_id}/payment")
def update_payment_status(
    user_id: str,
    payload: PaymentUpdateRequest,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    user = get_user(user_id)
    if user["role"] != "user":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pagamento so pode ser alterado para participantes.")

    user["paid"] = (not user["paid"]) if payload.paid is None else payload.paid
    return {
        "message": "Status de pagamento atualizado.",
        "user": serialize_user(user),
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

    match["home_score"] = payload.home_score
    match["away_score"] = payload.away_score
    match["status"] = "finished"

    return {
        "message": "Placar real salvo com sucesso. Ranking recalculado.",
        "match": serialize_match(match),
        "dashboard": build_admin_dashboard_payload(),
    }
