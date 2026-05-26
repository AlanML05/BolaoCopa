import { useEffect, useMemo, useState } from "react";

import { KnockoutBracket } from "../components/KnockoutBracket";
import { getAdminDashboard, getMyBetsOverview, getStandings } from "../services/api";
import { formatDateTime } from "../services/formatters";

const columns = [
  { key: "played", label: "J" },
  { key: "wins", label: "V" },
  { key: "draws", label: "E" },
  { key: "losses", label: "D" },
  { key: "goals_for", label: "GP" },
  { key: "goals_against", label: "GC" },
  { key: "goal_difference", label: "SG" },
  { key: "points", label: "Pts" },
];

export function GroupStandingsPage({ sessionUser }) {
  const [standings, setStandings] = useState(null);
  const [matches, setMatches] = useState([]);
  const [viewMode, setViewMode] = useState("groups");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStandings() {
      setLoading(true);
      setError("");

      try {
        const [standingsPayload, matchesPayload] = await Promise.all([
          getStandings(sessionUser.accessToken),
          sessionUser.is_admin
            ? getAdminDashboard(sessionUser.accessToken)
            : getMyBetsOverview(sessionUser.accessToken),
        ]);
        if (active) {
          setStandings(standingsPayload);
          setMatches(
            sessionUser.is_admin
              ? matchesPayload.matches ?? []
              : matchesPayload.upcoming_matches ?? [],
          );
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

    loadStandings();

    return () => {
      active = false;
    };
  }, [sessionUser.accessToken, sessionUser.is_admin]);

  const knockoutMatches = useMemo(
    () => matches.filter((match) => match.tournament_phase === "Fase Mata-Mata"),
    [matches],
  );

  if (loading) {
    return (
      <section className="panel flex min-h-[320px] items-center justify-center px-6 py-8">
        <p className="text-sm tracking-[0.18em] text-muted">Carregando tabelas dos grupos...</p>
      </section>
    );
  }

  if (error && !standings) {
    return (
      <section className="panel px-6 py-8">
        <p className="text-sm font-semibold text-danger">Nao foi possivel carregar as tabelas.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Copa do Mundo 2026</p>
            <h2 className="headline mt-4">Tabelas dos Grupos</h2>
            <p className="subtle-copy mt-3">
              Acompanhe a disputa ponto a ponto! Vitorias, empates e gols fazem cada grupo mudar
              de cara ate a ultima rodada.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "groups"
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-line/80 bg-canvas/70 text-muted hover:border-accent/30 hover:text-ink"
                }`}
                onClick={() => setViewMode("groups")}
              >
                Ver Tabela de Grupos
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "knockout"
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-line/80 bg-canvas/70 text-muted hover:border-accent/30 hover:text-ink"
                }`}
                onClick={() => setViewMode("knockout")}
              >
                Chaveamento Mata-Mata
              </button>
            </div>
            {standings?.generated_at ? (
              <span className="data-pill">Atualizado em {formatDateTime(standings.generated_at)}</span>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <section className="panel border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">
          {error}
        </section>
      ) : null}

      {viewMode === "groups" ? (
        <>
          <section className="grid gap-5 xl:grid-cols-2">
            {(standings?.groups ?? []).map((group) => (
              <article key={group.group} className="panel overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-line/80 px-5 py-4">
                  <div>
                    <p className="eyebrow">Grupo</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold text-ink">
                      {group.group}
                    </h3>
                  </div>
                  <span className="data-pill">Top 2 direto</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-line/80">
                    <thead className="bg-canvas/65">
                      <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted">
                        <th className="px-4 py-4 font-medium">Pos.</th>
                        <th className="min-w-[150px] px-4 py-4 font-medium">Selecao</th>
                        {columns.map((column) => (
                          <th key={column.key} className="px-3 py-4 text-center font-medium">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {group.teams.map((team) => (
                        <tr
                          key={team.team}
                          className={`text-sm ${
                            team.qualified_direct ? "bg-accent/5 text-ink" : "bg-panel/40 text-ink"
                          }`}
                        >
                          <td className="px-4 py-4 font-display text-lg font-semibold text-accent">
                            {team.rank}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold text-ink">{team.team}</span>
                              {team.qualified_direct ? (
                                <span className="w-fit rounded-full border border-success/20 bg-success/5 px-2 py-0.5 text-xs font-semibold text-success">
                                  Classifica
                                </span>
                              ) : null}
                            </div>
                          </td>
                          {columns.map((column) => (
                            <td
                              key={column.key}
                              className={`px-3 py-4 text-center ${
                                column.key === "points" ? "font-semibold text-accent" : "text-muted"
                              }`}
                            >
                              {team[column.key]}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {group.teams.length === 0 ? (
                        <tr className="bg-panel/40 text-sm text-muted">
                          <td className="px-4 py-5" colSpan={10}>
                            Nenhuma selecao cadastrada neste grupo.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </section>

          <section className="space-y-4">
            <div>
              <p className="eyebrow">Terceiros colocados</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                Ranking dos Terceiros Colocados
              </h3>
              <p className="mt-2 text-sm text-muted">
                Os oito melhores terceiros continuam sonhando com a taca. Cada ponto e cada gol
                podem mudar essa corrida.
              </p>
            </div>

            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line/80">
                  <thead className="bg-canvas/65">
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted">
                      <th className="px-4 py-4 font-medium">Pos.</th>
                      <th className="min-w-[150px] px-4 py-4 font-medium">Selecao</th>
                      <th className="px-4 py-4 font-medium">Grupo</th>
                      {columns.map((column) => (
                        <th key={column.key} className="px-3 py-4 text-center font-medium">
                          {column.label}
                        </th>
                      ))}
                      <th className="px-4 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {(standings?.best_thirds ?? []).map((team) => (
                      <tr
                        key={`${team.group}-${team.team}`}
                        className={`text-sm ${
                          team.qualified_third ? "bg-success/5 text-ink" : "bg-panel/40 text-ink"
                        }`}
                      >
                        <td className="px-4 py-4 font-display text-lg font-semibold text-accent">
                          {team.rank}
                        </td>
                        <td className="px-4 py-4 font-semibold text-ink">{team.team}</td>
                        <td className="px-4 py-4 text-muted">{team.group}</td>
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={`px-3 py-4 text-center ${
                              column.key === "points" ? "font-semibold text-accent" : "text-muted"
                            }`}
                          >
                            {team[column.key]}
                          </td>
                        ))}
                        <td className="px-4 py-4">
                          {team.qualified_third ? (
                            <span className="rounded-full border border-success/20 bg-success/5 px-2 py-0.5 text-xs font-semibold text-success">
                              Classificado (Repescagem)
                            </span>
                          ) : (
                            <span className="rounded-full border border-warning/20 bg-warning/5 px-2 py-0.5 text-xs font-semibold text-warning">
                              Eliminado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {(standings?.best_thirds ?? []).length === 0 ? (
                      <tr className="bg-panel/40 text-sm text-muted">
                        <td className="px-4 py-5" colSpan={12}>
                          Ainda nao ha terceiros colocados calculados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : (
        <KnockoutBracket matches={knockoutMatches} />
      )}
    </div>
  );
}
