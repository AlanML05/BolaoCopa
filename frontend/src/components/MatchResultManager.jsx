import { formatDateTime, formatScore } from "../services/formatters";

export function MatchResultManager({
  matches,
  forms,
  busyMatchId,
  onFieldChange,
  onSave,
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Resultados</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
          Inserir placar real
        </h3>
        <p className="mt-2 text-sm text-muted">
          Ao salvar um placar, o backend atualiza o jogo em memoria e recalcula o ranking
          imediatamente para todos os palpites relacionados.
        </p>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {matches.map((match) => (
          <article key={match.id} className="panel-strong px-5 py-5 transition hover:border-accent/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{match.stage}</p>
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
                    : !match.result_entry_allowed
                      ? "border-line/80 text-muted"
                    : "border-warning/20 text-warning"
                }`}
              >
                {match.has_result
                  ? "Finalizado"
                  : match.result_entry_allowed
                    ? "Sem resultado"
                    : "Aguardando kickoff"}
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
                  disabled={busyMatchId === match.id || !match.result_entry_allowed}
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
                  disabled={busyMatchId === match.id || !match.result_entry_allowed}
                />
              </div>
            </div>

            <button
              type="button"
              className="button-primary mt-5 w-full"
              onClick={() => onSave(match.id)}
              disabled={busyMatchId === match.id || !match.result_entry_allowed}
            >
              {!match.result_entry_allowed
                ? "Disponivel apos o kickoff"
                : busyMatchId === match.id
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
