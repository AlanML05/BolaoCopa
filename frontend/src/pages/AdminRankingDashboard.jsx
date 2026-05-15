import { useEffect, useState } from "react";

import { MatchManager } from "../components/MatchManager";
import { MatchResultManager } from "../components/MatchResultManager";
import { RankingTable } from "../components/RankingTable";
import { StatCard } from "../components/StatCard";
import {
  createMatch,
  deleteMatch,
  getAdminDashboard,
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
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState("");

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

  async function handlePaymentToggle(user) {
    setBusyUserId(user.id);
    setError("");
    setNotice("");

    try {
      const response = await updatePaymentStatus(sessionUser.accessToken, user.id, !user.paid);
      await refreshDashboard();
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

  async function handleMatchCreate(matchPayload) {
    setCreatingMatch(true);
    setError("");
    setNotice("");

    try {
      const response = await createMatch(sessionUser.accessToken, matchPayload);
      syncDashboard(response.dashboard);
      setNotice(response.message);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setCreatingMatch(false);
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

  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Visao administrativa</p>
            <h2 className="headline mt-4">Dashboard do Ranking</h2>
            <p className="subtle-copy mt-3">
              Ranking calculado com pontuacao automatica, desempates aplicados em ordem e
              controle manual da elegibilidade financeira para o pote.
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
          caption={`Baseado em ${dashboard.prize_pool.paid_participants} participantes pagos.`}
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
          label="Participantes"
          value={dashboard.summary.participants}
          caption="Usuarios comuns incluidos no bolao, independentemente do status de pagamento."
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
        creating={creatingMatch}
        deletingMatchId={deletingMatchId}
        onCreate={handleMatchCreate}
        onDelete={handleMatchDelete}
      />

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Ranking</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Classificacao geral com desempates
            </h3>
            <p className="mt-2 text-sm text-muted">
              A tabela mostra todos os participantes. A premiacao abaixo considera apenas quem
              esta com pagamento confirmado.
            </p>
          </div>
          <RankingTable ranking={dashboard.ranking} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="eyebrow">Premiacao</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Distribuicao do pote
            </h3>
          </div>
          <div className="space-y-4">
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
          <div>
            <p className="eyebrow">Financeiro</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Controle mockado de pagamento
            </h3>
          </div>
          <div className="space-y-3">
            {dashboard.users.map((user) => (
              <article
                key={user.id}
                className="panel flex items-center justify-between gap-4 px-5 py-4 transition hover:border-accent/30"
              >
                <div>
                  <p className="font-semibold text-ink">{user.name}</p>
                  <p className="mt-1 text-sm text-muted">{user.department}</p>
                </div>
                <button
                  type="button"
                  className={user.paid ? "button-secondary" : "button-primary"}
                  onClick={() => handlePaymentToggle(user)}
                  disabled={busyUserId === user.id}
                >
                  {busyUserId === user.id
                    ? "Atualizando..."
                    : user.paid
                      ? "Marcar pendente"
                      : "Confirmar pagamento"}
                </button>
              </article>
            ))}
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
