import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import Button from "../ui/Button";
import { FileUp, Save } from "lucide-react";
import { apiGet, apiPost, apiUploadFile } from "../lib/api";
import { API_BASE } from "../config";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState("");
  const [primarySkills, setPrimarySkills] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    apiGet("/api/profile")
      .then((out) => {
        if (!alive) return;
        const data = out.profile || null;
        setProfile(data);
        setSummary(data?.summary || "");
        setPrimarySkills((data?.primarySkills || []).join(", "));
        setResumeUrl(data?.resumeUrl || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  async function saveProfile(next = {}) {
    if (!user) return;
    setBusy(true);
    setMsg("");
    try {
      const out = await apiPost("/api/profile", {
        summary,
        primarySkills: primarySkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        resumeUrl,
        ...next,
      });
      setProfile(out.profile || null);
      setMsg("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadResume(file) {
    if (!user || !file) return;
    setBusy(true);
    setMsg("");
    try {
      const out = await apiUploadFile("/api/resume/upload", "resume", file);
      const url = out.resumeUrl;
      setResumeUrl(url);
      await saveProfile({ resumeUrl: url });
      setMsg("Resume uploaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="text-xs text-white/60">Profile</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">Your profile</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/65">
        Upload your resume and add a short summary. The AI uses this to generate
        better interview questions and feedback.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Resume</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
              <FileUp className="size-4" />
              Upload (PDF/DOC)
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => uploadResume(e.target.files?.[0])}
              />
            </label>
            {resumeUrl ? (
              <a
                className="text-sm text-neon-cyan hover:underline"
                href={resumeUrl.startsWith("/") ? `${API_BASE}${resumeUrl}` : resumeUrl}
                target="_blank"
                rel="noreferrer"
              >
                View uploaded resume
              </a>
            ) : (
              <span className="text-sm text-white/50">No resume uploaded yet.</span>
            )}
          </div>
          <div className="mt-3 text-xs text-white/50">
            MVP note: resume text extraction is optional; add your summary below.
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Profile summary</div>
          <textarea
            className="mt-3 min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Briefly describe your experience, target roles, and key achievements…"
          />
          <div className="mt-4 text-sm font-semibold">Primary skills</div>
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
            value={primarySkills}
            onChange={(e) => setPrimarySkills(e.target.value)}
            placeholder="React, Node.js, System Design, SQL… (comma separated)"
          />
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => saveProfile()} disabled={busy}>
              <Save className="size-4" /> Save
            </Button>
            {msg && <div className="text-sm text-white/60">{msg}</div>}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Last saved:{" "}
            {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
