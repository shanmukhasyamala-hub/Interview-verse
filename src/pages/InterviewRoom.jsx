import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { apiGet, apiPatch, apiPost, apiUploadAudio } from "../lib/api";
import Button from "../ui/Button";
import { Mic, Square, Sparkles, Wand2 } from "lucide-react";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function InterviewRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Webcam + basic motion-based nervousness heuristic
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [motion, setMotion] = useState(0); // 0..100
  const streamRef = useRef(null);
  const prevFrameRef = useRef(null);

  useEffect(() => {
    if (!user || !id) return;
    let alive = true;
    const load = async () => {
      try {
        const out = await apiGet(`/api/interviews/${id}`);
        if (!alive) return;
        setSession(out.interview);
      } catch {
        if (!alive) return;
        setSession(null);
      }
    };
    load();
    const t = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, id]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    apiGet("/api/profile")
      .then((out) => {
        if (!alive) return;
        setProfile(out.profile || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    let t = null;
    async function startCam() {
      if (!camOn) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      t = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const w = 160;
        const h = 120;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h).data;

        if (prevFrameRef.current) {
          let diff = 0;
          for (let i = 0; i < img.length; i += 16) {
            diff += Math.abs(img[i] - prevFrameRef.current[i]);
          }
          const normalized = Math.min(100, Math.round((diff / (img.length / 16)) * 0.9));
          setMotion(normalized);
        }
        prevFrameRef.current = img;
      }, 900);
    }

    startCam().catch(() => {});
    return () => {
      if (t) clearInterval(t);
      prevFrameRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, [camOn]);

  const currentQuestion = useMemo(() => {
    if (!session?.questions?.length) return null;
    return session.questions[session.currentIndex || 0] || null;
  }, [session]);

  const currentAnswer = useMemo(() => {
    const idx = session?.currentIndex || 0;
    return session?.answers?.find((a) => a.questionIndex === idx) || null;
  }, [session]);

  async function generateQuestionsIfNeeded() {
    if (!user || !session) return;
    if ((session.questions || []).length > 0) return;
    setBusy(true);
    setErr("");
    try {
      const resumeContext =
        profile?.summary ||
        "No resume summary provided. Ask general interview questions.";
      const out = await apiPost("/api/ai/questions", {
        role: session.role,
        level: session.level,
        interviewType: session.interviewType || "mixed",
        resumeContext,
      });
      const questions = (out.questions || []).map((text, i) => ({
        id: `q${i + 1}`,
        type: "main",
        text,
      }));
      const patched = await apiPatch(`/api/interviews/${session.id}`, { questions });
      setSession(patched.interview);
    } catch (e) {
      setErr(e?.message || "Failed to generate questions");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    generateQuestionsIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  async function startRecording() {
    setErr("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
  }

  async function stopRecordingAndTranscribe() {
    if (!recorderRef.current || !session || !user) return;
    setRecording(false);
    setBusy(true);
    setErr("");
    try {
      const rec = recorderRef.current;
      await new Promise((resolve) => {
        rec.onstop = () => resolve();
        rec.stop();
      });

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const stt = await apiUploadAudio("/api/stt/transcribe", blob, {
        language: "en",
      });
      const transcript = stt.text || "";

      const idx = session.currentIndex || 0;
      const nextAnswers = [...(session.answers || [])].filter(
        (a) => a.questionIndex !== idx
      );
      nextAnswers.push({
        questionIndex: idx,
        question: currentQuestion?.text || "",
        transcript,
        createdAt: new Date().toISOString(),
      });

      const patchedAnswers = await apiPatch(`/api/interviews/${session.id}`, {
        answers: nextAnswers,
      });
      setSession(patchedAnswers.interview);

      // Adaptive follow-up: add a follow-up question after a main question.
      const cq = currentQuestion;
      if (cq?.type === "main") {
        const out = await apiPost("/api/ai/followup", {
          role: session.role,
          level: session.level,
          question: cq.text,
          answer: transcript,
          resumeContext: profile?.summary || "",
        });
        if (out?.question) {
          const newQuestions = [...(session.questions || [])];
          newQuestions.splice(idx + 1, 0, {
            id: `fu-${Date.now()}`,
            type: "followup",
            text: out.question,
          });
          const patchedQuestions = await apiPatch(`/api/interviews/${session.id}`, {
            questions: newQuestions,
          });
          setSession(patchedQuestions.interview);
        }
      }
    } catch (e) {
      setErr(e?.message || "Transcription failed");
    } finally {
      setBusy(false);
    }
  }

  async function nextQuestion() {
    if (!user || !session) return;
    const next = Math.min(
      (session.currentIndex || 0) + 1,
      (session.questions || []).length - 1
    );
    const patched = await apiPatch(`/api/interviews/${session.id}`, {
      currentIndex: next,
    });
    setSession(patched.interview);
  }

  async function finishInterview() {
    if (!user || !session) return;
    setBusy(true);
    setErr("");
    try {
      const transcript = (session.answers || [])
        .sort((a, b) => a.questionIndex - b.questionIndex)
        .map((a) => `Q: ${a.question}\nA: ${a.transcript}`)
        .join("\n\n");

      const out = await apiPost("/api/ai/feedback", {
        role: session.role,
        level: session.level,
        transcript,
      });

      const parsed = typeof out?.raw === "string" ? safeJsonParse(out.raw) : out;
      const scores = parsed?.scores || parsed?.evaluation?.scores || null;
      const feedback = parsed?.feedback || parsed?.evaluation?.feedback || parsed;

      const patched = await apiPatch(`/api/interviews/${session.id}`, {
        status: "completed",
        feedback,
        scores,
      });
      setSession(patched.interview);
    } catch (e) {
      setErr(e?.message || "Failed to generate feedback");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="text-sm text-white/60">
        Loading interview session…
      </div>
    );
  }

  const idx = session.currentIndex || 0;
  const isLast = idx >= (session.questions?.length || 0) - 1;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-white/60">Interview room</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {session.role} · {session.level}
          </h2>
          <div className="mt-2 text-sm text-white/60">
            Question {idx + 1} of {session.questions?.length || 0} · Status:{" "}
            {session.status}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={generateQuestionsIfNeeded}
            disabled={busy || (session.questions || []).length > 0}
          >
            <Wand2 className="size-4" /> Generate questions
          </Button>
          <Button onClick={finishInterview} disabled={busy || session.status === "completed"}>
            <Sparkles className="size-4" /> Finish & get feedback
          </Button>
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <div className="glass rounded-2xl p-5 md:col-span-3">
          <div className="text-xs text-white/60">Current question</div>
          <div className="mt-2 text-lg font-semibold">
            {currentQuestion?.text || "Generating…"}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!recording ? (
              <Button onClick={startRecording} disabled={busy || !currentQuestion}>
                <Mic className="size-4" /> Start recording
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={stopRecordingAndTranscribe}
                disabled={busy}
              >
                <Square className="size-4" /> Stop & transcribe
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={nextQuestion}
              disabled={busy || isLast}
            >
              Next question →
            </Button>
          </div>

          <div className="mt-5">
            <div className="text-xs text-white/60">Transcript</div>
            <div className="mt-2 min-h-24 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
              {busy && !recording && !currentAnswer?.transcript
                ? "Transcribing…"
                : currentAnswer?.transcript || "Record an answer to generate transcript."}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="text-sm font-semibold">Feedback & body language</div>
          <div className="mt-2 text-sm text-white/60">
            Complete the interview to get full analytics.
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/50">Webcam</div>
                  <div className="mt-1 text-sm text-white/80">
                    {camOn ? "On" : "Off"} · Nervousness:{" "}
                    <span className="font-semibold">
                      {Math.min(100, Math.round(motion))}%
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    Heuristic: higher motion = more fidgeting.
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setCamOn((v) => !v)}
                  disabled={busy}
                >
                  {camOn ? "Stop" : "Start"}
                </Button>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <video ref={videoRef} className="h-40 w-full object-cover" playsInline muted />
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-white/50">Overall</div>
              <div className="mt-1 text-xl font-semibold">
                {session.scores?.overall != null ? `${session.scores.overall}/100` : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-white/50">Confidence</div>
              <div className="mt-1 text-lg font-semibold">
                {session.scores?.confidence != null ? `${session.scores.confidence}/100` : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-white/50">Communication</div>
              <div className="mt-1 text-lg font-semibold">
                {session.scores?.communication != null ? `${session.scores.communication}/100` : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
