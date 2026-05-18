import { useEffect, useMemo, useState } from "react";

import { MatchBetCard } from "../components/MatchBetCard";
import { StatCard } from "../components/StatCard";
import { createBet, getMyBetsOverview, updateBet } from "../services/api";
import { formatDateTime, formatScore } from "../services/formatters";

const EMPTY_MATCHES = [];
const LOCK_WINDOW_MS = 30 * 60 * 1000;

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

function isBetEditable(match, currentTime) {
  const kickoffTime = Date.parse(match.kickoff_at);
  const closedByClientClock =
    Number.isFinite(kickoffTime) && kickoffTime - currentTime <= LOCK_WINDOW_MS;
  const isScheduled = match.status === "scheduled";

  return isScheduled && Number.isFinite(kickoffTime) && !closedByClientClock;
}

export function MyBetsPage({ sessionUser }) {
  const [overview, setOverview] = useState(null);
  const [forms, setForms] = useState({});
  const [editForms, setEditForms] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSubPhase, setSelectedSubPhase] = useState("");
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
  const groupStageComplete = Boolean(overview?.metadata?.group_stage_complete);
  const filterableMatches = useMemo(() => {
    return upcomingMatches.filter((match) => groupStageComplete || match.phase !== "knockout");
  }, [groupStageComplete, upcomingMatches]);
  const dateOptions = useMemo(() => {
    return Array.from(new Set(filterableMatches.map(getMatchDateKey))).sort((first, second) =>
      first.localeCompare(second, "pt-BR", { numeric: true }),
    );
  }, [filterableMatches]);
  const subPhaseOptions = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const matchesOnDate = filterableMatches.filter(
      (match) => getMatchDateKey(match) === selectedDate,
    );
    return Array.from(new Set(matchesOnDate.map(getSubPhaseLabel))).sort((first, second) =>
      first.localeCompare(second, "pt-BR", { numeric: true }),
    );
  }, [filterableMatches, selectedDate]);
  const visibleMatches = useMemo(() => {
    if (!selectedDate || !selectedSubPhase) {
      return [];
    }

    return filterableMatches.filter(
      (match) =>
        getMatchDateKey(match) === selectedDate && getSubPhaseLabel(match) === selectedSubPhase,
    );
  }, [filterableMatches, selectedDate, selectedSubPhase]);

  useEffect(() => {
    if (selectedDate && !dateOptions.includes(selectedDate)) {
      setSelectedDate("");
      setSelectedSubPhase("");
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    if (selectedSubPhase && !subPhaseOptions.includes(selectedSubPhase)) {
      setSelectedSubPhase("");
    }
  }, [selectedSubPhase, subPhaseOptions]);

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
              Escolha uma data e uma sub-fase para registrar seus palpites nas partidas abertas.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="data-pill">Usuario: {overview.user.name}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jogos futuros"
          value={overview.summary.upcoming_matches}
          caption="Partidas abertas para acompanhamento e envio de palpite."
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
          <p className="text-sm text-muted">
            Os jogos aparecem depois que voce selecionar a data e a sub-fase.
          </p>
        </div>

        <div className="panel px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Data
              <select
                className="field mt-2"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedSubPhase("");
                }}
              >
                <option value="">Selecione uma data</option>
                {dateOptions.map((dateKey) => (
                  <option key={dateKey} value={dateKey}>
                    {formatDateLabel(dateKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Grupo/Sub-fase
              <select
                className="field mt-2"
                value={selectedSubPhase}
                onChange={(event) => setSelectedSubPhase(event.target.value)}
                disabled={!selectedDate}
              >
                <option value="">Selecione uma sub-fase</option>
                {subPhaseOptions.map((subPhase) => (
                  <option key={subPhase} value={subPhase}>
                    {subPhase}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filterableMatches.length === 0 ? (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Nenhuma partida disponivel.</p>
            <p className="mt-2 text-sm text-muted">
              Quando novas partidas forem cadastradas, elas aparecerao aqui.
            </p>
          </section>
        ) : !selectedDate || !selectedSubPhase ? (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Selecione data e sub-fase.</p>
            <p className="mt-2 text-sm text-muted">
              Use os filtros acima para carregar somente os jogos que deseja palpitar.
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
              Escolha outra data ou sub-fase para consultar os jogos disponiveis.
            </p>
          </section>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Historico</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
            Palpites ja registrados
          </h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {overview.submitted_bets.map((bet) => {
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
          ) : null}
        </div>
      </section>
    </div>
  );
}
