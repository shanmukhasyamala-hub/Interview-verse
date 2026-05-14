import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, Home, LogOut, Mic2, User } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import { cn } from "../lib/utils.js";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: Home },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/profile", label: "Profile", icon: User },
];

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <div className="md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-4">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-white/10">
              <Mic2 className="size-4 text-neon-cyan" />
            </div>
            <div className="text-sm font-semibold tracking-wide">
              InterviewVerse AI
            </div>
          </Link>
          <button
            className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl gap-4 px-4 pb-24 pt-6 md:gap-6 md:px-6 md:pb-6">
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="glass gradient-border rounded-2xl p-4">
            <Link to="/app/dashboard" className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-white/10">
                <Mic2 className="size-5 text-neon-cyan" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide">
                  InterviewVerse AI
                </div>
                <div className="text-xs text-white/60">
                  Modern mock interviews
                </div>
              </div>
            </Link>

            <div className="mt-6 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white",
                        isActive && "bg-white/10 text-white"
                      )
                    }
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {user?.displayName || "Candidate"}
                  </div>
                  <div className="truncate text-xs text-white/60">
                    {user?.email}
                  </div>
                </div>
                <button
                  className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  title="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="glass gradient-border rounded-2xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-auto max-w-7xl px-4 pb-4">
          <nav className="glass gradient-border rounded-2xl px-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white",
                        isActive && "bg-white/10 text-white"
                      )
                    }
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            <div className="mt-2 text-center text-[10px] text-white/40">
              Signed in as {user?.displayName || "Candidate"}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
