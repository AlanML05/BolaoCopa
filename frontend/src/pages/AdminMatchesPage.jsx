import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { MatchManager } from "../components/MatchManager";
import { MatchResultManager } from "../components/MatchResultManager";
import {
  deleteMatch,
  getAdminDashboard,
  updateMatch,
  updateMatchResult,
} from "../services/api";
import { formatDateTime } from "../services/formatters";

function createResultForms(matches) {
  return matches.reduce((accumulator, match) => {
    accumulator[match.id] = {
      homeScore:
        match.home_score === null || match.home_score === undefined ? "" : String(match.home_score),
      awayScore:
        match.away_score === null || match.away_score === undefined ? "" : String(match.away_score),
    };
    return accumulator;
  }, {});
}

export function AdminMatchesPage({ sessionUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [resultForms, setResultForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyMatchId, setBusyMatchId] = useState("");
  const [deletingMatchId, setDeletingMatchId] = useState("");
  const [updatingMatchId, setUpdatingMatchId] = useState("");

  function syncDashboard(nextDashboard) {
    setDashboard(nextDashboard);
    setResultForms(createResultForms(nextDashboard.matches));
  }

  async function refreshDashboard() {
    const payload = await getAdminDashboard(sessionUser.accessToken);
    syncDashboard(payload);
    return payload;
  }

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const payload = await getAdminDashboard(sessionUser.accessToken);
        if (active) {
          syncDashboard(payload);
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

  function handleResultFieldChange(matchId, field, value) {
    setResultForms((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [field]: value,
      },
    }));
  }

  async function handleMatchResultSave(matchId) {
    const form = resultForms[matchId];
    const hasBlankScore = form?.homeScore === "" || form?.awayScore === "";
    const homeScore = Number(form?.homeScore);
    const awayScore = Number(form?.awayScore);

    if (hasBlankScore || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setError("Preencha os dois placares reais antes de salvar.");
      setNotice("");
      return;
    }

    setBusyMatchId(matchId);
    setError("");
    setNotice("");

    try {
      const response = await updateMatchResult(sessionUser.accessToken, matchId, {
        home_score: homeScore,
        away_score: awayScore,
      });
      await refreshDashboard();
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyMatchId("");
    }
  }

  async function handleMatchDelete(matchId) {
    setDeletingMatchId(matchId);
    setError("");
    setNotice("");

    try {
      const response = await deleteMatch(sessionUser.accessToken, matchId);
      syncDashboard(response.dashboard);
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingMatchId("");
    }
  }

  async function handleMatchUpdate(matchId, matchPayload) {
    setUpdatingMatchId(matchId);
    setError("");
    setNotice("");

    try {
      const response = await updateMatch(sessionUser.accessToken, matchId, matchPayload);
      syncDashboard(response.dashboard);
      setNotice(response.message);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setUpdatingMatchId("");
    }
  }

  if (loading) {
    return (
      <section className="panel flex min-h-[320px] items-center justify-center px-6 py-8">
        <p className="text-sm tracking-[0.18em] text-muted">Carregando jogos...</p>
      </section>
    );
  }

  if (error && !dashboard) {
    return (
      <section className="panel px-6 py-8">
        <p className="text-sm font-semibold text-danger">Nao foi possivel carregar os jogos.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Partidas</p>
            <h2 className="headline mt-4">Gerenciar jogos</h2>
            <p className="subtle-copy mt-3">
              Edite dados dos confrontos e lance os placares oficiais sem poluir a tela principal.
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

      <MatchManager
        matches={dashboard.matches}
        deletingMatchId={deletingMatchId}
        updatingMatchId={updatingMatchId}
        onUpdate={handleMatchUpdate}
        onDelete={handleMatchDelete}
      />

      <MatchResultManager
        matches={dashboard.matches}
        forms={resultForms}
        busyMatchId={busyMatchId}
        onFieldChange={handleResultFieldChange}
        onSave={handleMatchResultSave}
      />
    </div>
  );
}
