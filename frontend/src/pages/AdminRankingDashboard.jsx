import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

import { MatchManager } from "../components/MatchManager";
import { MatchResultManager } from "../components/MatchResultManager";
import { RankingTable } from "../components/RankingTable";
import { StatCard } from "../components/StatCard";
import {
  deleteMatch,
  getAdminDashboard,
  updateMatch,
  updateMatchResult,
  updatePaymentStatus,
} from "../services/api";
import {
  formatCurrency,
  formatDateTime,
  formatPercentage,
} from "../services/formatters";

function createResultForms(matches) {
  return matches.reduce((accumulator, match) => {
    accumulator[match.id] = {
      homeScore:
        match.home_score === null || match.home_score === undefined ? "" : String(match.home_score),
      awayScore:
        match.away_score === null || match.away_score === undefined ? "" : String(match.away_score),
    };
    return accumulator;
  }, {});
}

const ALL_USERS = "all-users";
const ALL_PHASES = "all-phases";
const ALL_SUB_PHASES = "all-sub-phases";
const GROUP_PHASE = "Fase de Grupos";
const KNOCKOUT_PHASE = "Fase Mata-Mata";
const GROUP_SUB_PHASES = Array.from({ length: 12 }, (_, index) =>
  `Grupo ${String.fromCharCode(65 + index)}`,
);
const KNOCKOUT_SUB_PHASES = [
  "16-avos de Final",
  "Oitavas de Final",
  "Quartas de Final",
  "Semifinal",
  "Terceiro Lugar",
  "Final",
];

function getBetPhaseLabel(bet) {
  if (bet.tournament_phase) {
    return bet.tournament_phase;
  }

  return bet.phase === "knockout" ? KNOCKOUT_PHASE : GROUP_PHASE;
}

function getBetGroupLabel(bet) {
  const group = bet.sub_phase ?? bet.group ?? bet.stage ?? "";
  if (String(group).toLowerCase().startsWith("grupo")) {
    return group;
  }
  return group ? `Grupo ${group}` : "";
}

function getBetSubPhaseLabel(bet) {
  if (getBetPhaseLabel(bet) === GROUP_PHASE) {
    return getBetGroupLabel(bet);
  }

  const subPhase = String(bet.sub_phase ?? bet.stage ?? "").toLowerCase();

  if (subPhase.includes("16")) {
    return "16-avos de Final";
  }
  if (subPhase.includes("oitavas")) {
    return "Oitavas de Final";
  }
  if (subPhase.includes("quartas")) {
    return "Quartas de Final";
  }
  if (subPhase.includes("semi")) {
    return "Semifinal";
  }
  if (subPhase.includes("3") || subPhase.includes("terceiro")) {
    return "Terceiro Lugar";
  }
  if (subPhase.includes("final")) {
    return "Final";
  }

  return bet.sub_phase ?? bet.stage ?? "";
}

function formatRankPosition(position) {
  return `${position}º`;
}

