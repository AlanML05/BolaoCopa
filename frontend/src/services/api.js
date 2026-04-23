const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request(path, { method = "GET", body, userId } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (userId) {
    headers["X-User-Id"] = userId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
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
export function getMyBetsOverview(userId) {
  return request("/me/bets-overview", { userId });
}

export function createBet(userId, betPayload) {
  return request("/me/bets", {
    method: "POST",
    userId,
    body: betPayload,
  });
}

export function getAdminDashboard(userId) {
  return request("/admin/dashboard", { userId });
}

export function updatePaymentStatus(userId, targetUserId, paid) {
  return request(`/admin/users/${targetUserId}/payment`, {
    method: "POST",
    userId,
    body: { paid },
  });
}

export function updateMatchResult(userId, targetMatchId, resultPayload) {
  return request(`/admin/matches/${targetMatchId}/result`, {
    method: "POST",
    userId,
    body: resultPayload,
  });
}
