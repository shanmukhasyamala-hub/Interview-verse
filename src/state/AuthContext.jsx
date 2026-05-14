import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_MODE } from "../config";
import { apiGet, apiPost, setLocalToken } from "../lib/api";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fb = useRef(null);

  useEffect(() => {
    let unsub = null;

    async function init() {
      setLoading(true);

      if (AUTH_MODE === "local") {
        try {
          const me = await apiGet("/api/me");
          setUser(me.user || null);
        } catch {
          setUser(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Firebase mode (optional)
      const [{ auth }, authFns] = await Promise.all([
        import("../lib/firebase.js"),
        import("firebase/auth"),
      ]);

      if (!auth) {
        setUser(null);
        setLoading(false);
        return;
      }

      fb.current = { auth, authFns };
      unsub = authFns.onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    }

    init();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        if (AUTH_MODE === "local") {
          const out = await apiPost("/api/auth/signin", { email, password });
          setLocalToken(out.token);
          setUser(out.user);
          return out.user;
        }
        const { auth, authFns } = fb.current || {};
        if (!auth) throw new Error("Firebase auth is not configured");
        return authFns.signInWithEmailAndPassword(auth, email, password);
      },
      async signUp(email, password, displayName) {
        if (AUTH_MODE === "local") {
          const out = await apiPost("/api/auth/signup", {
            email,
            password,
            displayName,
          });
          setLocalToken(out.token);
          setUser(out.user);
          return out.user;
        }
        const { auth, authFns } = fb.current || {};
        if (!auth) throw new Error("Firebase auth is not configured");
        const cred = await authFns.createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        if (displayName)
          await authFns.updateProfile(cred.user, { displayName });
        return cred;
      },
      async signInGoogle() {
        if (AUTH_MODE === "local") {
          throw new Error("Google sign-in is not available in local mode.");
        }
        const { auth, authFns } = fb.current || {};
        if (!auth) throw new Error("Firebase auth is not configured");
        const provider = new authFns.GoogleAuthProvider();
        return authFns.signInWithPopup(auth, provider);
      },
      async signOut() {
        if (AUTH_MODE === "local") {
          setLocalToken(null);
          setUser(null);
          return;
        }
        const { auth, authFns } = fb.current || {};
        if (!auth) return;
        return authFns.signOut(auth);
      },
    }),
    [user, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
}
