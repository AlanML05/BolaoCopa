export function RankingTable({ ranking }) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line/80">
          <thead className="bg-canvas/65">
            <tr className="text-left text-xs uppercase tracking-[0.22em] text-muted">
              <th className="px-4 py-4 font-medium">Pos.</th>
              <th className="px-4 py-4 font-medium">Participante</th>
              <th className="px-4 py-4 font-medium">Pagou</th>
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
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink">{entry.name}</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">
                      {entry.department}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`data-pill ${
                      entry.paid
                        ? "border-success/20 text-success"
                        : "border-warning/20 text-warning"
                    }`}
                  >
                    {entry.paid ? "Pago" : "Pendente"}
                  </span>
                </td>
                <td className="px-4 py-4 text-lg font-semibold">{entry.total_points}</td>
                <td className="px-4 py-4 text-muted">{entry.exact_hits}</td>
                <td className="px-4 py-4 text-muted">{entry.draw_tendency_hits}</td>
                <td className="px-4 py-4 text-muted">{entry.winner_tendency_hits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
