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
  const [helpNotice, setHelpNotice] = useState("");
  const signupNotice = location.state?.signupMessage ?? "";

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setHelpNotice("");

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
    <div className="relative min-h-screen overflow-hidden bg-[#020617]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/tunel.jpg')] bg-cover bg-center opacity-80" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.82)_0%,rgba(2,6,23,0.26)_31%,rgba(2,6,23,0.2)_50%,rgba(2,6,23,0.26)_69%,rgba(2,6,23,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.74)_0%,rgba(2,6,23,0.22)_34%,rgba(2,6,23,0.38)_72%,rgba(2,6,23,0.86)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_19%,rgba(125,211,252,0.24),transparent_23%),radial-gradient(circle_at_50%_45%,rgba(250,204,21,0.14),transparent_27%)]" />
        <div className="absolute left-1/2 top-0 hidden h-[64vh] w-[54vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(250,204,21,0.18),rgba(250,204,21,0.06)_44%,transparent_76%)] blur-2xl md:block" />
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(2,6,23,0.72)]" />
      </div>

      <img
        src="/taca.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 hidden h-[125vh] max-h-[1250px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-50 md:block"
      />

      <img
        src="/mascotes.png"
        alt="Mascotes da Copa do Mundo 2026"
        className="pointer-events-none absolute left-1/2 top-4 z-10 h-40 max-w-[88vw] -translate-x-1/2 object-contain opacity-95 sm:h-52 lg:left-6 lg:top-auto lg:bottom-8 lg:h-[30rem] lg:max-w-[460px] lg:translate-x-0"
      />

      <img
        src="/bola.png"
        alt="Bola da Copa do Mundo 2026"
        className="pointer-events-none absolute bottom-5 right-4 z-10 h-32 w-32 max-w-[38vw] object-contain opacity-50 sm:h-40 sm:w-40 lg:right-10 lg:top-1/2 lg:h-52 lg:w-52 lg:-translate-y-1/2"
      />

      <div className="relative z-20 flex min-h-screen items-center justify-center px-5 py-44 sm:px-6 lg:px-8 lg:py-10">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/65 px-6 py-8 shadow-2xl shadow-black/50 backdrop-blur-md sm:px-8 sm:py-10">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="Bolao Copa 2026"
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="mt-6 text-center">
            <p className="eyebrow">World Cup Pool</p>
            <h1 className="headline mt-4">Login do Bolao Copa 2026</h1>
            <p className="subtle-copy mx-auto mt-4 max-w-sm">
              Entre com seu usuario e senha para receber um token seguro de acesso.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Usuario
              </label>
              <input
                type="text"
                className="field border-white/10 bg-white/10 backdrop-blur-md"
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
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-yellow-300 transition hover:text-accent"
                  onClick={() =>
                    setHelpNotice("Para recuperar sua senha, procure o administrador do bolao.")
                  }
                >
                  Esqueci a senha
                </button>
              </div>
              <input
                type="password"
                className="field border-white/10 bg-white/10 backdrop-blur-md"
                placeholder="sua senha"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            {error || sessionNotice || signupNotice || helpNotice ? (
              <div
                className={`rounded-3xl border px-4 py-3 text-sm ${
                  error || sessionNotice
                    ? "border-danger/20 bg-danger/5 text-danger"
                    : signupNotice
                      ? "border-success/20 bg-success/5 text-success"
                      : "border-yellow-300/25 bg-yellow-300/10 text-yellow-200"
                }`}
              >
                {error || sessionNotice || signupNotice || helpNotice}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-canvas shadow-[0_14px_34px_rgba(139,213,255,0.2)] transition hover:bg-yellow-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-muted disabled:shadow-none"
              disabled={submitting}
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-center text-sm text-muted">
              Nao tem uma conta?{" "}
              <Link className="font-semibold text-accent transition hover:text-yellow-300" to="/signup">
                Cadastre-se
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
