const configuredApiBaseUrl = [
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_API_URL,
].find((value) => typeof value === "string" && value.trim().length > 0);

const API_BASE_URL = (configuredApiBaseUrl ?? "http://localhost:8000")
  .trim()
  .replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "bolao-copa.auth";
const AUTH_EXPIRED_EVENT = "bolao-auth-expired";

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function notifyAuthExpired() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && path !== "/login") {
      notifyAuthExpired();
      throw new Error("Sua sessao expirou. Entre novamente para continuar.");
    }

    throw new Error(payload.detail ?? "Nao foi possivel concluir a solicitacao.");
  }

  return payload;
}

export function loginUser(credentials) {
  return request("/login", {
    method: "POST",
    body: credentials,
  });
}

export function signupUser(credentials) {
  return request("/signup", {
    method: "POST",
    body: credentials,
  });
}

export function getTakenEmojis() {
  return request("/api/users/taken-emojis");
}

export function getMyBetsOverview(token) {
  return request("/me/bets-overview", { token });
}

export function createBet(token, betPayload) {
  return request("/me/bets", {
    method: "POST",
    token,
    body: betPayload,
  });
}

export function createBatchBets(token, betsPayload) {
  return request("/api/bets/batch", {
    method: "POST",
    token,
    body: betsPayload,
  });
}

export function updateBet(token, targetBetId, betPayload) {
  return request(`/me/bets/${targetBetId}`, {
    method: "PUT",
    token,
    body: betPayload,
  });
}

export function getStandings(token) {
  return request("/standings", { token });
}

export function fetchMatchStats(token) {
  return request("/api/matches/stats", { token });
}

export function getAdminDashboard(token) {
  return request("/admin/dashboard", { token });
}

export function updateMatch(token, targetMatchId, matchPayload) {
  return request(`/admin/matches/${targetMatchId}`, {
    method: "PUT",
    token,
    body: matchPayload,
  });
}

export function deleteMatch(token, targetMatchId) {
  return request(`/admin/matches/${targetMatchId}`, {
    method: "DELETE",
    token,
  });
}

export function updatePaymentStatus(token, targetUserId, statusPayload) {
  const body =
    typeof statusPayload === "boolean" ? { paid: statusPayload } : statusPayload;

  return request(`/admin/users/${targetUserId}/payment`, {
    method: "POST",
    token,
    body,
  });
}

export function updateMatchResult(token, targetMatchId, resultPayload) {
  return request(`/admin/matches/${targetMatchId}/result`, {
    method: "POST",
    token,
    body: resultPayload,
  });
}
