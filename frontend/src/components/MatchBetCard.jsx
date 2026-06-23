import { formatDateTime, formatMatchDateTime } from "../services/formatters";

const PLACEHOLDER_TEAM_TERMS = ["grupo", "jogo", "vencedor", "perdedor"];
const WAITING_FOR_TEAMS_MESSAGE = "Aguardando definição dos confrontos";

function hasPlaceholderTeam(match) {
  return [match.home_team, match.away_team].some((teamName) =>
    PLACEHOLDER_TEAM_TERMS.some((term) => String(teamName ?? "").toLowerCase().includes(term)),
  );
}

function getTournamentPhaseLabel(match) {
  return match.tournament_phase || (match.phase === "knockout" ? "Fase Mata-Mata" : "Fase de Grupos");
}

function getSubPhaseLabel(match) {
  return match.sub_phase || match.stage || match.group || match.grupo || "Sem sub-fase";
}

function formatPercentage(value) {
  const numberValue = Number(value) || 0;
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(1);
}

function getCrowdStatsMessage(stats, match) {
  if (!stats || !stats.total_bets) {
    return "";
  }

  const outcomes = [
    {
      type: "home",
      percentage: Number(stats.home_win_percentage) || 0,
      text: `${formatPercentage(stats.home_win_percentage)}% da galera aposta na vitória de ${match.home_team}`,
    },
    {
      type: "away",
      percentage: Number(stats.away_win_percentage) || 0,
      text: `${formatPercentage(stats.away_win_percentage)}% da galera aposta na vitória de ${match.away_team}`,
    },
    {
      type: "draw",
      percentage: Number(stats.draw_percentage) || 0,
      text: `${formatPercentage(stats.draw_percentage)}% da galera aposta no empate`,
    },
  ].sort((first, second) => second.percentage - first.percentage);

  const leadingOutcome = outcomes[0];
  return `Tendência da galera: ${leadingOutcome.text}.`;
}

export function MatchBetCard({
  match,
  formState,
  stats,
  currentTime = Date.now(),
  submitting,
  hasDraftChanges = false,
  onFieldChange,
  onSubmit,
}) {
  const hasExistingBet = Boolean(match.existing_bet);
  const kickoffTime = Date.parse(match.kickoff_at);
  const lockWindowMs = 30 * 60 * 1000;
  const hasValidKickoff = Number.isFinite(kickoffTime);
  const closedByClientClock =
    hasValidKickoff && kickoffTime - currentTime <= lockWindowMs;
  const isScheduled = match.status === "scheduled";
  const waitingForDefinedTeams = hasPlaceholderTeam(match);
  const tournamentPhaseLabel = getTournamentPhaseLabel(match);
  const subPhaseLabel = getSubPhaseLabel(match);
  const crowdStatsMessage = getCrowdStatsMessage(stats, match);
  const bettingEnabled =
    isScheduled && hasValidKickoff && !closedByClientClock && !waitingForDefinedTeams;
  const closedReason =
    (waitingForDefinedTeams ? WAITING_FOR_TEAMS_MESSAGE : "") ||
    (!hasValidKickoff
      ? "Data do jogo indefinida."
      : !isScheduled
        ? "Palpite encerrado."
        : closedByClientClock
          ? "Palpite encerrado: janela de 30 minutos atingida."
          : match.betting_closed_reason ?? "");

  return (
    <article className="panel-strong flex h-full flex-col overflow-hidden px-5 py-5 transition hover:border-accent/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{match.stage}</p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{match.label}</h3>
          <p className="mt-2 text-sm text-muted">
            {formatMatchDateTime(match.kickoff_at)} - {match.stadium}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="data-pill border-accent/15 text-accent">{tournamentPhaseLabel}</span>
            <span className="data-pill">{subPhaseLabel}</span>
          </div>
        </div>
        <span
          className={`data-pill ${
            hasExistingBet
              ? "border-success/20 text-success"
              : bettingEnabled
                ? "border-accent/20 text-accent"
                : "border-warning/30 bg-warning/5 text-warning"
          }`}
        >
          {hasExistingBet
            ? "Palpite salvo"
            : waitingForDefinedTeams
              ? "Aguardando"
              : bettingEnabled
                ? "Aberto"
                : "Palpite encerrado"}
        </span>
      </div>

      {hasExistingBet ? (
        <div className="mt-8 rounded-2xl border border-success/15 bg-success/5 px-4 py-4">
          <p className="text-sm font-semibold text-success">Palpite registrado</p>
          <p className="mt-3 text-3xl font-semibold text-ink">
            {match.existing_bet.predicted_home_score} x {match.existing_bet.predicted_away_score}
          </p>
          <p className="mt-3 text-sm text-muted">
            Registrado em {formatDateTime(match.existing_bet.created_at)}. Edições ficam no
            Histórico enquanto a janela estiver aberta.
          </p>
          {crowdStatsMessage ? (
            <p className="mt-3 rounded-xl border border-gray-700/70 bg-gray-800/70 px-3 py-2 text-center text-xs text-gray-300">
              {crowdStatsMessage}
            </p>
          ) : null}
        </div>
      ) : (
        <form
          className="mt-8 flex flex-1 flex-col justify-between gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(match.id);
          }}
        >
          {!bettingEnabled ? (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
              {closedReason || "Palpite encerrado."}
            </div>
          ) : null}

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
                disabled={!bettingEnabled || submitting}
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
                disabled={!bettingEnabled || submitting}
              />
            </div>
          </div>

          {crowdStatsMessage ? (
            <p className="rounded-xl border border-gray-700/70 bg-gray-800/70 px-3 py-2 text-center text-xs text-gray-300">
              {crowdStatsMessage}
            </p>
          ) : null}

          {waitingForDefinedTeams ? (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-center text-sm font-semibold text-warning">
              {WAITING_FOR_TEAMS_MESSAGE}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line/70 bg-canvas/55 px-4 py-3">
              <p className="text-sm text-muted">
                {hasDraftChanges
                  ? "Alteracao pendente neste jogo."
                  : "Digite os placares para habilitar o salvamento."}
              </p>
              {hasDraftChanges && bettingEnabled ? (
                <button
                  type="submit"
                  className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent/70 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!bettingEnabled || submitting}
                >
                  {submitting ? "Salvando..." : "✓ Salvar"}
                </button>
              ) : null}
            </div>
          )}
        </form>
      )}
    </article>
  );
}
