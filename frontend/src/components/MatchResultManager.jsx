import { useMemo, useState } from "react";

import { formatDateTime, formatScore } from "../services/formatters";

const ALL_PHASES = "all-phases";
const ALL_SUB_PHASES = "all-sub-phases";

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getTournamentPhase(match) {
  return match.tournament_phase ?? match.phase_label ?? "Fase de Grupos";
}

function getSubPhase(match) {
  return match.sub_phase ?? match.stage;
}

export function MatchResultManager({
  matches,
  forms,
  busyMatchId,
  onFieldChange,
  onSave,
}) {
  const [selectedPhase, setSelectedPhase] = useState(ALL_PHASES);
  const [selectedSubPhase, setSelectedSubPhase] = useState(ALL_SUB_PHASES);

  const phaseOptions = useMemo(
    () => uniqueValues(matches.map((match) => getTournamentPhase(match))),
    [matches],
  );

  const subPhaseOptions = useMemo(
    () =>
      uniqueValues(
        matches
          .filter((match) => selectedPhase === ALL_PHASES || getTournamentPhase(match) === selectedPhase)
          .map((match) => getSubPhase(match)),
      ),
    [matches, selectedPhase],
  );

  const filteredMatches = useMemo(
    () =>
      matches.filter((match) => {
        const phaseMatches = selectedPhase === ALL_PHASES || getTournamentPhase(match) === selectedPhase;
        const subPhaseMatches = selectedSubPhase === ALL_SUB_PHASES || getSubPhase(match) === selectedSubPhase;
        return phaseMatches && subPhaseMatches;
      }),
    [matches, selectedPhase, selectedSubPhase],
  );

  function handlePhaseChange(value) {
    setSelectedPhase(value);
    setSelectedSubPhase(ALL_SUB_PHASES);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Resultados</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
          Inserir placar real
        </h3>
        <p className="mt-2 text-sm text-muted">
          Ao salvar um placar, todos os rankings sao atualizados na hora para refletir a nova
          rodada da disputa.
        </p>
      </div>

      <div className="panel-strong grid gap-4 px-5 py-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
            Fase
          </label>
          <select
            className="field"
            value={selectedPhase}
            onChange={(event) => handlePhaseChange(event.target.value)}
          >
            <option value={ALL_PHASES}>Todas as fases</option>
            {phaseOptions.map((phase) => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
            Sub-fase
          </label>
          <select
            className="field"
            value={selectedSubPhase}
            onChange={(event) => setSelectedSubPhase(event.target.value)}
          >
            <option value={ALL_SUB_PHASES}>Todas as sub-fases</option>
            {subPhaseOptions.map((subPhase) => (
              <option key={subPhase} value={subPhase}>
                {subPhase}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {filteredMatches.length === 0 ? (
          <section className="panel px-5 py-6 text-sm text-muted">
            Nenhum jogo encontrado para os filtros selecionados.
          </section>
        ) : null}

        {filteredMatches.map((match) => (
          <article key={match.id} className="panel-strong px-5 py-5 transition hover:border-accent/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">
                  {getTournamentPhase(match)} - {getSubPhase(match)}
                </p>
                <h4 className="mt-3 font-display text-2xl font-semibold text-ink">
                  {match.label}
                </h4>
                <p className="mt-2 text-sm text-muted">
                  {formatDateTime(match.kickoff_at)} - {match.stadium}
                </p>
              </div>
              <span
                className={`data-pill ${
                  match.has_result
                    ? "border-success/20 text-success"
                    : "border-warning/20 text-warning"
                }`}
              >
                {match.has_result ? "Finalizado" : "Sem resultado"}
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-line/80 bg-canvas/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Placar atual</p>
              <p className="mt-3 text-2xl font-semibold text-ink">
                {formatScore(match.home_score, match.away_score)}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  {match.home_team}
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  className="field text-center text-xl font-semibold"
                  value={forms[match.id]?.homeScore ?? ""}
                  onChange={(event) => onFieldChange(match.id, "homeScore", event.target.value)}
                  disabled={busyMatchId === match.id}
                />
              </div>

              <span className="pt-6 text-center text-2xl font-semibold text-muted">x</span>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  {match.away_team}
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  className="field text-center text-xl font-semibold"
                  value={forms[match.id]?.awayScore ?? ""}
                  onChange={(event) => onFieldChange(match.id, "awayScore", event.target.value)}
                  disabled={busyMatchId === match.id}
                />
              </div>
            </div>

            <button
              type="button"
              className="button-primary mt-5 w-full"
              onClick={() => onSave(match.id)}
              disabled={busyMatchId === match.id}
            >
              {busyMatchId === match.id
                ? "Salvando..."
                : match.has_result
                  ? "Atualizar resultado"
                  : "Salvar resultado"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
