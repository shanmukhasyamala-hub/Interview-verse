import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { FileUp, Sparkles, Wand2 } from "lucide-react";
import { apiGet, apiPost, apiUploadFile } from "../lib/api";
import { extractResumeText } from "../lib/resumeText";

const INTERVIEW_TYPES = [
  { value: "mixed", label: "Mixed" },
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "system-design", label: "System Design" },
];

export default function NewInterview() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 upload, 2 summary, 3 options
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [summary, setSummary] = useState("");
  const [primarySkills, setPrimarySkills] = useState("");
  const [role, setRole] = useState("Frontend Engineer");
  const [level, setLevel] = useState("Mid");
  const [interviewType, setInterviewType] = useState("mixed");

  const canNext = useMemo(() => {
    if (step === 1) return resumeText.trim().length > 20;
    if (step === 2) return summary.trim().length > 20;
    return true;
  }, [step, resumeText, summary]);

  async function loadExistingProfile() {
    setBusy(true);
    setError("");
    try {
      const out = await apiGet("/api/profile");
      const p = out.profile || null;
      if (p?.resumeText) setResumeText(p.resumeText);
      if (p?.summary) setSummary(p.summary);
      if (Array.isArray(p?.primarySkills)) setPrimarySkills(p.primarySkills.join(", "));
      if (p?.resumeText && p?.summary) setStep(3);
      else if (p?.resumeText) setStep(2);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  useMemo(() => {
    // One-time load, safe in React 19 strict mode via memo pattern
    // eslint-disable-next-line no-unused-expressions
    loadExistingProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResumeUpload(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      // 1) Save file to server (for reference/download)
      await apiUploadFile("/api/resume/upload", "resume", file);

      // 2) Extract text locally
      const text = await extractResumeText(file);
      setResumeText(text);

      // 3) Ask server to summarize + store profile
      const out = await apiPost("/api/resume/summarize", { resumeText: text });
      setSummary(out.summary || "");
      setPrimarySkills((out.primarySkills || []).join(", "));

      // Persist profile
      await apiPost("/api/profile", {
        resumeText: text,
        summary: out.summary || "",
        primarySkills: out.primarySkills || [],
      });

      setStep(2);
    } catch (e) {
      setError(e?.message || "Failed to process resume");
    } finally {
      setBusy(false);
    }
  }

  async function saveSummaryAndContinue() {
    setBusy(true);
    setError("");
    try {
      const skills = primarySkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await apiPost("/api/profile", { resumeText, summary, primarySkills: skills });
      setStep(3);
    } catch (e) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  async function startInterview() {
    setBusy(true);
    setError("");
    try {
      const out = await apiPost("/api/interviews", { role, level, interviewType });
      navigate(`/app/interview/${out.interview.id}`);
    } catch (e) {
      setError(e?.message || "Failed to start interview");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="text-xs text-white/60">New interview</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">
        Resume-first setup
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-white/65">
        Upload your resume, confirm the AI summary, then choose interview type and
        role to start.
      </p>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              Step {step} of 3
            </div>
            <div className="text-xs text-white/60">
              {step === 1
                ? "Upload resume"
                : step === 2
                  ? "Confirm summary"
                  : "Choose interview"}
            </div>
          </div>

          {step === 1 && (
            <div className="mt-5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                <FileUp className="size-4" />
                Upload resume (PDF/DOCX/TXT)
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => handleResumeUpload(e.target.files?.[0])}
                />
              </label>
              <div className="mt-3 text-xs text-white/50">
                Local mode extracts text in your browser and stores it locally on the server.
              </div>
              {resumeText && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                  Detected resume text ({resumeText.length} chars)
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Resume summary</div>
                  <Wand2 className="size-4 text-neon-violet" />
                </div>
                <textarea
                  className="mt-3 min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summary will appear here…"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold">Primary skills</div>
                <input
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                  value={primarySkills}
                  onChange={(e) => setPrimarySkills(e.target.value)}
                  placeholder="React, Node.js, SQL…"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={saveSummaryAndContinue}
                  disabled={busy || !canNext}
                >
                  <Sparkles className="size-4" /> Continue
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)} disabled={busy}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Interview type</div>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                >
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Role</div>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Level</div>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neon-cyan/40"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option>Junior</option>
                  <option>Mid</option>
                  <option>Senior</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={startInterview} disabled={busy}>
                  Start interview →
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Why resume-first?</div>
          <div className="mt-3 space-y-3 text-sm text-white/70">
            <div className="rounded-2xl bg-white/5 p-4">
              Questions match your experience and projects.
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              Feedback is tied to your role expectations.
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              You can edit the summary to correct any extraction issues.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

