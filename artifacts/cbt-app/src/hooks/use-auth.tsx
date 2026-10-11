import { createContext, useContext, ReactNode, useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, useLogin, useLogout, useRegister, getGetMeQueryKey, User, LoginInput, RegisterInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem("cbt_token")));
  
  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: hasToken,
      retry: false,
      staleTime: Infinity,
      queryKey: getGetMeQueryKey(),
    }
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const handleLogin = useCallback(async (data: LoginInput) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("cbt_token", res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    setHasToken(true);
    if (res.user.role === "admin") {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/student/dashboard");
    }
  }, [loginMutation, queryClient, setLocation]);

  const handleRegister = useCallback(async (data: RegisterInput) => {
    const res = await registerMutation.mutateAsync({ data });
    localStorage.setItem("cbt_token", res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    setHasToken(true);
    setLocation("/student/dashboard");
  }, [registerMutation, queryClient, setLocation]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      localStorage.removeItem("cbt_token");
      queryClient.clear();
      setHasToken(false);
      setLocation("/login");
    }
  }, [logoutMutation, queryClient, setLocation]);

  // Handle unauthorized state
  useEffect(() => {
    const status = (error as { status?: number } | null)?.status;
    if (hasToken && status === 401) {
      localStorage.removeItem("cbt_token");
      queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
      setHasToken(false);
    }
  }, [error, hasToken, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: hasToken && isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
