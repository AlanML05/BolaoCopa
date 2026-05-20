const placeholderTerms = ["grupo", "jogo", "vencedor", "perdedor"];

const flagMap = {
  "Brasil": "br",
  "Argentina": "ar",
  "México": "mx",
  "Estados Unidos": "us",
  "EUA": "us",
  "Canadá": "ca",
  "Espanha": "es",
  "França": "fr",
  "Inglaterra": "gb-eng",
  "Alemanha": "de",
  "Holanda": "nl",
  "Portugal": "pt",
  "Bélgica": "be",
  "Uruguai": "uy",
  "Colômbia": "co",
  "Equador": "ec",
  "Senegal": "sn",
  "Marrocos": "ma",
  "Japão": "jp",
  "Coreia do Sul": "kr",
  "República da Coreia": "kr",
  "Austrália": "au",
  "Irã": "ir",
  "Croácia": "hr",
  "Suíça": "ch",
  "Camarões": "cm",
  "Gana": "gh",
  "Tunísia": "tn",
  "Costa do Marfim": "ci",
  "Egito": "eg",
  "Argélia": "dz",
  "África do Sul": "za",
  "Nigéria": "ng",
  "RD Congo": "cd",
  "República Democrática do Congo": "cd",
  "Arábia Saudita": "sa",
  "Catar": "qa",
  "Iraque": "iq",
  "Uzbequistão": "uz",
  "Jordânia": "jo",
  "Noruega": "no",
  "Suécia": "se",
  "Tchéquia": "cz",
  "República Tcheca": "cz",
  "Áustria": "at",
  "Escócia": "gb-sct",
  "Bósnia e Herzegovina": "ba",
  "Turquia": "tr",
  "Nova Zelândia": "nz",
  "Panamá": "pa",
  "Haiti": "ht",
  "Paraguai": "py",
  "Curaçau": "cw",
  "Cabo Verde": "cv",
};

const rounds = [
  {
    key: "round-of-32",
    title: "16-avos",
    caption: "Jogos 73-88",
    from: 73,
    to: 88,
  },
  {
    key: "round-of-16",
    title: "Oitavas",
    caption: "Jogos 89-96",
    from: 89,
    to: 96,
  },
  {
    key: "quarterfinals",
    title: "Quartas",
    caption: "Jogos 97-100",
    from: 97,
    to: 100,
  },
  {
    key: "semifinals",
    title: "Semis",
    caption: "Jogos 101-102",
    from: 101,
    to: 102,
  },
];

const roundSpacing = {
  "round-of-32": "gap-2",
  "round-of-16": "gap-8 pt-7",
  quarterfinals: "gap-20 pt-20",
  semifinals: "gap-0 pt-44",
};

function getMatchNumber(match) {
  const numberMatch = String(match.id ?? "").match(/(\d+)$/);
  return numberMatch ? Number(numberMatch[1]) : null;
}

function isPlaceholderTeam(teamName) {
  const normalizedTeam = String(teamName ?? "").toLowerCase();
  return placeholderTerms.some((term) => normalizedTeam.includes(term));
}

function compareMatches(first, second) {
  const firstNumber = getMatchNumber(first) ?? 0;
  const secondNumber = getMatchNumber(second) ?? 0;
  if (firstNumber !== secondNumber) {
    return firstNumber - secondNumber;
  }
  return String(first.kickoff_at ?? "").localeCompare(String(second.kickoff_at ?? ""));
}

function getRoundMatches(matches, round) {
  return matches
    .filter((match) => {
      const matchNumber = getMatchNumber(match);
      return matchNumber !== null && matchNumber >= round.from && matchNumber <= round.to;
    })
    .sort(compareMatches);
}

function splitRound(matches) {
  const middle = Math.ceil(matches.length / 2);
  return {
    left: matches.slice(0, middle),
    right: matches.slice(middle),
  };
}

function TeamLine({ team }) {
  const cleanTeam = String(team ?? "").trim();
  const placeholder = isPlaceholderTeam(team);
  const flagCode = placeholder ? null : flagMap[cleanTeam];

  return (
    <div className="flex min-w-0 items-center gap-2">
      {flagCode ? (
        <img
          src={`https://flagcdn.com/w40/${flagCode}.png`}
          alt={`Bandeira ${cleanTeam}`}
          className="h-4 w-4 shrink-0 rounded-full border border-line/70 object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full border border-line/60 bg-canvas/70" />
      )}
      <p
        className={`truncate text-xs font-semibold ${
          placeholder ? "italic text-muted/50" : "text-ink"
        }`}
      >
        {team}
      </p>
    </div>
  );
}

