import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  deleteUserByEmail,
  getAdminDashboard,
  updatePaymentStatus,
} from "../services/api";
import { formatDateTime } from "../services/formatters";

export function AdminUsersPage({ sessionUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [deletingUserEmail, setDeletingUserEmail] = useState("");
  const [userPendingRemoval, setUserPendingRemoval] = useState(null);
  const [showPaidPoolOnly, setShowPaidPoolOnly] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const payload = await getAdminDashboard(sessionUser.accessToken);
        if (active) {
          setDashboard(payload);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [sessionUser.accessToken]);

  async function handleUserFinancialStatusChange(user, updates) {
    setBusyUserId(user.id);
    setError("");
    setNotice("");

    const nextPayload = {
      is_paid_pool: user.is_paid_pool,
      paid: user.paid,
      ...updates,
    };

    if (!nextPayload.is_paid_pool) {
      nextPayload.paid = false;
    }

    try {
      const response = await updatePaymentStatus(sessionUser.accessToken, user.id, nextPayload);
      setDashboard(response.dashboard);
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyUserId("");
    }
  }

  function handleUserDeleteRequest(user) {
    setUserPendingRemoval(user);
    setError("");
    setNotice("");
  }

  function handleUserDeleteCancel() {
    if (deletingUserEmail) {
      return;
    }

    setUserPendingRemoval(null);
  }

  async function handleUserDeleteConfirm() {
    if (!userPendingRemoval?.email) {
      return;
    }

    setDeletingUserEmail(userPendingRemoval.email);
    setError("");
    setNotice("");

    try {
      const response = await deleteUserByEmail(sessionUser.accessToken, userPendingRemoval.email);
      setDashboard(response.dashboard);
      setNotice(response.message);
      setUserPendingRemoval(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingUserEmail("");
    }
  }

  const managedUsers = useMemo(
    () =>
      [...(dashboard?.users ?? [])].sort((first, second) =>
        first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" }),
      ),
    [dashboard?.users],
  );

  const financialUsers = useMemo(
    () =>
      showPaidPoolOnly
        ? managedUsers.filter((user) => user.is_paid_pool)
        : managedUsers,
    [managedUsers, showPaidPoolOnly],
  );

  if (loading) {
    return (
      <section className="panel flex min-h-[320px] items-center justify-center px-6 py-8">
        <p className="text-sm tracking-[0.18em] text-muted">Carregando participantes...</p>
      </section>
    );
  }

  if (error && !dashboard) {
    return (
      <section className="panel px-6 py-8">
        <p className="text-sm font-semibold text-danger">Nao foi possivel carregar participantes.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="panel border-warning/10 px-6 py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Participantes</p>
            <h2 className="headline mt-4">Gerenciar participantes</h2>
            <p className="subtle-copy mt-3">
              Remova cadastros, libere emojis e controle a participacao no Bolao Pago em uma tela
              dedicada.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="data-pill">
              Atualizado em {formatDateTime(dashboard.generated_at)}
            </span>
            <Link to="/admin/ranking" className="button-secondary">
              Voltar ao painel
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="panel border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">
          {error}
        </section>
      ) : null}

      {notice ? (
        <section className="panel border-success/20 bg-success/5 px-5 py-4 text-sm text-success">
          {notice}
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Usuarios</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
            Lista de participantes
          </h3>
          <p className="mt-2 text-sm text-muted">
            Ao remover um cadastro, o emoji escolhido fica disponivel novamente para novos
            participantes.
          </p>
        </div>

        <div className="panel overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-max divide-y divide-line/80 text-sm">
              <thead className="bg-canvas/65">
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                  <th className="whitespace-nowrap px-4 py-4 font-medium">Nome</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">E-mail</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">Emoji</th>
                  <th className="whitespace-nowrap px-4 py-4 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {managedUsers.map((user) => (
                  <tr key={user.id} className="bg-panel/40 text-sm">
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-ink">{user.name}</span>
                        <span className="text-xs text-muted">@{user.username}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{user.email}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-canvas/80 text-2xl">
                        {user.emoji || "?"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <button
                        type="button"
                        className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition hover:border-danger/70 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleUserDeleteRequest(user)}
                        disabled={deletingUserEmail === user.email || !user.email}
                        aria-label={`Remover usuario ${user.email}`}
                      >
                        {deletingUserEmail === user.email ? "Removendo..." : "Remover"}
                      </button>
                    </td>
                  </tr>
                ))}

                {managedUsers.length === 0 ? (
                  <tr className="bg-panel/40 text-sm text-muted">
                    <td className="whitespace-nowrap px-4 py-5" colSpan={4}>
                      Nenhum participante cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Financeiro</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Controle do Bolao Pago
            </h3>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-canvas/70 px-4 py-3 text-sm text-ink">
            <span>Mostrar apenas participantes</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-sky-300"
              checked={showPaidPoolOnly}
              onChange={(event) => setShowPaidPoolOnly(event.target.checked)}
            />
          </label>
        </div>

        <div className="space-y-3">
          {financialUsers.map((user) => (
            <article
              key={user.id}
              className="panel space-y-4 px-5 py-4 transition hover:border-accent/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{user.name}</p>
                  <p className="mt-1 text-sm text-muted">{user.department || user.username}</p>
                </div>
                <span
                  className={`data-pill ${
                    user.is_paid_pool ? "border-accent/20 text-accent" : "text-muted"
                  }`}
                >
                  {user.is_paid_pool ? "No Bolao Pago" : "Ranking Geral"}
                </span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-line/80 bg-canvas/70 px-4 py-3 text-sm text-ink">
                  <span>Participa do Bolao Pago?</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-sky-300"
                    checked={Boolean(user.is_paid_pool)}
                    disabled={busyUserId === user.id}
                    onChange={(event) =>
                      handleUserFinancialStatusChange(user, {
                        is_paid_pool: event.target.checked,
                        paid: event.target.checked ? user.paid : false,
                      })
                    }
                  />
                </label>

                {user.is_paid_pool ? (
                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-line/80 bg-canvas/70 px-4 py-3 text-sm text-ink">
                    <span>Pagamento Realizado?</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-sky-300"
                      checked={Boolean(user.paid)}
                      disabled={busyUserId === user.id}
                      onChange={(event) =>
                        handleUserFinancialStatusChange(user, {
                          paid: event.target.checked,
                        })
                      }
                    />
                  </label>
                ) : null}
              </div>
            </article>
          ))}

          {financialUsers.length === 0 ? (
            <section className="panel px-5 py-5">
              <p className="text-sm font-semibold text-ink">
                Nenhum participante no filtro atual.
              </p>
              <p className="mt-2 text-sm text-muted">
                Marque usuarios como participantes do Bolao Pago para eles aparecerem aqui.
              </p>
            </section>
          ) : null}
        </div>
      </section>

      {userPendingRemoval ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <section className="panel-strong w-full max-w-lg border-danger/25 px-6 py-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-2xl">
                {userPendingRemoval.emoji || "!"}
              </span>
              <div>
                <p className="eyebrow text-danger/80">Confirmar remocao</p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                  Remover participante?
                </h3>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-muted">
              Tem certeza que deseja remover o usuario{" "}
              <span className="font-semibold text-ink">{userPendingRemoval.email}</span>? Esta
              acao e irreversivel e liberara seu emoji para outros participantes.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="button-secondary"
                onClick={handleUserDeleteCancel}
                disabled={Boolean(deletingUserEmail)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-danger/50 bg-danger/15 px-4 py-3 text-sm font-semibold text-danger transition hover:border-danger/80 hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleUserDeleteConfirm}
                disabled={Boolean(deletingUserEmail)}
              >
                {deletingUserEmail ? "Removendo..." : "Sim, Remover"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
