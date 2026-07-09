import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

export interface BackendUser {
  id: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  backendUser: BackendUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signInWithBackend: (user: BackendUser) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const BACKEND_USER_KEY = "backend_user";

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  backendUser: null,
  isLoading: true,
  isLoggedIn: false,
  signInWithBackend: async () => {},
  signOut: async () => {},
  refreshAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);

    if (!session) {
      try {
        const stored = await SecureStore.getItemAsync(BACKEND_USER_KEY);
        if (stored) {
          setBackendUser(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    refreshAuth().finally(() => setIsLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        SecureStore.getItemAsync(BACKEND_USER_KEY).then((stored) => {
          if (stored) {
            setBackendUser(JSON.parse(stored));
          }
        });
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuth]);

  const signInWithBackend = async (userInfo: BackendUser) => {
    setBackendUser(userInfo);
    await SecureStore.setItemAsync(
      BACKEND_USER_KEY,
      JSON.stringify(userInfo)
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setBackendUser(null);
    await SecureStore.deleteItemAsync(BACKEND_USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        backendUser,
        isLoading,
        isLoggedIn: !!user || !!backendUser,
        signInWithBackend,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
