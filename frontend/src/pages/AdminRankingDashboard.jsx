import { useEffect, useState } from "react";

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

export function AdminRankingDashboard({ sessionUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [resultForms, setResultForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [busyMatchId, setBusyMatchId] = useState("");
  const [deletingMatchId, setDeletingMatchId] = useState("");
  const [updatingMatchId, setUpdatingMatchId] = useState("");
  const [showPaidPoolOnly, setShowPaidPoolOnly] = useState(false);

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
                  {dashboard.bets.map((bet) => (
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
