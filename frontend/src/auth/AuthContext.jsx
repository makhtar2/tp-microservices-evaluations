import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { login as loginRequest } from "../api/auth";
import { SESSION_EXPIRED_EVENT } from "../api/client";
import { getSession, saveSession, clearSession } from "./session";
import { AuthContext, homePath, useAuth } from "./useAuth";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession);

  useEffect(() => {
    const onExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  async function login(email, password) {
    const { token, user } = await loginRequest(email, password);
    const next = { token, user };
    saveSession(next);
    setSession(next);
    return user;
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  return <AuthContext.Provider value={{ user: session?.user ?? null, login, logout }}>{children}</AuthContext.Provider>;
}

// Protège une route : connexion obligatoire, et rôle parmi `roles` si fourni.
export function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
  return children;
}
