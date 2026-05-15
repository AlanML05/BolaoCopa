import { useMemo, useState } from "react";

import { formatDateTime } from "../services/formatters";

const initialForm = {
  home_team: "",
  away_team: "",
  match_date: "",
  group_name: "",
};

function isFutureScheduledMatch(match) {
  return match.status === "scheduled" && new Date(match.kickoff_at).getTime() > Date.now();
}

export function MatchManager({
  matches,
  creating,
  deletingMatchId,
  onCreate,
  onDelete,
}) {
  const [form, setForm] = useState(initialForm);

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter(isFutureScheduledMatch)
        .sort((first, second) => new Date(first.kickoff_at) - new Date(second.kickoff_at)),
    [matches],
  );

  function handleFieldChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const created = await onCreate({
      home_team: form.home_team,
      away_team: form.away_team,
      match_date: form.match_date,
      group_name: form.group_name,
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
          Cadastre partidas futuras e remova jogos criados por engano antes dos palpites.
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
              Fase ou grupo
            </label>
            <input
              type="text"
              className="field"
              placeholder="Grupo A ou Oitavas"
              value={form.group_name}
              onChange={(event) => handleFieldChange("group_name", event.target.value)}
              disabled={creating}
              required
            />
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
                <th className="px-4 py-4 font-medium">Data</th>
                <th className="px-4 py-4 font-medium text-right">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {upcomingMatches.length === 0 ? (
                <tr className="bg-panel/40 text-sm">
                  <td className="px-4 py-5 text-muted" colSpan={4}>
                    Nenhum jogo futuro cadastrado.
                  </td>
                </tr>
              ) : (
                upcomingMatches.map((match) => (
                  <tr key={match.id} className="bg-panel/40 text-sm">
                    <td className="px-4 py-4 text-ink">{match.label}</td>
                    <td className="px-4 py-4 text-muted">{match.stage}</td>
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
