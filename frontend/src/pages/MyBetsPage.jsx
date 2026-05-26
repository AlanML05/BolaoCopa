import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";

import { MatchBetCard } from "../components/MatchBetCard";
import { StatCard } from "../components/StatCard";
import { createBatchBets, createBet, getMyBetsOverview, updateBet } from "../services/api";
import { formatDateTime, formatScore } from "../services/formatters";

const EMPTY_MATCHES = [];
const LOCK_WINDOW_MS = 30 * 60 * 1000;
const RECEIPT_BETS_PER_PAGE = 20;
const PLACEHOLDER_TEAM_TERMS = ["grupo", "jogo", "vencedor", "perdedor"];
const HISTORY_PHASE_ALL = "Todas as Fases";
const HISTORY_PHASE_OPTIONS = [HISTORY_PHASE_ALL, "Fase de Grupos", "Fase Mata-Mata"];
const GROUP_SUB_PHASE_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  `Grupo ${String.fromCharCode(65 + index)}`,
);
const KNOCKOUT_SUB_PHASE_OPTIONS = [
  "16-avos de final",
  "Oitavas de final",
  "Quartas de final",
  "Semifinal",
  "Disputa do 3º Lugar",
  "Final",
];

function createSubmittedBetForms(bets) {
  return bets.reduce((accumulator, bet) => {
    accumulator[bet.bet_id] = {
      homeScore: String(bet.predicted_home_score),
      awayScore: String(bet.predicted_away_score),
    };
    return accumulator;
  }, {});
}

function getOriginalBetForm(match) {
  return {
    homeScore:
      match?.existing_bet?.predicted_home_score === undefined ||
      match?.existing_bet?.predicted_home_score === null
        ? ""
        : String(match.existing_bet.predicted_home_score),
    awayScore:
      match?.existing_bet?.predicted_away_score === undefined ||
      match?.existing_bet?.predicted_away_score === null
        ? ""
        : String(match.existing_bet.predicted_away_score),
  };
}

function hasDraftChanges(match, draft) {
  if (!match || !draft) {
    return false;
  }

  const original = getOriginalBetForm(match);
  return (
    String(draft.homeScore ?? "") !== original.homeScore ||
    String(draft.awayScore ?? "") !== original.awayScore
  );
}

function parseDraftScores(draft) {
  const hasBlankScore = draft?.homeScore === "" || draft?.awayScore === "";
  const homeScore = Number(draft?.homeScore);
  const awayScore = Number(draft?.awayScore);

  if (
    hasBlankScore ||
    Number.isNaN(homeScore) ||
    Number.isNaN(awayScore) ||
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 20 ||
    awayScore > 20
  ) {
    return null;
  }

  return { homeScore, awayScore };
}

function getMatchDateKey(match) {
  const datePart = match.kickoff_at?.slice(0, 10);
  return datePart || "sem-data";
}

