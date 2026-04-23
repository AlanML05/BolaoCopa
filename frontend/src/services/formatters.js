const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const fullDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMatchDateTime(value) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDateTime(value) {
  return fullDateTimeFormatter.format(new Date(value));
}

export function formatCurrency(value) {
  return currencyFormatter.format(value ?? 0);
}

export function formatScore(homeScore, awayScore) {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
    return "-- x --";
  }

  return `${homeScore} x ${awayScore}`;
}

export function formatPercentage(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}
