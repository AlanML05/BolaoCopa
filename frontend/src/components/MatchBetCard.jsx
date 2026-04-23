import { formatDateTime, formatMatchDateTime } from "../services/formatters";

export function MatchBetCard({
  match,
  formState,
  submitting,
  onFieldChange,
  onSubmit,
}) {
  const hasExistingBet = Boolean(match.existing_bet);

  return (
    <article className="panel-strong flex h-full flex-col px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{match.stage}</p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{match.label}</h3>
          <p className="mt-2 text-sm text-muted">
            {formatMatchDateTime(match.kickoff_at)} - {match.stadium}
          </p>
        </div>
        <span
          className={`data-pill ${
            hasExistingBet
              ? "border-success/20 text-success"
              : match.betting_open
                ? "border-accent/20 text-accent"
                : "border-warning/20 text-warning"
          }`}
        >
          {hasExistingBet ? "Palpite salvo" : match.betting_open ? "Aberto" : "Fechado"}
        </span>
      </div>

      {hasExistingBet ? (
        <div className="mt-8 rounded-3xl border border-success/15 bg-success/5 px-4 py-4">
          <p className="text-sm font-semibold text-success">Palpite bloqueado para edicao</p>
          <p className="mt-3 text-3xl font-semibold text-ink">
            {match.existing_bet.predicted_home_score} x {match.existing_bet.predicted_away_score}
          </p>
          <p className="mt-3 text-sm text-muted">
            Registrado em {formatDateTime(match.existing_bet.created_at)}.
          </p>
        </div>
      ) : (
        <form
          className="mt-8 flex flex-1 flex-col justify-between gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(match.id);
          }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted">
                {match.home_team}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                className="field text-center text-xl font-semibold"
                value={formState.homeScore}
                onChange={(event) => onFieldChange(match.id, "homeScore", event.target.value)}
                disabled={!match.betting_open || submitting}
              />
            </div>

            <span className="pt-6 text-center text-2xl font-semibold text-muted">x</span>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted">
                {match.away_team}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                className="field text-center text-xl font-semibold"
                value={formState.awayScore}
                onChange={(event) => onFieldChange(match.id, "awayScore", event.target.value)}
                disabled={!match.betting_open || submitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="button-primary w-full"
            disabled={!match.betting_open || submitting}
          >
            {submitting ? "Salvando..." : "Registrar palpite"}
          </button>
        </form>
      )}
    </article>
  );
}
