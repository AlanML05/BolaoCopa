export function RankingTable({ ranking = [], emptyMessage = "Nenhum participante encontrado." }) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line/80">
          <thead className="bg-canvas/65">
            <tr className="text-left text-xs uppercase tracking-[0.22em] text-muted">
              <th className="px-4 py-4 font-medium">Pos.</th>
              <th className="px-4 py-4 font-medium">Participante</th>
              <th className="px-4 py-4 font-medium">Pontos</th>
              <th className="px-4 py-4 font-medium">Exatos</th>
              <th className="px-4 py-4 font-medium">Empates</th>
              <th className="px-4 py-4 font-medium">Vencedores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {ranking.map((entry) => (
              <tr key={entry.user_id} className="bg-panel/40 text-sm text-ink">
                <td className="px-4 py-4 font-display text-lg font-semibold text-accent">
                  {entry.rank}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-canvas/75 text-2xl shadow-[0_0_18px_rgba(125,211,252,0.08)]">
                      {entry.emoji || "👤"}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold text-ink">{entry.name}</span>
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">
                        {entry.department}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-lg font-semibold">{entry.total_points}</td>
                <td className="px-4 py-4 text-muted">{entry.exact_hits}</td>
                <td className="px-4 py-4 text-muted">{entry.draw_tendency_hits}</td>
                <td className="px-4 py-4 text-muted">{entry.winner_tendency_hits}</td>
              </tr>
            ))}
            {ranking.length === 0 ? (
              <tr className="bg-panel/40 text-sm text-muted">
                <td className="px-4 py-5" colSpan={6}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
