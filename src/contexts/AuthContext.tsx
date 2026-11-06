/**
 * Contexto de Autenticação e Sessão (AuthContext)
 * Gerencia o ciclo de vida da sessão JWT do servidor municipal,
 * verificação de perfis RBAC e persistência segura no cliente.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { APP_CONFIG } from "../config/app.config";
import authService from "../services/authService";
import {
  LoginCredentials,
  PerfilUsuario,
  TokenResponse,
  UsuarioSessao,
} from "../types/auth";

export interface AuthContextType {
  user: UsuarioSessao | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<TokenResponse>;
  logout: () => void;
  hasPermission: (allowedRoles?: PerfilUsuario[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(APP_CONFIG.storageKeys.token);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UsuarioSessao | null>(() => {
    try {
      const cached = localStorage.getItem(APP_CONFIG.storageKeys.user);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    authService.logout();
  }, []);

  // Inicialização assíncrona da sessão: validação do token com a API
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const storedToken = localStorage.getItem(APP_CONFIG.storageKeys.token);
      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = await authService.getMe();
        if (isMounted) {
          setUser(userData);
          localStorage.setItem(
            APP_CONFIG.storageKeys.user,
            JSON.stringify(userData)
          );
        }
      } catch (error) {
        // Se o token for inválido ou estiver expirado, limpa a sessão
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Ouvinte para expiração automática disparada pelos interceptors HTTP
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("vigiminas:auth:unauthorized", handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener(
        "vigiminas:auth:unauthorized",
        handleUnauthorized
      );
    };
  }, [logout]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<TokenResponse> => {
      const tokenData = await authService.login(credentials);

      // Persiste o token
      localStorage.setItem(APP_CONFIG.storageKeys.token, tokenData.access_token);
      setToken(tokenData.access_token);

      // Busca dados cadastrais completos do usuário logado
      try {
        const fullUser = await authService.getMe();
        setUser(fullUser);
        localStorage.setItem(
          APP_CONFIG.storageKeys.user,
          JSON.stringify(fullUser)
        );
      } catch {
        // Fallback para metadados vindos no payload do token se /me falhar temporariamente
        const fallbackUser: UsuarioSessao = {
          id: tokenData.usuario_id,
          email: credentials.email,
          perfil: tokenData.perfil,
          nome_completo: tokenData.nome_completo,
          cpf: "",
          cargo: "Servidor Municipal",
          is_active: true,
        };
        setUser(fallbackUser);
        localStorage.setItem(
          APP_CONFIG.storageKeys.user,
          JSON.stringify(fallbackUser)
        );
      }

      return tokenData;
    },
    []
  );

  /**
   * Validador RBAC:
   * Retorna true se o usuário possuir um dos papéis permitidos.
   * O perfil 'admin_master' possui passe-livre em todas as rotas operacionais.
   */
  const hasPermission = useCallback(
    (allowedRoles?: PerfilUsuario[]): boolean => {
      if (!allowedRoles || allowedRoles.length === 0) {
        return true;
      }
      if (!user) {
        return false;
      }
      if (user.perfil === "admin_master") {
        return true;
      }
      return allowedRoles.includes(user.perfil);
    },
    [user]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      hasPermission,
    }),
    [user, token, isLoading, login, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um <AuthProvider />");
  }
  return context;
};

export default AuthContext;
