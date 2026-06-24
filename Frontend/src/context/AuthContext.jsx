// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
/* eslint-disable react-refresh/only-export-components */

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (newToken, userObj) => {
    setToken(newToken);
    setUser(userObj);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userObj));
  };

  const logout = async () => {
    if (token) {
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        await fetch(`${base}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors during logout; local cleanup still proceeds.
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    let cancelled = false;

    async function validateToken() {
      if (!token) return;

      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${base}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error("Invalid token");
        }
        if (!res.ok) {
          // Keep existing session on temporary server/network issues.
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (err) {
        if (!cancelled && err.message === "Invalid token") {
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    }

    validateToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
