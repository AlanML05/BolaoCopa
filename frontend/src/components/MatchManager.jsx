import { useMemo, useState } from "react";

import { formatDateTime } from "../services/formatters";

const initialForm = {
  home_team: "",
  away_team: "",
  match_date: "",
  tournament_phase: "Fase de Grupos",
  sub_phase: "Grupo A",
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
  creating,
  deletingMatchId,
  onCreate,
  onDelete,
}) {
  const [form, setForm] = useState(initialForm);

  const managedMatches = useMemo(
    () =>
      matches
        .sort((first, second) => new Date(first.kickoff_at) - new Date(second.kickoff_at)),
    [matches],
  );

  function handleFieldChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "tournament_phase" ? { sub_phase: subPhaseOptions[value][0] } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const created = await onCreate({
      home_team: form.home_team,
      away_team: form.away_team,
      match_date: form.match_date,
      tournament_phase: form.tournament_phase,
      sub_phase: form.sub_phase,
    });

    if (created) {
      setForm(initialForm);
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
          Cadastre partidas e remova jogos criados por engano antes dos palpites.
        </p>
      </div>

      <div className="panel-strong px-5 py-5">
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
              Time da casa
            </label>
            <input
              type="text"
              className="field"
              placeholder="Brasil"
              value={form.home_team}
              onChange={(event) => handleFieldChange("home_team", event.target.value)}
              disabled={creating}
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
              placeholder="Japao"
              value={form.away_team}
              onChange={(event) => handleFieldChange("away_team", event.target.value)}
              disabled={creating}
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
              value={form.match_date}
              onChange={(event) => handleFieldChange("match_date", event.target.value)}
              disabled={creating}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted">
              Fase
            </label>
            <select
              className="field"
              value={form.tournament_phase}
              onChange={(event) => handleFieldChange("tournament_phase", event.target.value)}
              disabled={creating}
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
              value={form.sub_phase}
              onChange={(event) => handleFieldChange("sub_phase", event.target.value)}
              disabled={creating}
              required
            >
              {subPhaseOptions[form.tournament_phase].map((subPhase) => (
                <option key={subPhase} value={subPhase}>
                  {subPhase}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <button type="submit" className="button-primary w-full sm:w-auto" disabled={creating}>
              {creating ? "Cadastrando..." : "Cadastrar jogo"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line/80">
            <thead className="bg-canvas/65">
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                <th className="px-4 py-4 font-medium">Jogo</th>
                <th className="px-4 py-4 font-medium">Fase</th>
                <th className="px-4 py-4 font-medium">Sub-fase</th>
                <th className="px-4 py-4 font-medium">Data</th>
                <th className="px-4 py-4 font-medium text-right">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {managedMatches.length === 0 ? (
                <tr className="bg-panel/40 text-sm">
                  <td className="px-4 py-5 text-muted" colSpan={5}>
                    Nenhum jogo cadastrado.
                  </td>
                </tr>
              ) : (
                managedMatches.map((match) => (
                  <tr key={match.id} className="bg-panel/40 text-sm">
                    <td className="px-4 py-4 text-ink">{match.label}</td>
                    <td className="px-4 py-4 text-muted">{match.tournament_phase}</td>
                    <td className="px-4 py-4 text-muted">{match.sub_phase}</td>
                    <td className="px-4 py-4 text-muted">{formatDateTime(match.kickoff_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        className="button-secondary px-3 py-2 text-danger hover:border-danger/60 hover:text-danger"
                        onClick={() => handleDelete(match)}
                        disabled={deletingMatchId === match.id}
                      >
                        {deletingMatchId === match.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
