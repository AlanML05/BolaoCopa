import { NavLink } from "react-router-dom";

const navigation = [
  { to: "/my-bets", label: "Meus Palpites", roles: ["user"] },
  { to: "/admin/ranking", label: "Dashboard Ranking", roles: ["admin"] },
];

export function AppShell({ sessionUser, onLogout, children }) {
  const visibleNavigation = navigation.filter((item) => item.roles.includes(sessionUser?.role));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(139,213,255,0.18),transparent_48%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_22%,transparent_78%,rgba(255,255,255,0.02))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="panel mb-8 flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">OST World Cup Pool</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-[0.03em] text-ink">
                Bolao Copa 2026
              </h1>
              <span className="data-pill">MVP sem banco real</span>
            </div>
            <p className="subtle-copy mt-3 max-w-xl">
              Fluxo em memoria para validar a experiencia do participante, ranking do admin
              e as regras matematicas do bolao antes da camada persistente.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:min-w-[360px]">
            <div className="rounded-[28px] border border-line/80 bg-canvas/70 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Sessao ativa
                  </p>
                  <p className="mt-3 text-lg font-semibold text-ink">{sessionUser?.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {sessionUser?.is_admin ? "Administrador OST" : `@${sessionUser?.username}`}
                  </p>
                </div>
                <button type="button" className="button-secondary" onClick={onLogout}>
                  Sair
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="data-pill">
                  {sessionUser?.is_admin ? "Acesso admin" : "Participante"}
                </span>
                {!sessionUser?.is_admin ? (
                  <span
                    className={`data-pill ${
                      sessionUser?.paid
                        ? "border-success/20 text-success"
                        : "border-warning/20 text-warning"
                    }`}
                  >
                    {sessionUser?.paid ? "Pagamento confirmado" : "Pagamento pendente"}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {visibleNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-ink text-canvas"
                        : "border border-line/80 bg-canvas/60 text-muted hover:text-ink"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
