from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from typing import Any

import requests
from dotenv import load_dotenv
from requests import RequestException

load_dotenv()

API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"
WORLD_CUP_LEAGUE_ID = 1
DEFAULT_TIMEOUT_SECONDS = 15
FINISHED_STATUSES = {"FT", "AET", "PEN"}
LOCAL_FALLBACK_ENABLED_VALUES = {"1", "true", "yes", "on", "sim"}

# Preencha com os IDs reais retornados pela API-Football/dashboard quando eles
# forem confirmados. Abaixo, o fallback por nome ja cobre os times mockados.
API_TEAM_ID_TO_LOCAL_NAME: dict[int, str] = {}

API_TEAM_NAME_TO_LOCAL_NAME = {
    "Qatar": "Catar",
    "Ecuador": "Equador",
    "Brazil": "Brasil",
    "Japan": "Japao",
    "France": "Franca",
    "Mexico": "Mexico",
    "Argentina": "Argentina",
    "Saudi Arabia": "Arabia Saudita",
    "United States": "Estados Unidos",
    "USA": "Estados Unidos",
    "Germany": "Alemanha",
    "Senegal": "Senegal",
    "Denmark": "Dinamarca",
    "Tunisia": "Tunisia",
    "Poland": "Polonia",
    "Spain": "Espanha",
    "Canada": "Canada",
    "Portugal": "Portugal",
    "South Korea": "Coreia do Sul",
    "Korea Republic": "Coreia do Sul",
    "England": "Inglaterra",
    "Uruguay": "Uruguai",
    "Netherlands": "Holanda",
    "Morocco": "Marrocos",
    "Australia": "Australia",
    "Croatia": "Croacia",
    "Italy": "Italia",
    "Colombia": "Colombia",
    "Serbia": "Servia",
}


class ApiFootballError(Exception):
    pass


@dataclass(frozen=True)
class FinishedMatchResult:
    api_fixture_id: int
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    status: str
    played_at: str


LOCAL_2022_RESULTS: dict[date, list[FinishedMatchResult]] = {
    date(2022, 11, 20): [
        FinishedMatchResult(0, "Catar", "Equador", 0, 2, "LOCAL", "2022-11-20T13:00:00-03:00"),
    ],
    date(2022, 11, 21): [
        FinishedMatchResult(0, "Senegal", "Holanda", 0, 2, "LOCAL", "2022-11-21T13:00:00-03:00"),
    ],
    date(2022, 11, 22): [
        FinishedMatchResult(0, "Argentina", "Arabia Saudita", 1, 2, "LOCAL", "2022-11-22T07:00:00-03:00"),
        FinishedMatchResult(0, "Dinamarca", "Tunisia", 0, 0, "LOCAL", "2022-11-22T10:00:00-03:00"),
        FinishedMatchResult(0, "Mexico", "Polonia", 0, 0, "LOCAL", "2022-11-22T13:00:00-03:00"),
    ],
    date(2022, 11, 24): [
        FinishedMatchResult(0, "Brasil", "Servia", 2, 0, "LOCAL", "2022-11-24T16:00:00-03:00"),
    ],
    date(2022, 12, 3): [
        FinishedMatchResult(0, "Holanda", "Estados Unidos", 3, 1, "LOCAL", "2022-12-03T12:00:00-03:00"),
        FinishedMatchResult(0, "Argentina", "Australia", 2, 1, "LOCAL", "2022-12-03T16:00:00-03:00"),
    ],
    date(2022, 12, 4): [
        FinishedMatchResult(0, "Inglaterra", "Senegal", 3, 0, "LOCAL", "2022-12-04T16:00:00-03:00"),
    ],
    date(2022, 12, 13): [
        FinishedMatchResult(0, "Argentina", "Croacia", 3, 0, "LOCAL", "2022-12-13T16:00:00-03:00"),
    ],
    date(2022, 12, 18): [
        FinishedMatchResult(0, "Argentina", "Franca", 3, 3, "LOCAL", "2022-12-18T12:00:00-03:00"),
    ],
}


class ApiFootballClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = API_FOOTBALL_BASE_URL,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self.api_key = api_key or os.getenv("API_FOOTBALL_KEY")
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def get_finished_matches_by_date(self, match_date: date) -> list[FinishedMatchResult]:
        if not self.api_key:
            raise ApiFootballError("API_FOOTBALL_KEY nao configurada no .env.")

        payload = self._get(
            "/fixtures",
            params={
                "league": WORLD_CUP_LEAGUE_ID,
                "season": match_date.year,
                "date": match_date.isoformat(),
                "timezone": "America/Sao_Paulo",
            },
        )

        return [result for fixture in payload.get("response", []) if (result := self._parse_finished_fixture(fixture))]

    def get_local_finished_matches_by_date(self, match_date: date) -> list[FinishedMatchResult]:
        return LOCAL_2022_RESULTS.get(match_date, [])

    def should_use_local_fallback(self) -> bool:
        value = os.getenv("API_FOOTBALL_USE_LOCAL_FALLBACK", "false")
        return value.strip().lower() in LOCAL_FALLBACK_ENABLED_VALUES

    def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        try:
            response = requests.get(
                f"{self.base_url}{path}",
                headers={"x-apisports-key": self.api_key},
                params=params,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except RequestException as error:
            raise ApiFootballError("Nao foi possivel conectar na API-Football.") from error

        try:
            payload = response.json()
        except ValueError as error:
            raise ApiFootballError("API-Football retornou uma resposta invalida.") from error

        api_errors = payload.get("errors")
        if api_errors:
            raise ApiFootballError(f"API-Football retornou erro: {api_errors}")

        return payload

    def _parse_finished_fixture(self, fixture: dict[str, Any]) -> FinishedMatchResult | None:
        fixture_data = fixture.get("fixture") or {}
        status = fixture_data.get("status") or {}
        status_short = status.get("short")

        if status_short not in FINISHED_STATUSES:
            return None

        goals = fixture.get("goals") or {}
        home_score = goals.get("home")
        away_score = goals.get("away")
        if home_score is None or away_score is None:
            return None

        teams = fixture.get("teams") or {}
        home_team = self._resolve_local_team_name(teams.get("home") or {})
        away_team = self._resolve_local_team_name(teams.get("away") or {})

        if not home_team or not away_team:
            return None

        return FinishedMatchResult(
            api_fixture_id=int(fixture_data.get("id") or 0),
            home_team=home_team,
            away_team=away_team,
            home_score=int(home_score),
            away_score=int(away_score),
            status=status_short,
            played_at=str(fixture_data.get("date") or ""),
        )

    def _resolve_local_team_name(self, team_payload: dict[str, Any]) -> str | None:
        api_team_id = team_payload.get("id")
        api_team_name = team_payload.get("name")

        if api_team_id in API_TEAM_ID_TO_LOCAL_NAME:
            return API_TEAM_ID_TO_LOCAL_NAME[api_team_id]

        if api_team_name in API_TEAM_NAME_TO_LOCAL_NAME:
            return API_TEAM_NAME_TO_LOCAL_NAME[api_team_name]

        return api_team_name
