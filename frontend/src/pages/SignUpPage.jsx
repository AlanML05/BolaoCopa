import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signupUser } from "../services/api";

export function SignUpPage() {
  const navigate = useNavigate();
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
      const response = await signupUser({
        username: form.username.trim(),
        password: form.password,
      });

      navigate("/login", {
        replace: true,
        state: {
          signupMessage: response.message ?? "Cadastro criado com sucesso. Faca login para continuar.",
        },
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

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <section className="panel w-full px-6 py-8 sm:px-8 sm:py-10">
          <p className="eyebrow">World Cup Pool</p>
          <h1 className="headline mt-4">Cadastro do Bolao Copa 2026</h1>
          <p className="subtle-copy mt-4 max-w-lg">
            Crie seu usuario de participante para acessar os jogos disponiveis e registrar
            seus palpites dentro do prazo.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Usuario
              </label>
              <input
                type="text"
                className="field"
                placeholder="seu.usuario"
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                autoComplete="username"
                disabled={submitting}
                minLength={3}
                maxLength={80}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Senha
              </label>
              <input
                type="password"
                className="field"
                placeholder="minimo de 6 caracteres"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                autoComplete="new-password"
                disabled={submitting}
                minLength={6}
                maxLength={128}
                required
              />
            </div>

            {error ? (
              <div className="rounded-3xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <button type="submit" className="button-primary w-full" disabled={submitting}>
              {submitting ? "Criando conta..." : "Criar conta"}
            </button>

            <p className="text-center text-sm text-muted">
              Ja tem uma conta?{" "}
              <Link className="font-semibold text-accent transition hover:text-ink" to="/login">
                Entrar
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
