import { useEffect, useMemo, useState } from "react";

import { MatchBetCard } from "../components/MatchBetCard";
import { StatCard } from "../components/StatCard";
import { createBet, getMyBetsOverview, updateBet } from "../services/api";
import { formatDateTime, formatScore } from "../services/formatters";

const EMPTY_MATCHES = [];
const LOCK_WINDOW_MS = 30 * 60 * 1000;
const PLACEHOLDER_TEAM_TERMS = ["grupo", "jogo", "vencedor", "perdedor"];
const HISTORY_PHASE_ALL = "Todas as Fases";
const HISTORY_PHASE_OPTIONS = [HISTORY_PHASE_ALL, "Fase de Grupos", "Fase Mata-Mata"];
const GROUP_SUB_PHASE_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  `Grupo ${String.fromCharCode(65 + index)}`,
);
const KNOCKOUT_SUB_PHASE_OPTIONS = [
  "16-avos de final",
  "Oitavas de final",
  "Quartas de final",
  "Semifinal",
  "Disputa do 3º Lugar",
  "Final",
];

function createDefaultForms(matches) {
  return matches.reduce((accumulator, match) => {
    accumulator[match.id] = {
      homeScore: "",
      awayScore: "",
    };
    return accumulator;
  }, {});
}

function createSubmittedBetForms(bets) {
  return bets.reduce((accumulator, bet) => {
    accumulator[bet.bet_id] = {
      homeScore: String(bet.predicted_home_score),
      awayScore: String(bet.predicted_away_score),
    };
    return accumulator;
  }, {});
}

function getMatchDateKey(match) {
  const datePart = match.kickoff_at?.slice(0, 10);
  return datePart || "sem-data";
}

