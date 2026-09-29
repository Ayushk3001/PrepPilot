'use client';

import React, { createContext, useContext, useEffect, useState } from "react";
import api, { TOKEN_KEY } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  checking: boolean;
  signup: (name: string, email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthCtx = createContext<AuthContextType>({
  user: null,
  checking: true,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      setChecking(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => {
        if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setChecking(false));
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    const res = await api.post("/auth/register", { name, email, password });
    const data = res?.data || {};
    if (typeof window !== "undefined" && data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
    }
    setUser(data.user || null);
    return data;
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const data = res?.data || {};
    if (typeof window !== "undefined" && data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
    }
    setUser(data.user || null);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("cadence_user");
      localStorage.removeItem("cadence_candidate_profile");
      localStorage.removeItem("cadence_profile_source");
      localStorage.removeItem("cadence_profile_confirmed");
      localStorage.removeItem("cadence_sessions_v1");
      localStorage.removeItem("elevate_ai_sessions_v1");
      localStorage.removeItem("cadence_answer_draft");
      localStorage.removeItem("cadence_candidate_account");
      sessionStorage.removeItem("cadence_resume_interview_session");
      sessionStorage.removeItem("cadence_active_interview_session");
    }
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, checking, signup, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
