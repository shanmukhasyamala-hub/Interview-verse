function pick(arr, i) {
  return arr[i % arr.length];
}

export function generateQuestions({
  role = "Software Engineer",
  level = "Mid",
  resumeContext = "",
  interviewType = "mixed",
}) {
  const tech = [
    `Walk me through a recent feature you built as a ${role}. What trade-offs did you make?`,
    `How would you debug a production performance issue in a ${role} role?`,
    `Explain a time you improved reliability or reduced latency. What metrics did you track?`,
  ];
  const beh = [
    `Tell me about a conflict in a team and how you resolved it.`,
    `Describe a time you received critical feedback. What did you change?`,
  ];
  const sys = [
    `Design a scalable service for scheduling mock interviews with voice recordings and analytics.`,
  ];

  const hasContext = typeof resumeContext === "string" && resumeContext.trim().length > 0;
  const contextHint = hasContext ? ` (based on your profile: ${resumeContext.slice(0, 120)}...)` : "";

  const picked =
    interviewType === "technical"
      ? [...tech, ...tech.slice(0, 2)]
      : interviewType === "behavioral"
        ? [...beh, ...beh, pick(tech, 0)]
        : interviewType === "system-design"
          ? [...sys, pick(sys, 0), pick(tech, 1), pick(beh, 0), pick(beh, 1), pick(tech, 2)]
          : [...tech, ...beh, ...sys];

  const questions = picked.map((q) => `${q}${contextHint}${interviewType !== "mixed" ? ` [${interviewType}]` : ""}`);
  return { questions };
}

export function summarizeResume({ resumeText = "" }) {
  const clean = String(resumeText || "")
    .replace(/\s+/g, " ")
    .trim();
  const snippet = clean.slice(0, 600);

  const summary =
    clean.length < 20
      ? "Resume text is empty. Please upload a valid resume."
      : `Candidate summary (local stub): ${snippet}${clean.length > 600 ? "…" : ""}`;

  // naive skill extraction
  const known = [
    "react",
    "node",
    "express",
    "javascript",
    "typescript",
    "python",
    "java",
    "sql",
    "mongodb",
    "firebase",
    "aws",
    "docker",
    "kubernetes",
    "system design",
    "data structures",
    "algorithms",
  ];
  const lower = clean.toLowerCase();
  const skills = known.filter((k) => lower.includes(k));
  const primarySkills = skills
    .map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()))
    .slice(0, 10);

  return { summary, primarySkills };
}

export function generateFollowUp({ question = "", answer = "" }) {
  const probes = [
    "What metric improved, and by how much?",
    "What alternatives did you consider, and why did you reject them?",
    "What was the biggest risk, and how did you mitigate it?",
    "How would you test and monitor this in production?",
  ];
  const base = probes[Math.min(3, Math.floor((answer || "").length / 120))] || probes[0];
  return { question: `${base} (Follow-up)` };
}

export function generateFeedback({ transcript = "" }) {
  const len = transcript.trim().length;
  const overall = Math.max(35, Math.min(92, Math.round(40 + len / 80)));
  const confidence = Math.max(30, Math.min(95, Math.round(35 + len / 95)));
  const communication = Math.max(30, Math.min(95, Math.round(38 + len / 90)));
  const technical = Math.max(30, Math.min(95, Math.round(36 + len / 88)));

  return {
    scores: { overall, confidence, communication, technical },
    feedback: {
      summary:
        "Solid structure and relevant examples. Add sharper metrics, clearer trade-offs, and tighter conclusions for each answer.",
      strengths: [
        "Answers are generally structured and on-topic.",
        "You reference implementation details, showing hands-on experience.",
        "Good intent to quantify impact (continue doing this).",
      ],
      improvements: [
        "Add concrete metrics (latency, throughput, cost, adoption).",
        "Call out trade-offs explicitly (complexity vs speed vs reliability).",
        "Close each answer with outcomes and learnings.",
      ],
      communication: {
        notes: "Good pacing and clarity. Reduce filler and add signposting.",
        fillerWords: "Watch for repeated 'like', 'basically', 'actually'.",
        structure: "Use STAR for behavioral answers and 'problem → approach → result' for technical answers.",
      },
      confidence: {
        notes: "Tone is professional. Be more decisive when recommending approaches.",
        presence: "Lead with the strongest point, then support it with evidence.",
      },
      technical: {
        notes: "Shows baseline competency. Go deeper into edge-cases and failure modes.",
        accuracy: "When unsure, state assumptions and validate them.",
      },
      nextSteps: [
        "Run 2 more sessions and focus on quantifying impact.",
        "Practice 60–90s concise answers for top 10 questions.",
        "Add one system design deep-dive per week.",
      ],
    },
  };
}

export function stubTranscribe({ bytes = 0 }) {
  const seconds = Math.max(4, Math.min(45, Math.round(bytes / 14000)));
  return {
    text: `Transcribed (local stub): Answer captured (~${seconds}s). Replace with Whisper/OpenAI for real transcription.`,
  };
}