function formatDateLabel(dateKey) {
  if (dateKey === "sem-data") {
    return "Sem data definida";
  }

  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

function getSubPhaseLabel(match) {
  return match.sub_phase || match.stage || match.group || match.grupo || "Sem sub-fase";
}

function getTournamentPhaseLabel(match) {
  return match.tournament_phase || (match.phase === "knockout" ? "Fase Mata-Mata" : "Fase de Grupos");
}

function hasPlaceholderTeam(match) {
  return [match.home_team, match.away_team].some((teamName) =>
    PLACEHOLDER_TEAM_TERMS.some((term) => String(teamName ?? "").toLowerCase().includes(term)),
  );
}

function isBetEditable(match, currentTime) {
  const kickoffTime = Date.parse(match.kickoff_at);
  const closedByClientClock =
    Number.isFinite(kickoffTime) && kickoffTime - currentTime <= LOCK_WINDOW_MS;
  const isScheduled = match.status === "scheduled";

  return (
    isScheduled &&
    Number.isFinite(kickoffTime) &&
    !closedByClientClock &&
    !hasPlaceholderTeam(match)
  );
}

function isBlankScore(value) {
  return value === null || value === undefined || value === "";
}

function hasIncompleteBet(match) {
  const existingBet = match.existing_bet;

  return (
    !existingBet ||
    isBlankScore(existingBet.predicted_home_score) ||
    isBlankScore(existingBet.predicted_away_score)
  );
}

function getSortableKickoff(match) {
  const kickoffTime = Date.parse(match.kickoff_at);
  return Number.isFinite(kickoffTime) ? kickoffTime : Number.MAX_SAFE_INTEGER;
}

export function MyBetsPage({ sessionUser }) {
  const [overview, setOverview] = useState(null);
  const [forms, setForms] = useState({});
  const [editForms, setEditForms] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [selectedHistoryPhase, setSelectedHistoryPhase] = useState(HISTORY_PHASE_ALL);
  const [selectedHistorySubPhase, setSelectedHistorySubPhase] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [editingBetId, setEditingBetId] = useState("");
  const [savingBetId, setSavingBetId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const payload = await getMyBetsOverview(sessionUser.accessToken);
        if (!active) {
          return;
        }

        setOverview(payload);
        setForms(createDefaultForms(payload.upcoming_matches));
        setEditForms(createSubmittedBetForms(payload.submitted_bets));
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, [sessionUser.accessToken]);

  const upcomingMatches = overview?.upcoming_matches ?? EMPTY_MATCHES;
  const dateOptions = useMemo(() => {
    return Array.from(new Set(upcomingMatches.map(getMatchDateKey))).sort((first, second) =>
      first.localeCompare(second, "pt-BR", { numeric: true }),
    );
  }, [upcomingMatches]);
  const visibleMatches = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return upcomingMatches
      .filter((match) => getMatchDateKey(match) === selectedDate)
      .sort((firstMatch, secondMatch) => {
        const kickoffDifference =
          getSortableKickoff(firstMatch) - getSortableKickoff(secondMatch);

        if (kickoffDifference !== 0) {
          return kickoffDifference;
        }

        return getSubPhaseLabel(firstMatch).localeCompare(getSubPhaseLabel(secondMatch), "pt-BR", {
          numeric: true,
        });
      });
  }, [selectedDate, upcomingMatches]);
  const pendingMatches = useMemo(() => {
    return upcomingMatches
      .filter((match) => hasIncompleteBet(match) && isBetEditable(match, currentTime))
      .sort((firstMatch, secondMatch) => {
        const kickoffDifference =
          getSortableKickoff(firstMatch) - getSortableKickoff(secondMatch);

        if (kickoffDifference !== 0) {
          return kickoffDifference;
        }

        const firstGroupLabel = getSubPhaseLabel(firstMatch);
        const secondGroupLabel = getSubPhaseLabel(secondMatch);

        return firstGroupLabel.localeCompare(secondGroupLabel, "pt-BR", { numeric: true });
      });
  }, [currentTime, upcomingMatches]);
  const historySubPhaseOptions = useMemo(() => {
    if (selectedHistoryPhase === "Fase de Grupos") {
      return GROUP_SUB_PHASE_OPTIONS;
    }

    if (selectedHistoryPhase === "Fase Mata-Mata") {
      return KNOCKOUT_SUB_PHASE_OPTIONS;
    }

    return [];
  }, [selectedHistoryPhase]);
  const filteredSubmittedBets = useMemo(() => {
    const submittedBets = overview?.submitted_bets ?? [];

    return submittedBets.filter((bet) => {
      const matchPhase = getTournamentPhaseLabel(bet.match);
      const matchSubPhase = getSubPhaseLabel(bet.match);
      const phaseMatches =
        selectedHistoryPhase === HISTORY_PHASE_ALL || matchPhase === selectedHistoryPhase;
      const subPhaseMatches =
        !selectedHistorySubPhase || matchSubPhase === selectedHistorySubPhase;

      return phaseMatches && subPhaseMatches;
    });
  }, [overview?.submitted_bets, selectedHistoryPhase, selectedHistorySubPhase]);

  useEffect(() => {
    if (selectedDate && !dateOptions.includes(selectedDate)) {
      setSelectedDate("");
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    setSelectedHistorySubPhase("");
  }, [selectedHistoryPhase]);

  useEffect(() => {
    if (
      selectedHistorySubPhase &&
      !historySubPhaseOptions.includes(selectedHistorySubPhase)
    ) {
      setSelectedHistorySubPhase("");
    }
  }, [historySubPhaseOptions, selectedHistorySubPhase]);

  function handleFieldChange(matchId, field, value) {
    setForms((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [field]: value,
      },
    }));
  }

  async function handleSubmit(matchId) {
    const form = forms[matchId];
    const hasBlankScore = form?.homeScore === "" || form?.awayScore === "";
    const homeScore = Number(form?.homeScore);
    const awayScore = Number(form?.awayScore);

    if (hasBlankScore || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setNotice("Preencha os dois placares antes de salvar.");
      return;
    }

    setSavingMatchId(matchId);
    setNotice("");
    setError("");

    try {
      const response = await createBet(sessionUser.accessToken, {
        match_id: matchId,
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      });
      const refreshed = await getMyBetsOverview(sessionUser.accessToken);
      setOverview(refreshed);
      setForms(createDefaultForms(refreshed.upcoming_matches));
      setEditForms(createSubmittedBetForms(refreshed.submitted_bets));
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingMatchId("");
    }
  }

  function handleEditFieldChange(betId, field, value) {
    setEditForms((current) => ({
      ...current,
      [betId]: {
        ...current[betId],
        [field]: value,
      },
    }));
  }

  function handleEditStart(bet) {
    setEditingBetId(bet.bet_id);
    setEditForms((current) => ({
      ...current,
      [bet.bet_id]: {
        homeScore: String(bet.predicted_home_score),
        awayScore: String(bet.predicted_away_score),
      },
    }));
    setNotice("");
    setError("");
  }

  function handleEditCancel(bet) {
    setEditingBetId("");
    setEditForms((current) => ({
      ...current,
      [bet.bet_id]: {
        homeScore: String(bet.predicted_home_score),
        awayScore: String(bet.predicted_away_score),
      },
    }));
  }

  async function handleEditSubmit(bet) {
    const form = editForms[bet.bet_id];
    const hasBlankScore = form?.homeScore === "" || form?.awayScore === "";
    const homeScore = Number(form?.homeScore);
    const awayScore = Number(form?.awayScore);

    if (hasBlankScore || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setNotice("Preencha os dois placares antes de salvar a edicao.");
      return;
    }

    setSavingBetId(bet.bet_id);
    setNotice("");
    setError("");

    try {
      const response = await updateBet(sessionUser.accessToken, bet.bet_id, {
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      });
      const refreshed = await getMyBetsOverview(sessionUser.accessToken);
      setOverview(refreshed);
      setForms(createDefaultForms(refreshed.upcoming_matches));
      setEditForms(createSubmittedBetForms(refreshed.submitted_bets));
      setEditingBetId("");
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingBetId("");
    }
  }

  if (loading) {
    return (
      <section className="panel flex min-h-[320px] items-center justify-center px-6 py-8">
        <p className="text-sm tracking-[0.18em] text-muted">Carregando painel de palpites...</p>
      </section>
    );
  }

  if (error && !overview) {
    return (
      <section className="panel px-6 py-8">
        <p className="text-sm font-semibold text-danger">Nao foi possivel carregar a tela.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <p className="eyebrow">Area do participante</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="headline">Meus Palpites</h2>
            <p className="subtle-copy mt-3">
              Escolha o dia do jogo para consultar as partidas e registrar seus palpites.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="data-pill">Usuario: {overview.user.name}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jogos cadastrados"
          value={overview.summary.upcoming_matches}
          caption="Partidas carregadas para acompanhamento e envio de palpite."
          tone="accent"
        />
        <StatCard
          label="Palpites cadastrados"
          value={overview.summary.registered_upcoming_bets}
          caption="Jogos futuros que ja possuem um palpite seu."
          tone="success"
        />
        <StatCard
          label="Ainda disponiveis"
          value={overview.summary.open_matches_without_bet}
          caption="Partidas futuras que seguem liberadas para sua primeira aposta."
          tone="warning"
        />
        <StatCard
          label="Bloqueio"
          value={`${overview.metadata?.bet_lock_minutes ?? 30} min`}
          caption="Palpites encerram antes do inicio de cada partida."
        />
      </section>

      {notice ? (
        <section className="panel border-success/20 bg-success/5 px-5 py-4 text-sm text-success">
          {notice}
        </section>
      ) : null}

      {error ? (
        <section className="panel border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">
          {error}
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Palpites</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Escolha os jogos
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted">
              {showOnlyPending
                ? "Mostrando todos os jogos abertos que ainda precisam de palpite."
                : "Os jogos aparecem depois que voce selecionar uma data."}
            </p>
            <button
              type="button"
              aria-pressed={showOnlyPending}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                showOnlyPending
                  ? "border-warning/50 bg-warning/15 text-warning shadow-[0_0_24px_rgba(245,158,11,0.12)]"
                  : "border-accent/35 bg-accent/10 text-accent hover:border-accent/70 hover:bg-accent/15"
              }`}
              onClick={() => setShowOnlyPending((current) => !current)}
            >
              ⚽ Ver Jogos Pendentes
            </button>
          </div>
        </div>

        <div className="panel px-5 py-5">
          {showOnlyPending ? (
            <div className="mb-5 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
              Modo pendentes ativo: a data fica pausada enquanto buscamos todos os jogos
              cadastrados, abertos e sem palpite salvo.
            </div>
          ) : null}

          <div className={`grid gap-4 md:max-w-md ${showOnlyPending ? "opacity-55" : ""}`}>
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Dia do jogo
              <select
                className="field mt-2"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                disabled={showOnlyPending}
              >
                <option value="">Selecione uma data</option>
                {dateOptions.map((dateKey) => (
                  <option key={dateKey} value={dateKey}>
                    {formatDateLabel(dateKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {showOnlyPending ? (
          pendingMatches.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {pendingMatches.map((match) => (
                <MatchBetCard
                  key={match.id}
                  match={match}
                  formState={forms[match.id] ?? { homeScore: "", awayScore: "" }}
                  currentTime={currentTime}
                  submitting={savingMatchId === match.id}
                  onFieldChange={handleFieldChange}
                  onSubmit={handleSubmit}
                />
              ))}
            </div>
          ) : (
            <section className="panel border-success/20 bg-success/5 px-6 py-8">
              <p className="text-sm font-semibold text-success">
                🎉 Tudo certo por aqui! Você já palpitou em todos os jogos disponíveis.
              </p>
            </section>
          )
        ) : upcomingMatches.length === 0 ? (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Nenhuma partida disponivel.</p>
            <p className="mt-2 text-sm text-muted">
              Quando partidas forem cadastradas, elas aparecerao aqui.
            </p>
          </section>
        ) : !selectedDate ? (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Selecione uma data.</p>
            <p className="mt-2 text-sm text-muted">
              Use o filtro acima para carregar todos os jogos daquele dia.
            </p>
          </section>
        ) : visibleMatches.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {visibleMatches.map((match) => (
              <MatchBetCard
                key={match.id}
                match={match}
                formState={forms[match.id] ?? { homeScore: "", awayScore: "" }}
                currentTime={currentTime}
                submitting={savingMatchId === match.id}
                onFieldChange={handleFieldChange}
                onSubmit={handleSubmit}
              />
            ))}
          </div>
        ) : (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Nenhuma partida neste filtro.</p>
            <p className="mt-2 text-sm text-muted">
              Escolha outra data para consultar os jogos disponiveis.
            </p>
          </section>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Historico</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Palpites ja registrados
            </h3>
          </div>
          <p className="max-w-xl text-sm text-muted">
            Filtre seus palpites salvos para encontrar rapidamente um jogo e editar enquanto ainda
            estiver liberado.
          </p>
        </div>

        <div className="panel px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Fase
              <select
                className="field mt-2"
                value={selectedHistoryPhase}
                onChange={(event) => setSelectedHistoryPhase(event.target.value)}
              >
                {HISTORY_PHASE_OPTIONS.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Sub-fase
              <select
                className="field mt-2"
                value={selectedHistorySubPhase}
                onChange={(event) => setSelectedHistorySubPhase(event.target.value)}
                disabled={selectedHistoryPhase === HISTORY_PHASE_ALL}
              >
                <option value="">
                  {selectedHistoryPhase === HISTORY_PHASE_ALL
                    ? "Selecione uma fase primeiro"
                    : "Todas as sub-fases"}
                </option>
                {historySubPhaseOptions.map((subPhase) => (
                  <option key={subPhase} value={subPhase}>
                    {subPhase}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredSubmittedBets.map((bet) => {
            const editable = isBetEditable(bet.match, currentTime);
            const isEditing = editingBetId === bet.bet_id;
            const editForm = editForms[bet.bet_id] ?? {
              homeScore: String(bet.predicted_home_score),
              awayScore: String(bet.predicted_away_score),
            };

            return (
              <article key={bet.bet_id} className="panel px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{bet.match.stage}</p>
                    <h4 className="mt-2 font-display text-xl font-semibold text-ink">
                      {bet.match.label}
                    </h4>
                    <p className="mt-2 text-sm text-muted">
                      {formatDateTime(bet.match.kickoff_at)} - {bet.match.stadium}
                    </p>
                  </div>
                  <span
                    className={`data-pill ${
                      bet.match.status === "finished"
                        ? "border-warning/20 text-warning"
                        : "border-accent/20 text-accent"
                    }`}
                  >
                    {bet.match.status === "finished" ? "Encerrado" : "Agendado"}
                  </span>
                </div>

                {isEditing ? (
                  <form
                    className="mt-6 space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleEditSubmit(bet);
                    }}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <label className="text-xs uppercase tracking-[0.22em] text-muted">
                        {bet.match.home_team}
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="field mt-2 text-center text-xl font-semibold"
                          value={editForm.homeScore}
                          onChange={(event) =>
                            handleEditFieldChange(bet.bet_id, "homeScore", event.target.value)
                          }
                          disabled={savingBetId === bet.bet_id}
                        />
                      </label>

                      <span className="pt-7 text-center text-2xl font-semibold text-muted">x</span>

                      <label className="text-xs uppercase tracking-[0.22em] text-muted">
                        {bet.match.away_team}
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="field mt-2 text-center text-xl font-semibold"
                          value={editForm.awayScore}
                          onChange={(event) =>
                            handleEditFieldChange(bet.bet_id, "awayScore", event.target.value)
                          }
                          disabled={savingBetId === bet.bet_id}
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        className="button-primary flex-1"
                        disabled={savingBetId === bet.bet_id}
                      >
                        {savingBetId === bet.bet_id ? "Salvando..." : "Salvar edicao"}
                      </button>
                      <button
                        type="button"
                        className="button-secondary flex-1"
                        onClick={() => handleEditCancel(bet)}
                        disabled={savingBetId === bet.bet_id}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl border border-line/80 bg-canvas/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted">
                          Seu palpite
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-ink">
                          {bet.predicted_home_score} x {bet.predicted_away_score}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-line/80 bg-canvas/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted">Resultado</p>
                        <p className="mt-3 text-2xl font-semibold text-ink">
                          {formatScore(bet.match.home_score, bet.match.away_score)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted">
                        Registrado em {formatDateTime(bet.created_at)}.
                      </p>
                      {editable ? (
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => handleEditStart(bet)}
                        >
                          Editar palpite
                        </button>
                      ) : (
                        <span className="data-pill border-warning/20 text-warning">
                          Edicao bloqueada
                        </span>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })}

          {overview.submitted_bets.length === 0 ? (
            <section className="panel px-6 py-8">
              <p className="text-sm font-semibold text-ink">Nenhum palpite registrado.</p>
              <p className="mt-2 text-sm text-muted">
                Assim que voce salvar seus primeiros palpites, eles aparecerao aqui.
              </p>
            </section>
          ) : filteredSubmittedBets.length === 0 ? (
            <section className="panel px-6 py-8">
              <p className="text-sm font-semibold text-ink">Nenhum palpite neste filtro.</p>
              <p className="mt-2 text-sm text-muted">
                Ajuste a fase ou sub-fase para localizar outros palpites registrados.
              </p>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
