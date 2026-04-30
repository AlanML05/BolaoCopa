import { createContext, useContext, useEffect, useState } from "react";

import { loginUser } from "../services/api";

const AUTH_STORAGE_KEY = "bolao-copa.auth";
const AUTH_EXPIRED_EVENT = "bolao-auth-expired";
const AuthContext = createContext(null);

function normalizeUser(rawUser, accessToken) {
  if (!rawUser || !accessToken) {
    return null;
  }

  const role = rawUser.role ?? (rawUser.is_admin ? "admin" : "user");
  const paid = rawUser.paid ?? rawUser.pagou ?? false;
  const name = rawUser.name ?? rawUser.nome ?? "";

  return {
    id: rawUser.id,
    name,
    username: rawUser.username ?? "",
    email: rawUser.email ?? "",
    department: rawUser.department ?? rawUser.departamento ?? "",
    role,
    paid,
    pagou: paid,
    is_admin: Boolean(rawUser.is_admin ?? role === "admin"),
    accessToken,
  };
}

function getStoredUser() {
  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const storedSession = JSON.parse(rawValue);
    const accessToken = storedSession.accessToken ?? storedSession.token ?? storedSession.access_token;
    const rawUser = storedSession.user ?? storedSession;
    const normalizedUser = normalizeUser(rawUser, accessToken);

    if (!normalizedUser) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    return normalizedUser;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [sessionNotice, setSessionNotice] = useState("");

  async function login(credentials) {
    const payload = await loginUser(credentials);
    const accessToken = payload.access_token;
    const normalizedUser = normalizeUser(payload.user, accessToken);

    if (!normalizedUser) {
      throw new Error("Resposta de autenticacao invalida.");
    }

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: normalizedUser, accessToken }),
    );
    setCurrentUser(normalizedUser);
    setSessionNotice("");

    return normalizedUser;
  }

  function logout(reason = "") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
    setSessionNotice(typeof reason === "string" ? reason : "");
  }

  useEffect(() => {
    function handleAuthExpired() {
      logout("Sua sessao expirou. Entre novamente para continuar.");
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        sessionNotice,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}