export function AdminRankingDashboard({ sessionUser }) {
  const [dashboard, setDashboard] = useState(null);
  const mysteryRankingRef = useRef(null);
  const [resultForms, setResultForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exportingMysteryRanking, setExportingMysteryRanking] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");
  const [busyMatchId, setBusyMatchId] = useState("");
  const [deletingMatchId, setDeletingMatchId] = useState("");
  const [updatingMatchId, setUpdatingMatchId] = useState("");
  const [showPaidPoolOnly, setShowPaidPoolOnly] = useState(false);
  const [selectedUser, setSelectedUser] = useState(ALL_USERS);
  const [selectedPhase, setSelectedPhase] = useState(ALL_PHASES);
  const [selectedSubPhase, setSelectedSubPhase] = useState(ALL_SUB_PHASES);

  function syncDashboard(nextDashboard) {
    setDashboard(nextDashboard);
    setResultForms(createResultForms(nextDashboard.matches));
  }

  async function refreshDashboard() {
    const payload = await getAdminDashboard(sessionUser.accessToken);
    syncDashboard(payload);
    return payload;
  }

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const payload = await getAdminDashboard(sessionUser.accessToken);
        if (active) {
          syncDashboard(payload);
        }
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

    loadDashboard();

    return () => {
      active = false;
    };
  }, [sessionUser.accessToken]);

  async function handleUserFinancialStatusChange(user, updates) {
    setBusyUserId(user.id);
    setError("");
    setNotice("");

    const nextPayload = {
      is_paid_pool: user.is_paid_pool,
      paid: user.paid,
      ...updates,
    };

    if (!nextPayload.is_paid_pool) {
      nextPayload.paid = false;
    }

    try {
      const response = await updatePaymentStatus(sessionUser.accessToken, user.id, nextPayload);
      syncDashboard(response.dashboard);
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyUserId("");
    }
  }

  function handleResultFieldChange(matchId, field, value) {
    setResultForms((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [field]: value,
      },
    }));
  }

  async function handleMatchResultSave(matchId) {
    const form = resultForms[matchId];
    const hasBlankScore = form?.homeScore === "" || form?.awayScore === "";
    const homeScore = Number(form?.homeScore);
    const awayScore = Number(form?.awayScore);

    if (hasBlankScore || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setError("Preencha os dois placares reais antes de salvar.");
      setNotice("");
      return;
    }

    setBusyMatchId(matchId);
    setError("");
    setNotice("");

    try {
      const response = await updateMatchResult(sessionUser.accessToken, matchId, {
        home_score: homeScore,
        away_score: awayScore,
      });
      await refreshDashboard();
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyMatchId("");
    }
  }

  async function handleMatchDelete(matchId) {
    setDeletingMatchId(matchId);
    setError("");
    setNotice("");

    try {
      const response = await deleteMatch(sessionUser.accessToken, matchId);
      syncDashboard(response.dashboard);
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingMatchId("");
    }
  }

  async function handleMatchUpdate(matchId, matchPayload) {
    setUpdatingMatchId(matchId);
    setError("");
    setNotice("");

    try {
      const response = await updateMatch(sessionUser.accessToken, matchId, matchPayload);
      syncDashboard(response.dashboard);
      setNotice(response.message);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setUpdatingMatchId("");
    }
  }

  async function handleMysteryRankingExport() {
    if (!mysteryRankingRef.current) {
      return;
    }

    setExportingMysteryRanking(true);
    setError("");
    setNotice("");

    try {
      const canvas = await html2canvas(mysteryRankingRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const imageUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = imageUrl;
      downloadLink.download = "ranking-bolao-ost.png";
      downloadLink.click();
      setNotice("Imagem do Ranking Misterioso gerada com sucesso.");
    } catch {
      setError("Nao foi possivel gerar a imagem do Ranking Misterioso.");
    } finally {
      setExportingMysteryRanking(false);
    }
  }

  const userFilterOptions = useMemo(
    () =>
      [...(dashboard?.users ?? [])].sort((first, second) =>
        first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" }),
      ),
    [dashboard?.users],
  );
  const subPhaseFilterOptions =
    selectedPhase === GROUP_PHASE
      ? GROUP_SUB_PHASES
      : selectedPhase === KNOCKOUT_PHASE
        ? KNOCKOUT_SUB_PHASES
        : [];
  const filteredBets = useMemo(
    () =>
      (dashboard?.bets ?? []).filter((bet) => {
        const userMatches = selectedUser === ALL_USERS || bet.user_id === selectedUser;
        const phaseMatches = selectedPhase === ALL_PHASES || getBetPhaseLabel(bet) === selectedPhase;
        const subPhaseMatches =
          selectedPhase === ALL_PHASES ||
          selectedSubPhase === ALL_SUB_PHASES ||
          getBetSubPhaseLabel(bet) === selectedSubPhase;

        return userMatches && phaseMatches && subPhaseMatches;
      }),
    [dashboard?.bets, selectedPhase, selectedSubPhase, selectedUser],
  );

  function handleBetPhaseFilterChange(value) {
    setSelectedPhase(value);
    setSelectedSubPhase(ALL_SUB_PHASES);
  }

  if (loading) {
    return (
      <section className="panel flex min-h-[320px] items-center justify-center px-6 py-8">
        <p className="text-sm tracking-[0.18em] text-muted">Montando dashboard administrativo...</p>
      </section>
    );
  }

  if (error && !dashboard) {
    return (
      <section className="panel px-6 py-8">
        <p className="text-sm font-semibold text-danger">Nao foi possivel carregar o dashboard.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  const paidRanking = dashboard.paid_ranking ?? dashboard.ranking.filter((entry) => entry.is_paid_pool);
  const mysteryRanking = dashboard.ranking.slice(0, 10);
  const financialUsers = showPaidPoolOnly
    ? dashboard.users.filter((user) => user.is_paid_pool)
    : dashboard.users;

  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Visao administrativa</p>
            <h2 className="headline mt-4">Dashboard do Ranking</h2>
            <p className="subtle-copy mt-3">
              Ranking calculado com pontuacao automatica, desempates aplicados em ordem e
              controle manual dos participantes do Bolao Pago.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-2xl border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent/70 hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleMysteryRankingExport}
              disabled={exportingMysteryRanking || mysteryRanking.length === 0}
            >
              {exportingMysteryRanking
                ? "Gerando imagem..."
                : "📸 Compartilhar Ranking Misterioso"}
            </button>
            <span className="data-pill">Gerado em {formatDateTime(dashboard.generated_at)}</span>
            <span className="data-pill">Sessao: {sessionUser.name}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pote atual"
          value={formatCurrency(dashboard.prize_pool.total_collected)}
          caption={`Baseado em ${dashboard.prize_pool.paid_participants} pagamentos confirmados.`}
          tone="accent"
        />
        <StatCard
          label="Palpites"
          value={dashboard.summary.total_bets}
          caption="Todos os palpites registrados no banco, finalizados e futuros."
          tone="success"
        />
        <StatCard
          label="Jogos encerrados"
          value={dashboard.summary.finished_matches}
          caption="Partidas que ja entram no calculo de pontos e desempates."
          tone="warning"
        />
        <StatCard
          label="Bolao Pago"
          value={dashboard.prize_pool.paid_pool_participants ?? paidRanking.length}
          caption="Participantes marcados pelo admin para concorrer ao premio em dinheiro."
        />
      </section>

      {error ? (
        <section className="panel border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">
          {error}
        </section>
      ) : null}

      {notice ? (
        <section className="panel border-success/20 bg-success/5 px-5 py-4 text-sm text-success">
          {notice}
        </section>
      ) : null}

      <MatchManager
        matches={dashboard.matches}
        deletingMatchId={deletingMatchId}
        updatingMatchId={updatingMatchId}
        onUpdate={handleMatchUpdate}
        onDelete={handleMatchDelete}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Ranking Geral</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Camisa do Brasil
            </h3>
            <p className="mt-2 text-sm text-muted">
              Todos os participantes aparecem nesta classificacao.
            </p>
          </div>
          <RankingTable ranking={dashboard.ranking} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="eyebrow">Ranking Bolao Pago</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Premio em dinheiro
            </h3>
            <p className="mt-2 text-sm text-muted">
              Apenas participantes marcados no controle financeiro entram nesta classificacao.
            </p>
          </div>
          <RankingTable
            ranking={paidRanking}
            emptyMessage="Nenhum participante marcado para o Bolao Pago."
          />
        </div>
      </section>

      <div
        ref={mysteryRankingRef}
        className="pointer-events-none fixed left-[-9999px] top-0 w-[720px] overflow-hidden rounded-[32px] border border-sky-300/25 bg-slate-950 p-10 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.24),transparent_42%),linear-gradient(145deg,rgba(250,204,21,0.14),transparent_28%,rgba(14,165,233,0.10))]" />
        <div className="relative">
          <p className="text-center text-sm font-bold uppercase tracking-[0.32em] text-sky-200">
            Ranking Misterioso
          </p>
          <h3 className="mt-4 text-center font-display text-4xl font-black tracking-wide text-white">
            🏆 Bolão OST
          </h3>
          <p className="mt-3 text-center text-sm text-slate-300">
            Top 10 atualizado em {formatDateTime(dashboard.generated_at)}
          </p>

          <div className="mt-9 space-y-3">
            {mysteryRanking.map((entry) => (
              <div
                key={entry.user_id}
                className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.07] px-6 py-4"
              >
                <div className="flex items-center gap-5">
                  <span className="w-16 font-display text-3xl font-black text-sky-200">
                    {formatRankPosition(entry.rank)}
                  </span>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-300/30 bg-slate-900 text-4xl">
                    {entry.emoji || "👤"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Pontos
                  </p>
                  <p className="font-display text-4xl font-black text-amber-300">
                    {entry.total_points}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs uppercase tracking-[0.26em] text-slate-500">
            Nomes ocultos. Que vença o palpite.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Premiacao</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
            Distribuicao do pote
          </h3>
          <p className="mt-2 text-sm text-muted">
            O valor do pote usa apenas pagamentos confirmados; a ordem segue o Ranking Bolao Pago.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {dashboard.prize_pool.distribution.map((item) => (
            <article key={item.position} className="panel-strong border-accent/10 px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">
                    {item.position} lugar
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-ink">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
                <span className="data-pill">{formatPercentage(item.percentage)}</span>
              </div>
              <p className="mt-4 text-sm text-muted">
                {item.user_name ? `Elegivel atual: ${item.user_name}` : "Sem participante elegivel."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <div>
          <MatchResultManager
            matches={dashboard.matches}
            forms={resultForms}
            busyMatchId={busyMatchId}
            onFieldChange={handleResultFieldChange}
            onSave={handleMatchResultSave}
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Financeiro</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                Controle do Bolao Pago
              </h3>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-canvas/70 px-4 py-3 text-sm text-ink">
              <span>Mostrar apenas participantes</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-sky-300"
                checked={showPaidPoolOnly}
                onChange={(event) => setShowPaidPoolOnly(event.target.checked)}
              />
            </label>
          </div>
          <div className="space-y-3">
            {financialUsers.map((user) => (
              <article
                key={user.id}
                className="panel space-y-4 px-5 py-4 transition hover:border-accent/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{user.name}</p>
                    <p className="mt-1 text-sm text-muted">{user.department || user.username}</p>
                  </div>
                  <span
                    className={`data-pill ${
                      user.is_paid_pool ? "border-accent/20 text-accent" : "text-muted"
                    }`}
                  >
                    {user.is_paid_pool ? "No Bolao Pago" : "Ranking Geral"}
                  </span>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-line/80 bg-canvas/70 px-4 py-3 text-sm text-ink">
                    <span>Participa do Bolao Pago?</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-sky-300"
                      checked={Boolean(user.is_paid_pool)}
                      disabled={busyUserId === user.id}
                      onChange={(event) =>
                        handleUserFinancialStatusChange(user, {
                          is_paid_pool: event.target.checked,
                          paid: event.target.checked ? user.paid : false,
                        })
                      }
                    />
                  </label>

                  {user.is_paid_pool ? (
                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-line/80 bg-canvas/70 px-4 py-3 text-sm text-ink">
                      <span>Pagamento Realizado?</span>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-sky-300"
                        checked={Boolean(user.paid)}
                        disabled={busyUserId === user.id}
                        onChange={(event) =>
                          handleUserFinancialStatusChange(user, {
                            paid: event.target.checked,
                          })
                        }
                      />
                    </label>
                  ) : null}
                </div>
              </article>
            ))}

            {financialUsers.length === 0 ? (
              <section className="panel px-5 py-5">
                <p className="text-sm font-semibold text-ink">
                  Nenhum participante no filtro atual.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Marque usuarios como participantes do Bolao Pago para eles aparecerem aqui.
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Auditoria</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Todos os palpites e pontuacao detalhada
            </h3>
          </div>
          <div className="panel-strong grid gap-4 px-5 py-5 md:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Usuario
              <select
                className="field mt-2"
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
              >
                <option value={ALL_USERS}>Todos os Usuarios</option>
                {userFilterOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Fase
              <select
                className="field mt-2"
                value={selectedPhase}
                onChange={(event) => handleBetPhaseFilterChange(event.target.value)}
              >
                <option value={ALL_PHASES}>Todas as Fases</option>
                <option value={GROUP_PHASE}>{GROUP_PHASE}</option>
                <option value={KNOCKOUT_PHASE}>{KNOCKOUT_PHASE}</option>
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Sub-fase
              <select
                className="field mt-2"
                value={selectedSubPhase}
                onChange={(event) => setSelectedSubPhase(event.target.value)}
                disabled={selectedPhase === ALL_PHASES}
              >
                <option value={ALL_SUB_PHASES}>
                  {selectedPhase === GROUP_PHASE ? "Todos os Grupos" : "Todas as Sub-fases"}
                </option>
                {subPhaseFilterOptions.map((subPhase) => (
                  <option key={subPhase} value={subPhase}>
                    {subPhase}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line/80">
                <thead className="bg-canvas/65">
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                    <th className="px-4 py-4 font-medium">Participante</th>
                    <th className="px-4 py-4 font-medium">Jogo</th>
                    <th className="px-4 py-4 font-medium">Palpite</th>
                    <th className="px-4 py-4 font-medium">Resultado</th>
                    <th className="px-4 py-4 font-medium">Pontos</th>
                    <th className="px-4 py-4 font-medium">Criterio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredBets.map((bet) => (
                    <tr key={bet.bet_id} className="bg-panel/40 text-sm">
                      <td className="px-4 py-4 text-ink">{bet.user_name}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-ink">{bet.match_label}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-muted">
                            {bet.stage}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-ink">{bet.predicted_score}</td>
                      <td className="px-4 py-4 text-muted">{bet.actual_score ?? "-- x --"}</td>
                      <td className="px-4 py-4 font-semibold text-accent">{bet.points}</td>
                      <td className="px-4 py-4 text-muted">{bet.reason}</td>
                    </tr>
                  ))}

                  {filteredBets.length === 0 ? (
                    <tr className="bg-panel/40 text-sm text-muted">
                      <td className="px-4 py-5" colSpan={6}>
                        Nenhum palpite encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
