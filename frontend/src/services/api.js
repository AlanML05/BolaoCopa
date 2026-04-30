const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "bolao-copa.auth";
const AUTH_EXPIRED_EVENT = "bolao-auth-expired";

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export function getAdminDashboard(token) {
  return request("/admin/dashboard", { token });
}

export function updatePaymentStatus(token, targetUserId, paid) {
  return request(`/admin/users/${targetUserId}/payment`, {
    method: "POST",
    token,
    body: { paid },
  });
}

export function updateMatchResult(token, targetMatchId, resultPayload) {
  return request(`/admin/matches/${targetMatchId}/result`, {
    method: "POST",
    token,
    body: resultPayload,
  });
}
