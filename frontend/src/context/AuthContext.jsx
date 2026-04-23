import { createContext, useContext, useState } from "react";

import { loginUser } from "../services/api";

const AUTH_STORAGE_KEY = "bolao-copa-ost.auth";
const AuthContext = createContext(null);

function normalizeUser(rawUser) {
  if (!rawUser) {
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
  };
}

function getStoredUser() {
  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return normalizeUser(JSON.parse(rawValue));
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getStoredUser);

  async function login(credentials) {
    const payload = await loginUser(credentials);
    const normalizedUser = normalizeUser(payload.user);

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);

    return normalizedUser;
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
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
