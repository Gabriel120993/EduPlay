import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchAuthMe,
  isParentMe,
  loginChild,
  loginParent,
  registerParent,
  setApiToken,
  type AuthResponse,
} from "../services/api";
import { getStoredAuthJwt, setStoredAuthJwt } from "../lib/authTokenSecure";
import { clearExpoPushToken } from "../lib/pushTokenStorage";
import { postExpoPushToken } from "../services/api";
import { clearLocalNotificationSchedules } from "../services/localNotifications";

export type SessionRole = "parent" | "child";

type LoginHints = {
  tutorEmail?: string;
  childUsername?: string;
};

type SessionMeta = {
  sessionRole: SessionRole;
  parent?: AuthResponse["parent"];
  viewerUserId?: string;
};

type AuthContextValue = {
  loading: boolean;
  token: string | null;
  sessionRole: SessionRole | null;
  /** Cuenta tutor (sesión padre). */
  parent: AuthResponse["parent"] | null;
  /** Usuario menor activo (sesión hijo: feed / perfil / tiempo de pantalla). */
  viewerUserId: string | null;
  login: (email: string, password: string, rememberSession?: boolean) => Promise<void>;
  loginAsChild: (username: string, password: string, rememberSession?: boolean) => Promise<void>;
  register: (email: string, password: string, rememberSession?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  /** Actualiza datos del tutor desde `/api/auth/me` (p. ej. tras validar IAP). */
  refreshParent: () => Promise<void>;
};

/** Metadatos de sesión sin JWT (el token va en SecureStore). */
const SESSION_META_KEY = "eduplay_session_meta_v3";
/** Claves antiguas: JSON incluía `token` en AsyncStorage — se migran al iniciar. */
const LEGACY_SESSION_V2_KEY = "eduplay_session_v2";
const LEGACY_SESSION_V1_KEY = "eduplay_session_v1";

/** Solo email de tutor / usuario del menor (sin contraseña) para rellenar el formulario. */
export const LOGIN_HINTS_STORAGE_KEY = "eduplay_login_hints_v1";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readSessionMeta(): Promise<SessionMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

async function writeSessionMeta(meta: SessionMeta): Promise<void> {
  await AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
}

async function clearPersistedSession(): Promise<void> {
  await setStoredAuthJwt(null);
  await AsyncStorage.removeItem(SESSION_META_KEY);
  await AsyncStorage.removeItem(LEGACY_SESSION_V2_KEY);
  await AsyncStorage.removeItem(LEGACY_SESSION_V1_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<SessionRole | null>(null);
  const [parent, setParent] = useState<AuthResponse["parent"] | null>(null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);

  const mergeLoginHints = useCallback(async (partial: Partial<LoginHints>) => {
    let base: LoginHints = {};
    try {
      const raw = await AsyncStorage.getItem(LOGIN_HINTS_STORAGE_KEY);
      if (raw) base = JSON.parse(raw) as LoginHints;
    } catch {
      base = {};
    }
    await AsyncStorage.setItem(LOGIN_HINTS_STORAGE_KEY, JSON.stringify({ ...base, ...partial }));
  }, []);

  const clearSession = useCallback(async () => {
    if (sessionRole === "child" && viewerUserId && token) {
      try {
        await postExpoPushToken(viewerUserId, null);
      } catch {
        // best effort: el cierre de sesión sigue aunque falle el API
      }
    }
    setToken(null);
    setSessionRole(null);
    setParent(null);
    setViewerUserId(null);
    setApiToken(null);
    await clearPersistedSession();
    await clearExpoPushToken();
    await clearLocalNotificationSchedules();
  }, [sessionRole, viewerUserId, token]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let jwt = await getStoredAuthJwt();

        if (!jwt) {
          const oldRaw =
            (await AsyncStorage.getItem(LEGACY_SESSION_V2_KEY)) ??
            (await AsyncStorage.getItem(LEGACY_SESSION_V1_KEY));
          if (oldRaw) {
            try {
              const old = JSON.parse(oldRaw) as {
                token?: string;
                parent?: AuthResponse["parent"];
                sessionRole?: SessionRole;
                viewerUserId?: string;
              };
              if (typeof old.token === "string" && old.token.length > 0) {
                jwt = old.token;
                await setStoredAuthJwt(jwt);
              }
              if (old.sessionRole) {
                await writeSessionMeta({
                  sessionRole: old.sessionRole,
                  parent: old.parent,
                  viewerUserId: old.viewerUserId,
                });
              }
            } catch {
              // ignore corrupt legacy blob
            }
            await AsyncStorage.removeItem(LEGACY_SESSION_V2_KEY);
            await AsyncStorage.removeItem(LEGACY_SESSION_V1_KEY);
          }
        }

        if (!jwt) {
          if (mounted) setLoading(false);
          return;
        }
        if (!mounted) return;
        setToken(jwt);
        setApiToken(jwt);

        const me = await fetchAuthMe();
        if (!mounted) return;
        if (isParentMe(me)) {
          setSessionRole("parent");
          setParent(me.parent);
          setViewerUserId(null);
          await writeSessionMeta({ sessionRole: "parent", parent: me.parent });
          await mergeLoginHints({ tutorEmail: me.parent.email });
        } else if (me.accountApproved === false) {
          await clearSession();
          return;
        } else {
          setSessionRole("child");
          setParent(null);
          setViewerUserId(me.child.id);
          await writeSessionMeta({ sessionRole: "child", viewerUserId: me.child.id });
          await mergeLoginHints({ childUsername: me.child.username });
        }
      } catch {
        if (!mounted) return;
        await clearSession();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [clearSession, mergeLoginHints]);

  const persistParentSession = useCallback(
    async (session: AuthResponse, rememberSession: boolean, emailHint?: string) => {
      setToken(session.token);
      setApiToken(session.token);
      setSessionRole("parent");
      setParent(session.parent);
      setViewerUserId(null);
      if (rememberSession) {
        await setStoredAuthJwt(session.token);
        await writeSessionMeta({ sessionRole: "parent", parent: session.parent });
        if (emailHint?.trim()) await mergeLoginHints({ tutorEmail: emailHint.trim() });
      } else {
        await clearPersistedSession();
      }
    },
    [mergeLoginHints]
  );

  const login = useCallback(
    async (email: string, password: string, rememberSession = true) => {
      const session = await loginParent(email, password);
      await persistParentSession(session, rememberSession, email);
    },
    [persistParentSession]
  );

  const loginAsChild = useCallback(
    async (username: string, password: string, rememberSession = true) => {
      const u = username.trim();
      const session = await loginChild(u, password);
      setToken(session.token);
      setApiToken(session.token);
      setSessionRole("child");
      setParent(null);
      setViewerUserId(session.user.id);
      if (rememberSession) {
        await setStoredAuthJwt(session.token);
        await writeSessionMeta({ sessionRole: "child", viewerUserId: session.user.id });
        await mergeLoginHints({ childUsername: u });
      } else {
        await clearPersistedSession();
      }
    },
    [mergeLoginHints]
  );

  const register = useCallback(
    async (email: string, password: string, rememberSession = true) => {
      const session = await registerParent(email, password);
      await persistParentSession(session, rememberSession, email);
    },
    [persistParentSession]
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const refreshParent = useCallback(async () => {
    if (!token) return;
    try {
      const me = await fetchAuthMe();
      if (!isParentMe(me)) return;
      setParent(me.parent);
      const meta = await readSessionMeta();
      if (meta?.sessionRole === "parent") {
        await writeSessionMeta({ sessionRole: "parent", parent: me.parent });
      }
    } catch {
      // ignore: IAP ya validó en servidor; el próximo /me corregirá
    }
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      sessionRole,
      parent,
      viewerUserId,
      login,
      loginAsChild,
      register,
      logout,
      refreshParent,
    }),
    [loading, token, sessionRole, parent, viewerUserId, login, loginAsChild, register, logout, refreshParent]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }
  return ctx;
}
