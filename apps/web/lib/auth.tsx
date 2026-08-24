'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AuthResponse, User } from '@kidcare/types';
import { api, apiPost } from './api';

interface AuthState {
  user: User | null;
  /** true mientras se comprueba la sesion (cookie httpOnly) al cargar la pagina. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    // No hay forma de leer una cookie httpOnly desde JS, asi que la unica
    // manera de saber si hay sesion es preguntarle a la API.
    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiPost<AuthResponse>('/auth/login', {
      email,
      password,
    });
    // El token ya quedo en la cookie httpOnly que puso la API; no se
    // persiste nada mas en el navegador.
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    void apiPost('/auth/logout', {}).catch(() => {
      // Si la API no responde igual queremos sacar al usuario del panel.
    });
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
