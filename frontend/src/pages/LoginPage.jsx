import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionNotice } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const signupNotice = location.state?.signupMessage ?? "";

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

      <div className="relative mx-auto flex min-h-screen w-full max-w-xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <section className="panel w-full px-6 py-8 sm:px-8 sm:py-10">
          <p className="eyebrow">World Cup Pool</p>
          <h1 className="headline mt-4">Login do Bolao Copa 2026</h1>
          <p className="subtle-copy mt-4 max-w-lg">
            Entre com seu usuario e senha para receber um token seguro de acesso.
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

            {error || sessionNotice || signupNotice ? (
              <div
                className={`rounded-3xl border px-4 py-3 text-sm ${
                  error || sessionNotice
                    ? "border-danger/20 bg-danger/5 text-danger"
                    : "border-success/20 bg-success/5 text-success"
                }`}
              >
                {error || sessionNotice || signupNotice}
              </div>
            ) : null}

            <button type="submit" className="button-primary w-full" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-center text-sm text-muted">
              Nao tem uma conta?{" "}
              <Link className="font-semibold text-accent transition hover:text-ink" to="/signup">
                Cadastre-se
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
