import { useMemo, useState } from "react";

import { formatDateTime } from "../services/formatters";

const initialForm = {
  home_team: "",
  away_team: "",
  match_date: "",
  tournament_phase: "Fase de Grupos",
  sub_phase: "Grupo A",
  stadium: "",
};

const subPhaseOptions = {
  "Fase de Grupos": [
    "Grupo A",
    "Grupo B",
    "Grupo C",
    "Grupo D",
    "Grupo E",
    "Grupo F",
    "Grupo G",
    "Grupo H",
    "Grupo I",
    "Grupo J",
    "Grupo K",
    "Grupo L",
  ],
  "Fase Mata-Mata": [
    "16-avos de final",
    "Oitavas de final",
    "Quartas de final",
    "Semifinal",
    "Disputa do 3º Lugar",
    "Final",
  ],
};

export function MatchManager({
  matches,
  deletingMatchId,
  updatingMatchId,
  onUpdate,
  onDelete,
}) {
  const [editingMatch, setEditingMatch] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);

  const managedMatches = useMemo(
    () =>
      matches
        .sort((first, second) => new Date(first.kickoff_at) - new Date(second.kickoff_at)),
    [matches],
  );

  function formatDateTimeLocal(value) {
    return value ? value.slice(0, 16) : "";
  }

  function handleEditStart(match) {
    const tournamentPhase = match.tournament_phase || initialForm.tournament_phase;
    const subPhaseOptionsForPhase = subPhaseOptions[tournamentPhase] ?? subPhaseOptions[initialForm.tournament_phase];

    setEditingMatch(match);
    setEditForm({
      home_team: match.home_team ?? "",
      away_team: match.away_team ?? "",
      match_date: formatDateTimeLocal(match.kickoff_at),
      tournament_phase: tournamentPhase,
      sub_phase: match.sub_phase || subPhaseOptionsForPhase[0],
      stadium: match.stadium ?? "",
    });
  }

  function handleEditCancel() {
    setEditingMatch(null);
    setEditForm(initialForm);
  }

  function handleEditFieldChange(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "tournament_phase" ? { sub_phase: subPhaseOptions[value][0] } : {}),
    }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();

    if (!editingMatch) {
      return;
    }

    const updated = await onUpdate(editingMatch.id, {
      home_team: editForm.home_team,
      away_team: editForm.away_team,
      match_date: editForm.match_date,
      tournament_phase: editForm.tournament_phase,
      sub_phase: editForm.sub_phase,
      stadium: editForm.stadium,
    });

    if (updated) {
      handleEditCancel();
    }
  }

  function handleDelete(match) {
    const confirmed = window.confirm(`Excluir ${match.label}?`);
    if (confirmed) {
      onDelete(match.id);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow">Partidas</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
          Gerenciar jogos
        </h3>
        <p className="mt-2 text-sm text-muted">
          Os 104 jogos oficiais ja estao cadastrados. Edite dados do chaveamento ou remova inconsistencias.
        </p>
      </div>

      <div className="panel overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-max divide-y divide-line/80 text-sm">
            <thead className="bg-canvas/65">
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                <th className="whitespace-nowrap px-4 py-4 font-medium">Jogo</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">Fase</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">Sub-fase</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium">Data</th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-medium">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {managedMatches.length === 0 ? (
                <tr className="bg-panel/40 text-sm">
                  <td className="whitespace-nowrap px-4 py-5 text-muted" colSpan={5}>
                    Nenhum jogo cadastrado.
                  </td>
                </tr>
              ) : (
                managedMatches.map((match) => (
                  <tr key={match.id} className="bg-panel/40 text-sm">
                    <td className="whitespace-nowrap px-4 py-4 text-ink">{match.label}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{match.tournament_phase}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{match.sub_phase}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDateTime(match.kickoff_at)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="button-secondary px-3 py-2"
                          onClick={() => handleEditStart(match)}
                          disabled={updatingMatchId === match.id || deletingMatchId === match.id}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button-secondary px-3 py-2 text-danger hover:border-danger/60 hover:text-danger"
                          onClick={() => handleDelete(match)}
                          disabled={deletingMatchId === match.id || updatingMatchId === match.id}
                        >
                          {deletingMatchId === match.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingMatch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="panel-strong max-h-[90vh] w-full max-w-3xl overflow-y-auto px-5 py-5 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="eyebrow">Editar partida</p>
                <h4 className="mt-2 font-display text-2xl font-semibold text-ink">
                  {editingMatch.label}
                </h4>
              </div>
              <button
                type="button"
                className="button-secondary px-3 py-2"
                onClick={handleEditCancel}
                disabled={updatingMatchId === editingMatch.id}
              >
                Fechar
              </button>
            </div>

            <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={handleEditSubmit}>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  Time da casa
                </label>
                <input
                  type="text"
                  className="field"
                  value={editForm.home_team}
                  onChange={(event) => handleEditFieldChange("home_team", event.target.value)}
                  disabled={updatingMatchId === editingMatch.id}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  Time visitante
                </label>
                <input
                  type="text"
                  className="field"
                  value={editForm.away_team}
                  onChange={(event) => handleEditFieldChange("away_team", event.target.value)}
                  disabled={updatingMatchId === editingMatch.id}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  Data e hora
                </label>
                <input
                  type="datetime-local"
                  className="field"
                  value={editForm.match_date}
                  onChange={(event) => handleEditFieldChange("match_date", event.target.value)}
                  disabled={updatingMatchId === editingMatch.id}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  Fase
                </label>
                <select
                  className="field"
                  value={editForm.tournament_phase}
                  onChange={(event) => handleEditFieldChange("tournament_phase", event.target.value)}
                  disabled={updatingMatchId === editingMatch.id}
                  required
                >
                  <option value="Fase de Grupos">Fase de Grupos</option>
                  <option value="Fase Mata-Mata">Fase Mata-Mata</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  Sub-fase
                </label>
                <select
                  className="field"
                  value={editForm.sub_phase}
                  onChange={(event) => handleEditFieldChange("sub_phase", event.target.value)}
                  disabled={updatingMatchId === editingMatch.id}
                  required
                >
                  {subPhaseOptions[editForm.tournament_phase].map((subPhase) => (
                    <option key={subPhase} value={subPhase}>
                      {subPhase}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
                  Estadio
                </label>
                <input
                  type="text"
                  className="field"
                  value={editForm.stadium}
                  onChange={(event) => handleEditFieldChange("stadium", event.target.value)}
                  disabled={updatingMatchId === editingMatch.id}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
                <button
                  type="submit"
                  className="button-primary flex-1"
                  disabled={updatingMatchId === editingMatch.id}
                >
                  {updatingMatchId === editingMatch.id ? "Salvando..." : "Salvar alteracoes"}
                </button>
                <button
                  type="button"
                  className="button-secondary flex-1"
                  onClick={handleEditCancel}
                  disabled={updatingMatchId === editingMatch.id}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
