"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getSession,
  getCurrentUser,
  signOut as cognitoSignOut,
  type CurrentUser,
} from "@/lib/cognito";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CurrentUser | null;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    getSession()
      .then(async (session) => {
        const ok = !!session;
        setIsAuthenticated(ok);
        if (ok) {
          const u = await getCurrentUser();
          setUser(u);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const signOut = () => {
    cognitoSignOut();
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
