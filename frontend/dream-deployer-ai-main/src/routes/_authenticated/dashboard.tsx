import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/page";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pathwise" }, { name: "description", content: "Your career progress at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const [p, r, s, i, rm] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("resumes").select("match_score").order("created_at", { ascending: false }).limit(1),
        supabase.from("saved_jobs").select("status"),
        supabase.from("interviews").select("overall_score").not("overall_score", "is", null).order("created_at", { ascending: false }).limit(1),
        supabase.from("roadmaps").select("plan, completed, target_role").order("created_at", { ascending: false }).limit(1),
      ]);
      const roadmap = rm.data?.[0];
      const total = roadmap ? (roadmap.plan as any).weeks.reduce((a: number, w: any) => a + w.tasks.length, 0) : 0;
      return {
        profile: p.data,
        resumeScore: r.data?.[0]?.match_score ?? null,
        saved: s.data?.length ?? 0,
        applied: s.data?.filter((x) => x.status !== "saved").length ?? 0,
        interview: i.data?.[0]?.overall_score ?? null,
        roadmap: roadmap ? { role: roadmap.target_role, pct: total ? Math.round((roadmap.completed.length / total) * 100) : 0 } : null,
      };
    },
  });

  const p = data?.profile;
  const complete = p ? [p.full_name, p.degree, p.college, p.career_goal, p.skills?.length, p.interests?.length].filter(Boolean).length : 0;

  const stats = [
    { label: "Profile complete", value: `${Math.round((complete / 6) * 100)}%`, to: "/profile" as const },
    { label: "Latest resume score", value: data?.resumeScore ?? "—", to: "/resume" as const },
    { label: "Jobs saved / applied", value: `${data?.saved ?? 0} / ${data?.applied ?? 0}`, to: "/jobs" as const },
    { label: "Last interview score", value: data?.interview ?? "—", to: "/interview" as const },
    { label: "Roadmap progress", value: data?.roadmap ? `${data.roadmap.pct}%` : "—", to: "/roadmap" as const },
  ];

  return (
    <>
      <PageHeader title={`Hi${p?.full_name ? ", " + p.full_name.split(" ")[0] : ""} 👋`} subtitle={p?.career_goal ? `Goal: ${p.career_goal}` : "Start by completing your profile so the AI can personalise everything."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Panel className="transition hover:-translate-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-display text-4xl font-extrabold">{s.value}</p>
            </Panel>
          </Link>
        ))}
      </div>
      {complete < 4 && (
        <Panel className="mt-8 bg-ink text-ink-foreground">
          <h2 className="text-xl font-bold">Complete your profile first</h2>
          <p className="mt-1 text-sm opacity-80">Career guidance, job matching and roadmaps all use your skills and goals.</p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/profile">Fill profile</Link>
          </Button>
        </Panel>
      )}
    </>
  );
}
