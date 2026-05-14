import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import Button from "../ui/Button";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { apiGet } from "../lib/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("Frontend Engineer");
  const [level, setLevel] = useState("Mid");
  const [sessions, setSessions] = useState([]);
  const [busy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    apiGet("/api/interviews")
      .then((out) => {
        if (!alive) return;
        setSessions(out.interviews || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed");
    const avg =
      completed.length === 0
        ? null
        : Math.round(
            completed.reduce((a, b) => a + (b.scores?.overall || 0), 0) /
              completed.length
          );
    return { total: sessions.length, completed: completed.length, avg };
  }, [sessions]);

  function startInterview() {
    navigate("/app/new");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-white/60">Dashboard</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            Welcome, {user?.displayName || "Candidate"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Start a mock interview, answer using voice, and get AI feedback on
            confidence, communication, and technical skills.
          </p>
        </div>
        <Button onClick={startInterview} disabled={busy}>
          <Plus className="size-4" />
          Start interview
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-white/60">Total sessions</div>
          <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-white/60">Completed</div>
          <div className="mt-2 text-2xl font-semibold">{stats.completed}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-white/60">Avg score</div>
          <div className="mt-2 text-2xl font-semibold">
            {stats.avg == null ? "—" : `${stats.avg}/100`}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5 md:col-span-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">New interview</div>
            <Sparkles className="size-4 text-neon-violet" />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs text-white/60">Role</div>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Level</div>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option>Junior</option>
                <option>Mid</option>
                <option>Senior</option>
              </select>
            </div>
            <Button onClick={startInterview} disabled={busy} className="w-full">
              Resume-first setup <ArrowRight className="size-4" />
            </Button>
            <div className="text-xs text-white/50">
              Upload your resume → review summary → choose interview type & role → start.
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Recent sessions</div>
            <Link to="/app/analytics" className="text-xs text-white/60 hover:text-white">
              View analytics →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            {sessions.length === 0 ? (
              <div className="p-4 text-sm text-white/60">
                No sessions yet. Start your first interview.
              </div>
            ) : (
              sessions.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  to={`/app/interview/${s.id}`}
                  className="flex items-center justify-between gap-4 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {s.role} · {s.level}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Status: {s.status}
                      {s.scores?.overall != null ? ` · Score: ${s.scores.overall}/100` : ""}
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-white/50" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
