import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, UserRound, FileText, Compass, Briefcase, Mic, Map, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/resume", label: "Resume Analyzer", icon: FileText },
  { to: "/career", label: "Career Guidance", icon: Compass },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/interview", label: "Mock Interview", icon: Mic },
  { to: "/roadmap", label: "Roadmap", icon: Map },
] as const;

function AppShell() {
  const navigate = useNavigate();
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <Link to="/dashboard" className="font-display text-2xl font-extrabold text-sidebar-accent-foreground">
            path<span className="text-sidebar-primary">wise</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
          <button onClick={logout} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent md:mt-6">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
        <Outlet />
      </main>
    </div>
  );
}