function MatchCard({ match, featured = false }) {
  const matchNumber = getMatchNumber(match);

  return (
    <article
      className={`relative rounded-xl border bg-canvas/85 px-3 py-2.5 shadow-sm ${
        featured ? "border-accent/50 bg-accent/10" : "border-line/80"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
          {matchNumber ? `Jogo ${matchNumber}` : match.sub_phase}
        </span>
        <span className="rounded-full border border-line/80 px-1.5 py-0.5 text-[9px] font-semibold text-muted">
          {match.sub_phase}
        </span>
      </div>

      <div className="space-y-1.5">
        <TeamLine team={match.home_team} />
        <div className="h-px bg-line/60" />
        <TeamLine team={match.away_team} />
      </div>

      <p className="mt-2 truncate text-[10px] text-muted/75">
        {match.stadium || "Estadio a definir"}
      </p>
    </article>
  );
}

function BracketSlot({ match, side, isLastRound = false, featured = false }) {
  return (
    <div className="relative">
      {!isLastRound ? (
        <>
          <span
            className={`pointer-events-none absolute top-1/2 hidden h-px w-5 bg-line/80 xl:block ${
              side === "left" ? "-right-5" : "-left-5"
            }`}
          />
          <span
            className={`pointer-events-none absolute top-1/2 hidden h-8 w-px -translate-y-1/2 bg-line/50 xl:block ${
              side === "left" ? "-right-5" : "-left-5"
            }`}
          />
        </>
      ) : null}
      <MatchCard match={match} featured={featured} />
    </div>
  );
}

function EmptyRound() {
  return (
    <div className="rounded-xl border border-line/70 bg-canvas/50 px-3 py-4 text-xs text-muted">
      Nenhum jogo nesta fase.
    </div>
  );
}

function RoundColumn({ round, matches, side }) {
  return (
    <div className={`flex flex-col ${roundSpacing[round.key] ?? "gap-3"}`}>
      {matches.length > 0 ? (
        matches.map((match) => (
          <BracketSlot key={match.id} match={match} side={side} />
        ))
      ) : (
        <EmptyRound />
      )}
    </div>
  );
}

function RoundHeader({ round, align = "left" }) {
  return (
    <div className={`mb-3 ${align === "right" ? "text-right" : ""}`}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{round.caption}</p>
      <h4 className="mt-1 font-display text-base font-semibold text-ink">{round.title}</h4>
    </div>
  );
}

function CenterColumn({ finalMatch, thirdPlaceMatch }) {
  return (
    <div className="flex min-h-[620px] flex-col items-center justify-center gap-8 px-4">
      <div className="w-full max-w-[240px]">
        <div className="mb-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Jogo 104</p>
          <h4 className="mt-1 font-display text-xl font-semibold text-ink">Final</h4>
        </div>
        {finalMatch ? <MatchCard match={finalMatch} featured /> : <EmptyRound />}
      </div>

      <div className="h-10 w-px bg-line/70" />

      <div className="w-full max-w-[220px]">
        <div className="mb-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Jogo 103</p>
          <h4 className="mt-1 font-display text-base font-semibold text-ink">3o Lugar</h4>
        </div>
        {thirdPlaceMatch ? <MatchCard match={thirdPlaceMatch} /> : <EmptyRound />}
      </div>
    </div>
  );
}

export function KnockoutBracket({ matches }) {
  const knockoutMatches = matches
    .filter((match) => match.tournament_phase === "Fase Mata-Mata")
    .sort(compareMatches);
  const finalMatch = knockoutMatches.find((match) => getMatchNumber(match) === 104);
  const thirdPlaceMatch = knockoutMatches.find((match) => getMatchNumber(match) === 103);
  const roundGroups = rounds.map((round) => ({
    ...round,
    ...splitRound(getRoundMatches(knockoutMatches, round)),
  }));
  const rightRounds = [...roundGroups].reverse();

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line/80 px-5 py-4">
        <p className="eyebrow">Mata-Mata</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
          Chaveamento Mata-Mata
        </h3>
      </div>

      <div className="overflow-x-auto px-5 py-5">
        <div className="grid min-w-[1440px] grid-cols-[repeat(4,150px)_260px_repeat(4,150px)] gap-5">
          {roundGroups.map((round) => (
            <div key={`left-${round.key}`}>
              <RoundHeader round={round} />
              <RoundColumn round={round} matches={round.left} side="left" />
            </div>
          ))}

          <CenterColumn finalMatch={finalMatch} thirdPlaceMatch={thirdPlaceMatch} />

          {rightRounds.map((round) => (
            <div key={`right-${round.key}`}>
              <RoundHeader round={round} align="right" />
              <RoundColumn round={round} matches={round.right} side="right" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
