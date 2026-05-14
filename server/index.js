import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import admin from "firebase-admin";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { nanoid } from "nanoid";

import { authenticate, createUser, signToken, verifyToken } from "./lib/localAuth.js";
import { readDb, writeDb } from "./lib/localDb.js";
import {
  generateFeedback,
  generateFollowUp,
  generateQuestions,
  summarizeResume,
  stubTranscribe,
} from "./lib/stubAi.js";

const AUTH_MODE = (process.env.AUTH_MODE || "local").toLowerCase(); // local | firebase

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// ----------------------------
// Auth middleware (local or firebase)
// ----------------------------
function initFirebaseAdminIfNeeded() {
  if (AUTH_MODE !== "firebase") return;
  if (admin.apps.length) return;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    return;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");
    const cred = JSON.parse(json);
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    return;
  }

  admin.initializeApp(); // GOOGLE_APPLICATION_CREDENTIALS
}

initFirebaseAdminIfNeeded();

async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice("Bearer ".length) : null;
  if (!token) return res.status(401).json({ error: "Missing Bearer token" });

  try {
    if (AUTH_MODE === "firebase") {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name,
      };
      return next();
    }

    const decoded = verifyToken(token);
    req.user = {
      uid: decoded.sub,
      email: decoded.email,
      displayName: decoded.displayName,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

// ----------------------------
// AI providers (cloud mode)
// ----------------------------
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callOpenAIJson({ system, user, model }) {
  if (!openai) throw new Error("OPENAI_API_KEY is not set");
  const resp = await openai.chat.completions.create({
    model: model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return { text: resp.choices?.[0]?.message?.content || "" };
}

async function callGeminiText(prompt, modelName) {
  if (!gemini) throw new Error("GEMINI_API_KEY is not set");
  const model = gemini.getGenerativeModel({
    model: modelName || process.env.GEMINI_MODEL || "gemini-1.5-flash",
  });
  const result = await model.generateContent(prompt);
  return { text: result.response.text() };
}

async function aiJson({ system, user, schemaHint }) {
  const prompt =
    `${system}\n\n` +
    `Return ONLY valid JSON. ${schemaHint ? `Schema: ${schemaHint}` : ""}\n\n` +
    `User:\n${user}`;

  if (openai) {
    try {
      const { text } = await callOpenAIJson({ system, user: prompt });
      const parsed = safeJsonParse(text);
      if (parsed) return { parsed, raw: text, provider: "openai" };
      throw new Error("OpenAI did not return valid JSON");
    } catch (e) {
      if (!gemini) throw e;
    }
  }

  const { text } = await callGeminiText(prompt);
  const parsed = safeJsonParse(text);
  if (!parsed) throw new Error("Gemini did not return valid JSON");
  return { parsed, raw: text, provider: "gemini" };
}

// ----------------------------
// Routes
// ----------------------------
app.get("/health", (_req, res) => res.json({ ok: true, authMode: AUTH_MODE }));

// Local auth (offline)
app.post("/api/auth/signup", async (req, res) => {
  if (AUTH_MODE !== "local")
    return res.status(400).json({ error: "AUTH_MODE is not local" });
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Missing email/password" });
    const user = await createUser({ email, password, displayName });
    const token = signToken(user);
    return res.json({
      token,
      user: { uid: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  if (AUTH_MODE !== "local")
    return res.status(400).json({ error: "AUTH_MODE is not local" });
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Missing email/password" });
    const user = await authenticate({ email, password });
    const token = signToken(user);
    return res.json({
      token,
      user: { uid: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

app.get("/api/me", requireAuth, async (req, res) => res.json({ user: req.user }));

// Local resume uploads + profile
const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.get("/api/profile", requireAuth, async (req, res) => {
  const db = await readDb();
  return res.json({ profile: db.profiles?.[req.user.uid] || null });
});

app.post("/api/profile", requireAuth, async (req, res) => {
  const { summary = "", primarySkills = [], resumeText } = req.body || {};
  const db = await readDb();
  db.profiles = db.profiles || {};
  const prev = db.profiles[req.user.uid] || {};
  db.profiles[req.user.uid] = {
    ...prev,
    ...(resumeText ? { resumeText } : {}),
    summary,
    primarySkills,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return res.json({ profile: db.profiles[req.user.uid] });
});

app.post(
  "/api/resume/upload",
  requireAuth,
  uploadDisk.single("resume"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Missing file" });
    const resumeUrl = `/uploads/${req.file.filename}`;
    const db = await readDb();
    db.profiles = db.profiles || {};
    const prev = db.profiles[req.user.uid] || {};
    db.profiles[req.user.uid] = {
      ...prev,
      resumePath: req.file.path,
      resumeUrl,
      updatedAt: new Date().toISOString(),
    };
    await writeDb(db);
    return res.json({ resumeUrl });
  }
);

app.post("/api/resume/summarize", requireAuth, async (req, res) => {
  const { resumeText } = req.body || {};

  if (AUTH_MODE === "local") {
    return res.json({ ...summarizeResume({ resumeText }), provider: "local-stub" });
  }

  const system =
    "You are an expert resume analyzer. Summarize the candidate and extract primary skills.";
  const user =
    `Resume text:\n${resumeText}\n\n` +
    `Return a concise summary (4-6 bullet points max) and a list of primary skills (max 12).`;
  const schemaHint = `{ "summary": "string", "primarySkills": ["string"] }`;

  try {
    const out = await aiJson({ system, user, schemaHint });
    return res.json({ ...out.parsed, provider: out.provider });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Local interview storage
app.get("/api/interviews", requireAuth, async (req, res) => {
  const db = await readDb();
  const items = (db.interviews || [])
    .filter((x) => x.userId === req.user.uid)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return res.json({ interviews: items });
});

app.post("/api/interviews", requireAuth, async (req, res) => {
  const { role = "Software Engineer", level = "Mid", interviewType = "mixed" } =
    req.body || {};
  const db = await readDb();
  const interview = {
    id: nanoid(),
    userId: req.user.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role,
    level,
    interviewType,
    status: "draft",
    currentIndex: 0,
    questions: [],
    answers: [],
    scores: null,
    feedback: null,
  };
  db.interviews = db.interviews || [];
  db.interviews.push(interview);
  await writeDb(db);
  return res.json({ interview });
});

app.get("/api/interviews/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const interview = (db.interviews || []).find(
    (x) => x.id === req.params.id && x.userId === req.user.uid
  );
  if (!interview) return res.status(404).json({ error: "Not found" });
  return res.json({ interview });
});

app.patch("/api/interviews/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const idx = (db.interviews || []).findIndex(
    (x) => x.id === req.params.id && x.userId === req.user.uid
  );
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.interviews[idx] = {
    ...db.interviews[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return res.json({ interview: db.interviews[idx] });
});

// AI routes
app.post("/api/ai/questions", requireAuth, async (req, res) => {
  const { role, level, resumeContext, interviewType } = req.body || {};
  if (AUTH_MODE === "local") {
    return res.json({
      ...generateQuestions({ role, level, resumeContext, interviewType }),
      provider: "local-stub",
    });
  }

  const system =
    "You are InterviewVerse AI. You generate interview questions for mock interviews.";
  const user =
    `Generate 6 interview questions for the role: ${role} at level: ${level}.\n` +
    `Interview type: ${interviewType || "mixed"}.\n` +
    `Use this resume/profile context:\n${resumeContext}\n\n` +
    `Keep each question 1-2 sentences. If type is not mixed, bias heavily towards that type.`;
  const schemaHint = `{ "questions": ["string", "..."] }`;

  try {
    const out = await aiJson({ system, user, schemaHint });
    return res.json({ ...out.parsed, provider: out.provider });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ai/followup", requireAuth, async (req, res) => {
  const { role, level, question, answer, resumeContext } = req.body || {};
  if (AUTH_MODE === "local") {
    return res.json({
      ...generateFollowUp({ role, level, question, answer, resumeContext }),
      provider: "local-stub",
    });
  }

  const system =
    "You are InterviewVerse AI. You generate a single adaptive follow-up question based on the candidate's answer.";
  const user =
    `Role: ${role} (${level})\n` +
    `Resume context:\n${resumeContext || "(none)"}\n\n` +
    `Current question: ${question}\n` +
    `Candidate answer: ${answer}\n\n` +
    `Generate ONE follow-up question that probes deeper, asks for metrics/tradeoffs, or clarifies assumptions.`;
  const schemaHint = `{ "question": "string" }`;

  try {
    const out = await aiJson({ system, user, schemaHint });
    return res.json({ ...out.parsed, provider: out.provider });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ai/feedback", requireAuth, async (req, res) => {
  const { role, level, transcript } = req.body || {};
  if (AUTH_MODE === "local") {
    const out = generateFeedback({ role, level, transcript });
    return res.json({
      ...out,
      raw: JSON.stringify(out, null, 2),
      provider: "local-stub",
    });
  }

  const system =
    "You are InterviewVerse AI. You evaluate mock interview transcripts and return structured feedback.";
  const user =
    `Evaluate this mock interview for: ${role} (${level}).\n\n` +
    `Transcript:\n${transcript}\n\n` +
    `Provide: confidence and communication analysis, technical skill evaluation, strengths, improvements, and actionable next steps.`;

  const schemaHint = `{
  "scores": {
    "overall": 0,
    "confidence": 0,
    "communication": 0,
    "technical": 0
  },
  "feedback": {
    "summary": "string",
    "strengths": ["string"],
    "improvements": ["string"],
    "communication": {"notes": "string", "fillerWords": "string", "structure": "string"},
    "confidence": {"notes": "string", "presence": "string"},
    "technical": {"notes": "string", "accuracy": "string"},
    "nextSteps": ["string"]
  }
}`;

  try {
    const out = await aiJson({ system, user, schemaHint });
    return res.json({ ...out.parsed, raw: out.raw, provider: out.provider });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Speech-to-text (local stub or Whisper)
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.post(
  "/api/stt/transcribe",
  requireAuth,
  uploadMem.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Missing audio file" });

      if (AUTH_MODE === "local") {
        return res.json(stubTranscribe({ bytes: req.file.buffer?.length || 0 }));
      }

      if (!openai) {
        return res.status(400).json({
          error:
            "OPENAI_API_KEY is required for Whisper transcription (or set AUTH_MODE=local for stubbed STT).",
        });
      }

      const tmpPath = path.join(os.tmpdir(), `iv-audio-${Date.now()}.webm`);
      await fs.promises.writeFile(tmpPath, req.file.buffer);

      const language = req.body?.language || undefined;
      const resp = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: "whisper-1",
        language,
      });

      await fs.promises.unlink(tmpPath).catch(() => {});
      return res.json({ text: resp.text || "" });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
);

const PORT = process.env.PORT || 5175;

// ----------------------------
// Serve built client (single public link deployment)
// ----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../dist");

if (process.env.SERVE_CLIENT === "true" || process.env.NODE_ENV === "production") {
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    // SPA fallback (avoid /api and /uploads)
    app.get(/^\/(?!api|uploads).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `InterviewVerse AI server running on http://localhost:${PORT} (AUTH_MODE=${AUTH_MODE})`
  );
});
