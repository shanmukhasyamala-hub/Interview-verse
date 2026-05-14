import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { apiGet } from "../lib/api";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Analytics() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    apiGet("/api/interviews")
      .then((out) => {
        if (!alive) return;
        const all = out.interviews || [];
        setSessions(all.filter((s) => s.status === "completed"));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const series = useMemo(
    () =>
      sessions.map((s) => ({
        name: formatDate(s.createdAt),
        overall: s.scores?.overall ?? null,
        confidence: s.scores?.confidence ?? null,
        communication: s.scores?.communication ?? null,
        technical: s.scores?.technical ?? s.scores?.technicalSkill ?? null,
      })),
    [sessions]
  );

  return (
    <div>
      <div className="text-xs text-white/60">Analytics</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">
        Progress tracking
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-white/65">
        Your scores over time based on AI feedback. Take more mock interviews to
        improve trend quality.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="text-sm font-semibold">Score trend</div>
          <div className="mt-4 h-64">
            {series.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-white/60">
                Complete an interview to see analytics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)" }} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "rgba(255,255,255,0.6)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(10,12,18,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.8)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="communication"
                    stroke="#f472b6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Recent feedback</div>
          <div className="mt-3 space-y-3">
            {sessions
              .slice()
              .reverse()
              .slice(0, 3)
              .map((s) => (
                <div key={s.id} className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs text-white/50">
                    {s.role} · {formatDate(s.createdAt)}
                  </div>
                  <div className="mt-2 text-sm text-white/80">
                    Overall:{" "}
                    <span className="font-semibold">
                      {s.scores?.overall ?? "—"}/100
                    </span>
                  </div>
                  <div className="mt-2 line-clamp-3 text-xs text-white/60">
                    {s.feedback?.summary ||
                      s.feedback?.overallFeedback ||
                      s.feedback?.strengths?.[0] ||
                      "—"}
                  </div>
                </div>
              ))}
            {sessions.length === 0 && (
              <div className="text-sm text-white/60">
                No completed interviews yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
