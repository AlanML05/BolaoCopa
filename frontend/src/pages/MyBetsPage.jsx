import { useEffect, useState } from "react";

import { MatchBetCard } from "../components/MatchBetCard";
import { StatCard } from "../components/StatCard";
import { createBet, getMyBetsOverview } from "../services/api";
import { formatDateTime, formatScore } from "../services/formatters";

function createDefaultForms(matches) {
  return matches.reduce((accumulator, match) => {
    accumulator[match.id] = {
      homeScore: "",
      awayScore: "",
    };
    return accumulator;
  }, {});
}

export function MyBetsPage({ sessionUser }) {
  const [overview, setOverview] = useState(null);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const payload = await getMyBetsOverview(sessionUser.id);
        if (!active) {
          return;
        }

        setOverview(payload);
        setForms(createDefaultForms(payload.upcoming_matches));
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
  }, [sessionUser.id]);

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
      const response = await createBet(sessionUser.id, {
        match_id: matchId,
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      });
      const refreshed = await getMyBetsOverview(sessionUser.id);
      setOverview(refreshed);
      setForms(createDefaultForms(refreshed.upcoming_matches));
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingMatchId("");
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
    <div className="space-y-8">
      <section className="panel px-6 py-6">
        <p className="eyebrow">Area do participante</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="headline">Meus Palpites</h2>
            <p className="subtle-copy mt-3">
              Voce pode cadastrar apenas um palpite por partida futura. Depois de salvo, o
              palpite fica bloqueado para edicao, mantendo a regra do MVP.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="data-pill">Usuario: {overview.user.name}</span>
            <span
              className={`data-pill ${
                overview.user.paid
                  ? "border-success/20 text-success"
                  : "border-warning/20 text-warning"
              }`}
            >
              {overview.user.paid ? "Pagamento confirmado" : "Pagamento pendente"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Jogos futuros disponiveis
            </h3>
          </div>
          <p className="text-sm text-muted">Sem acesso a ranking, pontos ou palpites de terceiros.</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {overview.upcoming_matches.map((match) => (
            <MatchBetCard
              key={match.id}
              match={match}
              formState={forms[match.id] ?? { homeScore: "", awayScore: "" }}
              submitting={savingMatchId === match.id}
              onFieldChange={handleFieldChange}
              onSubmit={handleSubmit}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Historico</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
            Palpites ja registrados
          </h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {overview.submitted_bets.map((bet) => (
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

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-line/80 bg-canvas/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Seu palpite</p>
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

              <p className="mt-4 text-sm text-muted">
                Registrado em {formatDateTime(bet.created_at)}.
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