function formatDateLabel(dateKey) {
  if (dateKey === "sem-data") {
    return "Sem data definida";
  }

  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

function getSubPhaseLabel(match) {
  return match.sub_phase || match.stage || match.group || match.grupo || "Sem sub-fase";
}

function getTournamentPhaseLabel(match) {
  return match.tournament_phase || (match.phase === "knockout" ? "Fase Mata-Mata" : "Fase de Grupos");
}

function hasPlaceholderTeam(match) {
  return [match.home_team, match.away_team].some((teamName) =>
    PLACEHOLDER_TEAM_TERMS.some((term) => String(teamName ?? "").toLowerCase().includes(term)),
  );
}

function isBetEditable(match, currentTime) {
  const kickoffTime = Date.parse(match.kickoff_at);
  const closedByClientClock =
    Number.isFinite(kickoffTime) && kickoffTime - currentTime <= LOCK_WINDOW_MS;
  const isScheduled = match.status === "scheduled";

  return (
    isScheduled &&
    Number.isFinite(kickoffTime) &&
    !closedByClientClock &&
    !hasPlaceholderTeam(match)
  );
}

function isBlankScore(value) {
  return value === null || value === undefined || value === "";
}

function hasIncompleteBet(match) {
  const existingBet = match.existing_bet;

  return (
    !existingBet ||
    isBlankScore(existingBet.predicted_home_score) ||
    isBlankScore(existingBet.predicted_away_score)
  );
}

function getSortableKickoff(match) {
  const kickoffTime = Date.parse(match.kickoff_at);
  return Number.isFinite(kickoffTime) ? kickoffTime : Number.MAX_SAFE_INTEGER;
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\uFE0E\uFE0F\u200D]/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncatePdfText(doc, text, maxWidth) {
  const safeText = sanitizePdfText(text);

  if (doc.getTextWidth(safeText) <= maxWidth) {
    return safeText;
  }

  let truncated = safeText;

  while (truncated.length > 3 && doc.getTextWidth(`${truncated}...`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated}...`;
}

export function MyBetsPage({ sessionUser }) {
  const location = useLocation();
  const [overview, setOverview] = useState(null);
  const [draftBets, setDraftBets] = useState({});
  const [editForms, setEditForms] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [selectedHistoryPhase, setSelectedHistoryPhase] = useState(HISTORY_PHASE_ALL);
  const [selectedHistorySubPhase, setSelectedHistorySubPhase] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [savingAllDrafts, setSavingAllDrafts] = useState(false);
  const [editingBetId, setEditingBetId] = useState("");
  const [savingBetId, setSavingBetId] = useState("");
  const [exportingReceipt, setExportingReceipt] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const payload = await getMyBetsOverview(sessionUser.accessToken);
        if (!active) {
          return;
        }

        setOverview(payload);
        setDraftBets({});
        setEditForms(createSubmittedBetForms(payload.submitted_bets));
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

    loadOverview();

    return () => {
      active = false;
    };
  }, [sessionUser.accessToken]);

  useEffect(() => {
    if (loading || location.hash !== "#historico-secao") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      document
        .getElementById("historico-secao")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [loading, location.hash, overview]);

  const upcomingMatches = overview?.upcoming_matches ?? EMPTY_MATCHES;
  const matchesById = useMemo(() => {
    return upcomingMatches.reduce((accumulator, match) => {
      accumulator[match.id] = match;
      return accumulator;
    }, {});
  }, [upcomingMatches]);
  const dateOptions = useMemo(() => {
    return Array.from(new Set(upcomingMatches.map(getMatchDateKey))).sort((first, second) =>
      first.localeCompare(second, "pt-BR", { numeric: true }),
    );
  }, [upcomingMatches]);
  const visibleMatches = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return upcomingMatches
      .filter((match) => getMatchDateKey(match) === selectedDate)
      .sort((firstMatch, secondMatch) => {
        const kickoffDifference =
          getSortableKickoff(firstMatch) - getSortableKickoff(secondMatch);

        if (kickoffDifference !== 0) {
          return kickoffDifference;
        }

        return getSubPhaseLabel(firstMatch).localeCompare(getSubPhaseLabel(secondMatch), "pt-BR", {
          numeric: true,
        });
      });
  }, [selectedDate, upcomingMatches]);
  const pendingMatches = useMemo(() => {
    return upcomingMatches
      .filter((match) => hasIncompleteBet(match) && isBetEditable(match, currentTime))
      .sort((firstMatch, secondMatch) => {
        const kickoffDifference =
          getSortableKickoff(firstMatch) - getSortableKickoff(secondMatch);

        if (kickoffDifference !== 0) {
          return kickoffDifference;
        }

        const firstGroupLabel = getSubPhaseLabel(firstMatch);
        const secondGroupLabel = getSubPhaseLabel(secondMatch);

        return firstGroupLabel.localeCompare(secondGroupLabel, "pt-BR", { numeric: true });
      });
  }, [currentTime, upcomingMatches]);
  const historySubPhaseOptions = useMemo(() => {
    if (selectedHistoryPhase === "Fase de Grupos") {
      return GROUP_SUB_PHASE_OPTIONS;
    }

    if (selectedHistoryPhase === "Fase Mata-Mata") {
      return KNOCKOUT_SUB_PHASE_OPTIONS;
    }

    return [];
  }, [selectedHistoryPhase]);
  const filteredSubmittedBets = useMemo(() => {
    const submittedBets = overview?.submitted_bets ?? [];

    return submittedBets.filter((bet) => {
      const matchPhase = getTournamentPhaseLabel(bet.match);
      const matchSubPhase = getSubPhaseLabel(bet.match);
      const phaseMatches =
        selectedHistoryPhase === HISTORY_PHASE_ALL || matchPhase === selectedHistoryPhase;
      const subPhaseMatches =
        !selectedHistorySubPhase || matchSubPhase === selectedHistorySubPhase;

      return phaseMatches && subPhaseMatches;
    });
  }, [overview?.submitted_bets, selectedHistoryPhase, selectedHistorySubPhase]);
  const draftCount = Object.entries(draftBets).filter(([matchId, draft]) =>
    hasDraftChanges(matchesById[matchId], draft),
  ).length;

  useEffect(() => {
    if (selectedDate && !dateOptions.includes(selectedDate)) {
      setSelectedDate("");
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    setSelectedHistorySubPhase("");
  }, [selectedHistoryPhase]);

  useEffect(() => {
    if (
      selectedHistorySubPhase &&
      !historySubPhaseOptions.includes(selectedHistorySubPhase)
    ) {
      setSelectedHistorySubPhase("");
    }
  }, [historySubPhaseOptions, selectedHistorySubPhase]);

  function getMatchFormState(match) {
    return draftBets[match.id] ?? getOriginalBetForm(match);
  }

  function handleDraftFieldChange(matchId, field, value) {
    const match = matchesById[matchId];

    setDraftBets((current) => {
      const nextDraft = {
        ...getOriginalBetForm(match),
        ...(current[matchId] ?? {}),
        [field]: value,
      };

      if (!hasDraftChanges(match, nextDraft)) {
        const nextDrafts = { ...current };
        delete nextDrafts[matchId];
        return nextDrafts;
      }

      return {
        ...current,
        [matchId]: nextDraft,
      };
    });
  }

  async function handleSubmit(matchId) {
    const match = matchesById[matchId];
    const form = getMatchFormState(match);
    const parsedScores = parseDraftScores(form);

    if (!parsedScores) {
      setNotice("Preencha os dois placares antes de salvar.");
      return;
    }

    setSavingMatchId(matchId);
    setNotice("");
    setError("");

    try {
      const response = await createBet(sessionUser.accessToken, {
        match_id: matchId,
        predicted_home_score: parsedScores.homeScore,
        predicted_away_score: parsedScores.awayScore,
      });
      const refreshed = await getMyBetsOverview(sessionUser.accessToken);
      setOverview(refreshed);
      setEditForms(createSubmittedBetForms(refreshed.submitted_bets));
      setDraftBets((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[matchId];
        return nextDrafts;
      });
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingMatchId("");
    }
  }

  async function handleSubmitAllDrafts() {
    const draftEntries = Object.entries(draftBets).filter(([matchId, draft]) =>
      hasDraftChanges(matchesById[matchId], draft),
    );

    if (draftEntries.length === 0) {
      return;
    }

    const invalidDraft = draftEntries.find(([, draft]) => parseDraftScores(draft) === null);
    if (invalidDraft) {
      setNotice("Preencha os dois placares em todos os jogos pendentes antes de salvar em lote.");
      return;
    }

    const batchPayload = draftEntries.map(([matchId, draft]) => {
      const parsedScores = parseDraftScores(draft);
      return {
        match_id: matchId,
        home_score: parsedScores.homeScore,
        away_score: parsedScores.awayScore,
      };
    });

    setSavingAllDrafts(true);
    setNotice("");
    setError("");

    try {
      const response = await createBatchBets(sessionUser.accessToken, batchPayload);
      const refreshed = await getMyBetsOverview(sessionUser.accessToken);
      setOverview(refreshed);
      setEditForms(createSubmittedBetForms(refreshed.submitted_bets));
      setDraftBets({});
      setNotice(
        response.skipped_count
          ? `${response.message} ${response.skipped_count} jogo(s) foram ignorados por bloqueio.`
          : response.message,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingAllDrafts(false);
    }
  }

  function handleEditFieldChange(betId, field, value) {
    setEditForms((current) => ({
      ...current,
      [betId]: {
        ...current[betId],
        [field]: value,
      },
    }));
  }

  function handleEditStart(bet) {
    setEditingBetId(bet.bet_id);
    setEditForms((current) => ({
      ...current,
      [bet.bet_id]: {
        homeScore: String(bet.predicted_home_score),
        awayScore: String(bet.predicted_away_score),
      },
    }));
    setNotice("");
    setError("");
  }

  function handleEditCancel(bet) {
    setEditingBetId("");
    setEditForms((current) => ({
      ...current,
      [bet.bet_id]: {
        homeScore: String(bet.predicted_home_score),
        awayScore: String(bet.predicted_away_score),
      },
    }));
  }

  async function handleEditSubmit(bet) {
    const form = editForms[bet.bet_id];
    const hasBlankScore = form?.homeScore === "" || form?.awayScore === "";
    const homeScore = Number(form?.homeScore);
    const awayScore = Number(form?.awayScore);

    if (hasBlankScore || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setNotice("Preencha os dois placares antes de salvar a edicao.");
      return;
    }

    setSavingBetId(bet.bet_id);
    setNotice("");
    setError("");

    try {
      const response = await updateBet(sessionUser.accessToken, bet.bet_id, {
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      });
      const refreshed = await getMyBetsOverview(sessionUser.accessToken);
      setOverview(refreshed);
      setEditForms(createSubmittedBetForms(refreshed.submitted_bets));
      setEditingBetId("");
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingBetId("");
    }
  }

  async function handleReceiptExport() {
    const submittedBets = overview?.submitted_bets ?? [];

    if (submittedBets.length === 0) {
      return;
    }

    setExportingReceipt(true);
    setNotice("");
    setError("");

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const userName = sanitizePdfText(overview.user.name || sessionUser.name || "Participante");

      function drawPageBackground() {
        doc.setFillColor(2, 6, 23);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(margin, 10, contentWidth, pageHeight - 20, 4, 4, "F");
      }

      function drawHeader(pageNumber) {
        doc.setFont("helvetica", "bold");

        if (pageNumber === 1) {
          doc.setFillColor(8, 47, 73);
          doc.roundedRect(margin + 5, 16, contentWidth - 10, 31, 4, 4, "F");
          doc.setTextColor(250, 204, 21);
          doc.setFontSize(17);
          doc.text("Meus Palpites - Bolao OST", margin + 10, 28);
          doc.setTextColor(226, 232, 240);
          doc.setFontSize(11);
          doc.text(userName, margin + 10, 38);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(8);
          doc.text("20 jogos por folha, em ordem de registro.", margin + 10, 43);
          return 61;
        }

        doc.setTextColor(125, 211, 252);
        doc.setFontSize(12);
        doc.text(`Meus Palpites - Pagina ${pageNumber}`, margin + 6, 25);
        return 39;
      }

      drawPageBackground();
      let currentPage = 1;
      let startY = drawHeader(currentPage);

      submittedBets.forEach((bet, index) => {
        if (index > 0 && index % RECEIPT_BETS_PER_PAGE === 0) {
          doc.addPage();
          currentPage += 1;
          drawPageBackground();
          startY = drawHeader(currentPage);
        }

        const rowIndex = index % RECEIPT_BETS_PER_PAGE;
        const rowY = startY + rowIndex * 11.3;
        const match = bet.match ?? {};
        const matchLine = `${index + 1}. ${match.home_team ?? "Time da casa"} ${
          bet.predicted_home_score
        } x ${bet.predicted_away_score} ${match.away_team ?? "Time visitante"}`;
        const phaseLine = `${getTournamentPhaseLabel(match)} - ${getSubPhaseLabel(match)}`;
        const dateLine = `Data do jogo: ${formatDateTime(match.kickoff_at)}`;

        doc.setFillColor(
          rowIndex % 2 === 0 ? 30 : 15,
          rowIndex % 2 === 0 ? 41 : 23,
          rowIndex % 2 === 0 ? 59 : 42,
        );
        doc.roundedRect(margin + 5, rowY - 6, contentWidth - 10, 10.8, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.8);
        doc.setTextColor(248, 250, 252);
        doc.text(
          truncatePdfText(doc, matchLine, contentWidth - 22),
          margin + 9,
          rowY - 2.8,
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(148, 163, 184);
        doc.text(
          truncatePdfText(doc, phaseLine, contentWidth - 22),
          margin + 9,
          rowY + 0.8,
        );
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          truncatePdfText(doc, dateLine, contentWidth - 22),
          margin + 9,
          rowY + 4.2,
        );
      });

      const totalPages = doc.getNumberOfPages();

      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Pagina ${page} de ${totalPages}`, pageWidth / 2, pageHeight - 8, {
          align: "center",
        });
      }

      doc.save("meus-palpites-ost.pdf");
      setNotice("Comprovante em PDF gerado com sucesso.");
    } catch {
      setError("Nao foi possivel gerar o PDF de palpites.");
    } finally {
      setExportingReceipt(false);
    }
  }

  if (loading) {
    return (
      <section className="panel flex min-h-[320px] items-center justify-center px-6 py-8">
        <p className="text-sm tracking-[0.18em] text-muted">Carregando painel de palpites...</p>
      </section>
    );
  }

  if (error && !overview) {
    return (
      <section className="panel px-6 py-8">
        <p className="text-sm font-semibold text-danger">Nao foi possivel carregar a tela.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <p className="eyebrow">Area do participante</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="headline">Meus Palpites</h2>
            <p className="mt-3 inline-block rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
              Escolha o dia do jogo para consultar as partidas e registrar seus palpites.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="data-pill">Usuario: {overview.user.name}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jogos cadastrados"
          value={overview.summary.upcoming_matches}
          caption="Partidas carregadas para acompanhamento e envio de palpite."
          tone="accent"
        />
        <StatCard
          label="Palpites cadastrados"
          value={overview.summary.registered_upcoming_bets}
          caption="Jogos futuros que ja possuem um palpite seu."
          tone="success"
        />
        <StatCard
          label="Ainda disponiveis"
          value={overview.summary.open_matches_without_bet}
          caption="Partidas futuras que seguem liberadas para sua primeira aposta."
          tone="warning"
        />
        <StatCard
          label="Bloqueio"
          value={`${overview.metadata?.bet_lock_minutes ?? 30} min`}
          caption="Palpites encerram antes do inicio de cada partida."
        />
      </section>

      {notice ? (
        <section className="panel border-success/20 bg-success/5 px-5 py-4 text-sm text-success">
          {notice}
        </section>
      ) : null}

      {error ? (
        <section className="panel border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">
          {error}
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Palpites</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Escolha os jogos
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
              {showOnlyPending
                ? "Mostrando todos os jogos abertos que ainda precisam de palpite."
                : "Os jogos aparecem depois que voce selecionar uma data."}
            </p>
            <button
              type="button"
              aria-pressed={showOnlyPending}
              className={`rounded-2xl border px-4 py-2 text-sm font-bold text-black shadow-[0_0_15px_rgba(234,179,8,0.6)] transition-all duration-300 hover:scale-105 ${
                showOnlyPending
                  ? "border-yellow-300 bg-yellow-400"
                  : "border-yellow-500 bg-yellow-500 hover:bg-yellow-400"
              }`}
              onClick={() => setShowOnlyPending((current) => !current)}
            >
              ⚽ Ver Jogos Pendentes
            </button>
          </div>
        </div>

        <div className="panel px-5 py-5">
          {showOnlyPending ? (
            <div className="mb-5 rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm font-medium text-gray-100 shadow-sm">
              Modo pendentes ativo: a data fica pausada enquanto buscamos todos os jogos
              cadastrados, abertos e sem palpite salvo.
            </div>
          ) : null}

          <div className={`grid gap-4 md:max-w-md ${showOnlyPending ? "opacity-55" : ""}`}>
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Dia do jogo
              <select
                className="field mt-2"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                disabled={showOnlyPending}
              >
                <option value="">Selecione uma data</option>
                {dateOptions.map((dateKey) => (
                  <option key={dateKey} value={dateKey}>
                    {formatDateLabel(dateKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {showOnlyPending ? (
          pendingMatches.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {pendingMatches.map((match) => (
                <MatchBetCard
                  key={match.id}
                  match={match}
                  formState={getMatchFormState(match)}
                  currentTime={currentTime}
                  submitting={savingMatchId === match.id || savingAllDrafts}
                  hasDraftChanges={hasDraftChanges(match, draftBets[match.id])}
                  onFieldChange={handleDraftFieldChange}
                  onSubmit={handleSubmit}
                />
              ))}
            </div>
          ) : (
            <section className="panel border-success/20 bg-success/5 px-6 py-8">
              <p className="text-sm font-semibold text-success">
                🎉 Tudo certo por aqui! Você já palpitou em todos os jogos disponíveis.
              </p>
            </section>
          )
        ) : upcomingMatches.length === 0 ? (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Nenhuma partida disponivel.</p>
            <p className="mt-2 inline-block rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
              Quando partidas forem cadastradas, elas aparecerao aqui.
            </p>
          </section>
        ) : !selectedDate ? (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Selecione uma data.</p>
            <p className="mt-2 inline-block rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
              Use o filtro acima para carregar todos os jogos daquele dia.
            </p>
          </section>
        ) : visibleMatches.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {visibleMatches.map((match) => (
              <MatchBetCard
                key={match.id}
                match={match}
                formState={getMatchFormState(match)}
                currentTime={currentTime}
                submitting={savingMatchId === match.id || savingAllDrafts}
                hasDraftChanges={hasDraftChanges(match, draftBets[match.id])}
                onFieldChange={handleDraftFieldChange}
                onSubmit={handleSubmit}
              />
            ))}
          </div>
        ) : (
          <section className="panel px-6 py-8">
            <p className="text-sm font-semibold text-ink">Nenhuma partida neste filtro.</p>
            <p className="mt-2 inline-block rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
              Escolha outra data para consultar os jogos disponiveis.
            </p>
          </section>
        )}
      </section>

      <section className="space-y-4">
        <div
          id="historico-secao"
          className="scroll-mt-28 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p className="eyebrow">Historico</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Palpites ja registrados
            </h3>
            <p className="mt-3 w-fit rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
              💡 Dica: É aqui que você pode editar e alterar os placares dos seus palpites já salvos.
            </p>
          </div>
          <div className="flex max-w-xl flex-col gap-3">
            <p className="rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
              Filtre seus palpites salvos para encontrar rapidamente um jogo e editar enquanto ainda
              estiver liberado.
            </p>
            <button
              type="button"
              className="w-fit rounded-md border-2 border-yellow-500 bg-transparent px-4 py-2 text-sm font-bold text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)] transition-colors hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-transparent"
              onClick={handleReceiptExport}
              disabled={exportingReceipt || overview.submitted_bets.length === 0}
            >
              {exportingReceipt ? "Gerando PDF..." : "Baixar Meu Comprovante em PDF"}
            </button>
          </div>
        </div>

        <div className="panel px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Fase
              <select
                className="field mt-2"
                value={selectedHistoryPhase}
                onChange={(event) => setSelectedHistoryPhase(event.target.value)}
              >
                {HISTORY_PHASE_OPTIONS.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Sub-fase
              <select
                className="field mt-2"
                value={selectedHistorySubPhase}
                onChange={(event) => setSelectedHistorySubPhase(event.target.value)}
                disabled={selectedHistoryPhase === HISTORY_PHASE_ALL}
              >
                <option value="">
                  {selectedHistoryPhase === HISTORY_PHASE_ALL
                    ? "Selecione uma fase primeiro"
                    : "Todas as sub-fases"}
                </option>
                {historySubPhaseOptions.map((subPhase) => (
                  <option key={subPhase} value={subPhase}>
                    {subPhase}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredSubmittedBets.map((bet) => {
            const editable = isBetEditable(bet.match, currentTime);
            const isEditing = editingBetId === bet.bet_id;
            const editForm = editForms[bet.bet_id] ?? {
              homeScore: String(bet.predicted_home_score),
              awayScore: String(bet.predicted_away_score),
            };

            return (
              <article key={bet.bet_id} className="panel px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="inline-flex rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-100 shadow-sm">
                      {bet.match.stage}
                    </p>
                    <h4 className="mt-2 font-display text-xl font-semibold text-ink">
                      {bet.match.label}
                    </h4>
                    <p className="mt-2 inline-flex rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
                      {formatDateTime(bet.match.kickoff_at)} - {bet.match.stadium}
                    </p>
                  </div>
                  <span
                    className={`data-pill ${
                      bet.match.status === "finished"
                        ? "border-warning/20 text-warning"
                        : "border-accent/20 text-accent"
                    }`}
                  >
                    {bet.match.status === "finished" ? "Encerrado" : "Agendado"}
                  </span>
                </div>

                {isEditing ? (
                  <form
                    className="mt-6 space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleEditSubmit(bet);
                    }}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <label className="text-xs uppercase tracking-[0.22em] text-muted">
                        {bet.match.home_team}
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="field mt-2 text-center text-xl font-semibold"
                          value={editForm.homeScore}
                          onChange={(event) =>
                            handleEditFieldChange(bet.bet_id, "homeScore", event.target.value)
                          }
                          disabled={savingBetId === bet.bet_id}
                        />
                      </label>

                      <span className="pt-7 text-center text-2xl font-semibold text-muted">x</span>

                      <label className="text-xs uppercase tracking-[0.22em] text-muted">
                        {bet.match.away_team}
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="field mt-2 text-center text-xl font-semibold"
                          value={editForm.awayScore}
                          onChange={(event) =>
                            handleEditFieldChange(bet.bet_id, "awayScore", event.target.value)
                          }
                          disabled={savingBetId === bet.bet_id}
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        className="button-primary flex-1"
                        disabled={savingBetId === bet.bet_id}
                      >
                        {savingBetId === bet.bet_id ? "Salvando..." : "Salvar edicao"}
                      </button>
                      <button
                        type="button"
                        className="button-secondary flex-1"
                        onClick={() => handleEditCancel(bet)}
                        disabled={savingBetId === bet.bet_id}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl border border-line/80 bg-canvas/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted">
                          Seu palpite
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-ink">
                          {bet.predicted_home_score} x {bet.predicted_away_score}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-line/80 bg-canvas/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted">Resultado</p>
                        <p className="mt-3 text-2xl font-semibold text-ink">
                          {formatScore(bet.match.home_score, bet.match.away_score)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
                        Registrado em {formatDateTime(bet.created_at)}.
                      </p>
                      {editable ? (
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => handleEditStart(bet)}
                        >
                          Editar palpite
                        </button>
                      ) : (
                        <span className="data-pill border-warning/20 text-warning">
                          Edicao bloqueada
                        </span>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })}

          {overview.submitted_bets.length === 0 ? (
            <section className="panel px-6 py-8">
              <p className="text-sm font-semibold text-ink">Nenhum palpite registrado.</p>
              <p className="mt-2 inline-block rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
                Assim que voce salvar seus primeiros palpites, eles aparecerao aqui.
              </p>
            </section>
          ) : filteredSubmittedBets.length === 0 ? (
            <section className="panel px-6 py-8">
              <p className="text-sm font-semibold text-ink">Nenhum palpite neste filtro.</p>
              <p className="mt-2 inline-block rounded-md border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-100 shadow-sm">
                Ajuste a fase ou sub-fase para localizar outros palpites registrados.
              </p>
            </section>
          ) : null}
        </div>
      </section>
      {draftCount > 0 ? (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-50 animate-pulse rounded-full border border-yellow-300/70 bg-yellow-500 px-5 py-4 text-sm font-bold text-black shadow-[0_0_15px_rgba(234,179,8,0.6)] transition-all duration-300 hover:scale-105 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:animate-none disabled:opacity-60"
          onClick={handleSubmitAllDrafts}
          disabled={savingAllDrafts}
        >
          {savingAllDrafts
            ? "Salvando pendentes..."
            : `💾 Salvar Todos Pendentes (${draftCount})`}
        </button>
      ) : null}
    </div>
  );
}
