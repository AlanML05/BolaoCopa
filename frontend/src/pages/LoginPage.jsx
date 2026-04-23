import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const demoCredentials = [
  {
    label: "Admin",
    username: "mariana.admin",
    password: "admin123",
    description: "Acesso total ao ranking, palpites, pagamentos e resultados.",
  },
  {
    label: "Participante",
    username: "ana.silva",
    password: "123456",
    description: "Fluxo de apostas sem acesso ao ranking ou aos palpites alheios.",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const authenticatedUser = await login(form);
      navigate(authenticatedUser.is_admin ? "/admin/ranking" : "/my-bets", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(139,213,255,0.16),transparent_52%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.03),transparent_20%,transparent_80%,rgba(255,255,255,0.02))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="panel px-6 py-8 sm:px-8 sm:py-10">
            <p className="eyebrow">OST World Cup Pool</p>
            <h1 className="headline mt-4">Login do Bolao Copa 2026</h1>
            <p className="subtle-copy mt-4 max-w-lg">
              Entre com seu usuario mockado para acessar a visao correta do sistema.
              Participantes visualizam apenas seus palpites. Admins controlam ranking,
              pagamentos e resultados.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Usuario
                </label>
                <input
                  type="text"
                  className="field"
                  placeholder="usuario ou e-mail"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, username: event.target.value }))
                  }
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Senha
                </label>
                <input
                  type="password"
                  className="field"
                  placeholder="sua senha"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </div>

              {error ? (
                <div className="rounded-3xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="button-primary w-full" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </section>

          <section className="panel-strong px-6 py-8 sm:px-8 sm:py-10">
            <p className="eyebrow">Acesso de teste</p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-ink">
              Credenciais mockadas
            </h2>
            <p className="subtle-copy mt-4">
              Este MVP continua 100% em memoria. O login autentica contra a lista mockada
              do backend e persiste a sessao apenas no navegador.
            </p>

            <div className="mt-8 space-y-4">
              {demoCredentials.map((credential) => (
                <article key={credential.label} className="rounded-[28px] border border-line/80 bg-canvas/80 px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-2xl font-semibold text-ink">
                      {credential.label}
                    </h3>
                    <span className="data-pill">{credential.label === "Admin" ? "Controle total" : "Aposta segura"}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted">{credential.description}</p>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-2xl border border-line/80 bg-panel px-4 py-3 text-ink">
                      <span className="text-muted">Usuario:</span> {credential.username}
                    </div>
                    <div className="rounded-2xl border border-line/80 bg-panel px-4 py-3 text-ink">
                      <span className="text-muted">Senha:</span> {credential.password}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
