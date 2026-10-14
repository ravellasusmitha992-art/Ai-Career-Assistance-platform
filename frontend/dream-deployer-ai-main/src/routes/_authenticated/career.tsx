import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateCareerGuidance, type CareerGuidance } from "@/lib/ai.functions";
import { PageHeader, Panel, Chips, errMsg } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/career")({
  head: () => ({
    meta: [
      { title: "Career Guidance — Pathwise" },
      { name: "description", content: "AI-recommended career paths for your profile." },
    ],
  }),
  component: CareerPage,
});

function CareerPage() {
  const qc = useQueryClient();
  const gen = useServerFn(generateCareerGuidance);
  const [role, setRole] = useState("");
  const [roleError, setRoleError] = useState("");
  const [generatedRole, setGeneratedRole] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const latest = useQuery({
    queryKey: ["guidance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("career_guidance")
        .select("result")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.result as CareerGuidance | undefined) ?? null;
    },
  });

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetRole = role.trim();
    if (targetRole.length < 2) {
      setRoleError("Enter a career role with at least 2 characters.");
      return;
    }
    if (targetRole.length > 100) {
      setRoleError("Career role must be 100 characters or fewer.");
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setRoleError("");
    try {
      const guidance = await gen({ data: { targetRole } });
      qc.setQueryData(["guidance"], guidance);
      setGeneratedRole(targetRole);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const g =
    !role.trim() || role.trim().toLowerCase() === generatedRole.toLowerCase() ? latest.data : null;

  return (
    <>
      <PageHeader
        title="AI Career Guidance"
        subtitle="Career paths matched to your profile, skills and interests."
      >
        <form onSubmit={run} noValidate className="flex flex-wrap items-start gap-3">
          <div>
            <Input
              className="w-full sm:w-80"
              aria-label="Career role"
              aria-invalid={!!roleError}
              aria-describedby={roleError ? "career-role-error" : undefined}
              placeholder="e.g. Java Backend Developer"
              value={role}
              maxLength={100}
              onChange={(event) => {
                setRole(event.target.value);
                setRoleError("");
              }}
            />
            {roleError && (
              <p id="career-role-error" className="mt-1 text-sm text-destructive" role="alert">
                {roleError}
              </p>
            )}
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate Career Guidance"
            )}
          </Button>
        </form>
      </PageHeader>
      {busy && (
        <p className="mb-5 text-sm text-muted-foreground" role="status">
          Generating role-specific career guidance for {role.trim()}…
        </p>
      )}
      {!g && !busy && (
        <Panel>
          <p className="text-muted-foreground">
            Make sure your{" "}
            <Link to="/profile" className="font-semibold text-primary underline">
              profile
            </Link>{" "}
            has your skills and goals, enter a target role, and generate your career guidance.
          </p>
        </Panel>
      )}
      {g && (
        <>
          <Panel className="mb-6 bg-ink text-ink-foreground">
            <p>{g.overview}</p>
          </Panel>
          <div className="space-y-5">
            {g.careers.map((c) => (
              <Panel key={c.role}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-extrabold">{c.role}</h2>
                    <p className="text-sm text-muted-foreground">{c.salary_range}</p>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
                    {c.fit_score}% fit
                  </span>
                </div>
                <p className="mt-3 text-sm">{c.why}</p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-bold">Required skills</h4>
                    <Chips items={c.required_skills} />
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-bold">You already have</h4>
                    <Chips items={c.skills_you_have} tone="good" />
                  </div>
                </div>
                <h4 className="mb-2 mt-5 text-sm font-bold">Learning roadmap</h4>
                <ol className="space-y-2">
                  {c.roadmap.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-display font-extrabold text-primary">{i + 1}.</span>
                      <span className="flex-1">{s.step}</span>
                      <span className="text-muted-foreground">{s.duration}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/roadmap" search={{ role: c.role }}>
                      Build detailed roadmap
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/interview" search={{ role: c.role }}>
                      Practise interview
                    </Link>
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}
    </>
  );
}
