import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Brain, Mic2, Sparkles, Zap } from "lucide-react";
import Button from "../ui/Button.jsx";

const features = [
  {
    icon: Sparkles,
    title: "Adaptive AI Questions",
    desc: "Dynamic interview flows with smart follow-ups based on your answers.",
  },
  {
    icon: Mic2,
    title: "Voice Interview Mode",
    desc: "Answer out loud, transcribe with Whisper, and review your transcript.",
  },
  {
    icon: Brain,
    title: "Feedback Dashboard",
    desc: "Confidence, communication, and technical skill evaluation in one place.",
  },
  {
    icon: Zap,
    title: "Progress Tracking",
    desc: "See your improvement trend over time and focus on the right gaps.",
  },
];

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="glass gradient-border grid size-10 place-items-center rounded-2xl">
              <Mic2 className="size-5 text-neon-cyan" />
            </div>
            <div className="text-sm font-semibold tracking-wide">
              InterviewVerse AI
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button>Get started</Button>
            </Link>
          </div>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-14 grid gap-8 md:mt-20 md:grid-cols-2 md:items-center"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/70">
              <span className="size-1.5 rounded-full bg-neon-cyan" />
              Futuristic mock interviews with AI
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Practice interviews like a{" "}
              <span className="bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-pink bg-[length:200%_200%] bg-clip-text text-transparent animate-shimmer">
                pro candidate
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg">
              Upload your resume, pick a role, and enter an AI-powered interview
              room. Speak your answers, get actionable feedback, and track your
              progress over time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button className="px-6 py-3">Start a mock interview</Button>
              </Link>
              <Link to="/auth">
                <Button variant="ghost" className="px-6 py-3">
                  View dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="glass gradient-border rounded-3xl p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Live Interview Preview</div>
                <div className="text-xs text-white/60">Demo</div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-white/70">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs text-white/50">Question</div>
                  <div className="mt-1 text-white">
                    Tell me about a project where you improved system
                    performance.
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs text-white/50">Answer (transcript)</div>
                  <div className="mt-1">
                    I profiled the API latency, optimized SQL indexes, and
                    reduced p95 from 1.2s to 320ms…
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs text-white/50">AI feedback</div>
                  <div className="mt-1">
                    Strong metrics. Add more context on trade-offs and testing.
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -inset-10 -z-10 opacity-60 blur-3xl">
              <div className="h-full w-full animate-float rounded-full bg-gradient-to-r from-neon-cyan/25 via-neon-violet/25 to-neon-pink/25" />
            </div>
          </div>
        </motion.section>

        <section className="mt-16 md:mt-24">
          <div className="grid gap-4 md:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="glass gradient-border rounded-2xl p-5">
                  <div className="grid size-10 place-items-center rounded-xl bg-white/5">
                    <Icon className="size-5 text-neon-violet" />
                  </div>
                  <div className="mt-4 text-sm font-semibold">{f.title}</div>
                  <div className="mt-2 text-sm text-white/65">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/50">
          © {new Date().getFullYear()} InterviewVerse AI — Built for mock
          interview practice.
        </footer>
      </div>
    </div>
  );
}

