import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic2 } from "lucide-react";
import Button from "../ui/Button.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { AUTH_MODE } from "../config.js";

export default function AuthPage() {
  const { signIn, signUp, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const title = useMemo(
    () => (mode === "signin" ? "Welcome back" : "Create your account"),
    [mode]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password, displayName);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      <header className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="glass gradient-border grid size-10 place-items-center rounded-2xl">
            <Mic2 className="size-5 text-neon-cyan" />
          </div>
          <div className="text-sm font-semibold tracking-wide">
            InterviewVerse AI
          </div>
        </Link>
        <Link to="/">
          <Button variant="ghost">Back</Button>
        </Link>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2 md:items-start">
        <div className="glass gradient-border rounded-3xl p-6 md:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-white/60">
            Sign in to start practicing interviews and track your progress.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-white/60">Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-white/60">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                type="email"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white/60">Password</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <Button disabled={busy} className="w-full py-2.5">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
            </Button>

            {AUTH_MODE === "firebase" ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full py-2.5"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await signInGoogle();
                    navigate("/app/dashboard");
                  } catch (err) {
                    setError(err?.message || "Google sign-in failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Continue with Google
              </Button>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                Local mode is enabled (no cloud keys required). Google sign-in is disabled.
              </div>
            )}
          </form>

          <div className="mt-5 text-center text-sm text-white/60">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  className="text-white hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="text-white hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <div className="glass gradient-border rounded-3xl p-6 md:p-8">
          <div className="text-sm font-semibold">What you get</div>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li className="rounded-2xl bg-white/5 p-4">
              Resume upload + profile summary for role-specific interviews.
            </li>
            <li className="rounded-2xl bg-white/5 p-4">
              Voice interview room with Whisper transcription.
            </li>
            <li className="rounded-2xl bg-white/5 p-4">
              AI feedback: confidence, clarity, communication, and technical skill.
            </li>
            <li className="rounded-2xl bg-white/5 p-4">
              Progress tracking and analytics over time.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
