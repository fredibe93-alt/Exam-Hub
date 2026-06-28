import { createContext, useContext, ReactNode, useEffect, useCallback } from "react";
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
  
  const { data: user, isLoading, error } = useGetMe({
    query: {
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
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    if (res.user.role === "admin") {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/student/dashboard");
    }
  }, [loginMutation, queryClient, setLocation]);

  const handleRegister = useCallback(async (data: RegisterInput) => {
    const res = await registerMutation.mutateAsync({ data });
    localStorage.setItem("cbt_token", res.token);
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    setLocation("/student/dashboard");
  }, [registerMutation, queryClient, setLocation]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      localStorage.removeItem("cbt_token");
      queryClient.clear();
      setLocation("/login");
    }
  }, [logoutMutation, queryClient, setLocation]);

  // Handle unauthorized state
  useEffect(() => {
    if (error) {
      localStorage.removeItem("cbt_token");
    }
  }, [error]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
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
