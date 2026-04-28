import { useEffect, useState } from "react";

import { MatchBetCard } from "../components/MatchBetCard";
import { StatCard } from "../components/StatCard";
import { createBet, getMyBetsOverview } from "../services/api";
import { formatDateTime, formatScore } from "../services/formatters";

const KNOCKOUT_TAB_ID = "knockout";

function createDefaultForms(matches) {
  return matches.reduce((accumulator, match) => {
    accumulator[match.id] = {
      homeScore: "",
      awayScore: "",
    };
    return accumulator;
  }, {});
}

function getGroupKey(match) {
  return match.group ?? match.grupo ?? match.stage?.replace("Grupo ", "") ?? "Sem grupo";
}

function buildMatchTabs(matches) {
  const groups = new Map();
  const knockoutMatches = [];

  matches.forEach((match) => {
    if (match.phase === "knockout") {
      knockoutMatches.push(match);
      return;
    }

    const group = getGroupKey(match);
    const id = `group-${group}`;

    if (!groups.has(id)) {
      groups.set(id, {
        id,
        label: `Grupo ${group}`,
        sortKey: group,
        matches: [],
      });
    }

    groups.get(id).matches.push(match);
  });

  const groupTabs = Array.from(groups.values()).sort((first, second) =>
    first.sortKey.localeCompare(second.sortKey, "pt-BR", { numeric: true }),
  );

  return [
    ...groupTabs,
    {
      id: KNOCKOUT_TAB_ID,
      label: "Mata-Mata",
      sortKey: "zz",
      matches: knockoutMatches,
    },
  ];
}

export function MyBetsPage({ sessionUser }) {
  const [overview, setOverview] = useState(null);
  const [forms, setForms] = useState({});
  const [activeTab, setActiveTab] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState("");
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
        setActiveTab((current) => {
          const nextTabs = buildMatchTabs(payload.upcoming_matches);
          if (nextTabs.some((tab) => tab.id === current)) {
            return current;
          }
          return nextTabs[0]?.id ?? KNOCKOUT_TAB_ID;
        });
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
      setActiveTab((current) => {
        const nextTabs = buildMatchTabs(refreshed.upcoming_matches);
        return nextTabs.some((tab) => tab.id === current)
          ? current
          : nextTabs[0]?.id ?? KNOCKOUT_TAB_ID;
      });
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

  const tabs = buildMatchTabs(overview.upcoming_matches);
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const groupStageComplete = Boolean(overview.metadata?.group_stage_complete);
  const isKnockoutTab = selectedTab?.id === KNOCKOUT_TAB_ID;
  const visibleMatches = isKnockoutTab && !groupStageComplete ? [] : selectedTab?.matches ?? [];

  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <p className="eyebrow">Area do participante</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="headline">Meus Palpites</h2>
            <p className="subtle-copy mt-3">
              Navegue por grupo, registre palpites em partidas abertas e acompanhe o bloqueio
              automatico de 30 minutos antes do kickoff.
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
            <p className="eyebrow">Cadastro</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Partidas por fase
            </h3>
          </div>
          <p className="text-sm text-muted">
            A aba Mata-Mata libera palpites somente depois da Fase de Grupos.
          </p>
        </div>

        <div className="panel overflow-hidden p-2">
          <div className="flex gap-2 overflow-x-auto p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  tab.id === selectedTab?.id
                    ? "bg-accent text-canvas shadow-[0_12px_34px_rgba(139,213,255,0.18)]"
                    : "border border-line/80 bg-canvas/70 text-muted hover:border-accent/50 hover:text-ink"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs">
                  {tab.matches.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isKnockoutTab && !groupStageComplete ? (
          <section className="panel-strong border-warning/20 px-6 py-8">
            <p className="eyebrow">Mata-Mata</p>
            <h4 className="mt-3 font-display text-2xl font-semibold text-ink">
              Aguardando definicao da Fase de Grupos
            </h4>
            <p className="subtle-copy mt-3 max-w-2xl">
              Assim que todos os jogos de grupo tiverem resultado informado pelo admin, os
              confrontos eliminatorios ficam visiveis e liberados conforme a janela de 30 minutos.
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
            <p className="text-sm font-semibold text-ink">Nenhuma partida nesta aba.</p>
            <p className="mt-2 text-sm text-muted">
              Quando novas partidas forem cadastradas para esta fase, elas aparecerao aqui.
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
