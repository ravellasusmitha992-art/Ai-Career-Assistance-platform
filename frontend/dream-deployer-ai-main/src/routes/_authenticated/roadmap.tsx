import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { generateRoadmap, type RoadmapPlan } from "@/lib/ai.functions";
import { PageHeader, Panel, Chips, errMsg } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/roadmap")({
  validateSearch: z.object({ role: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Learning Roadmap — Pathwise" },
      { name: "description", content: "Your personalised week-by-week learning plan." },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const gen = useServerFn(generateRoadmap);
  const [role, setRole] = useState(search.role ?? "");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const busyRef = useRef(false);
  const autoRoleRef = useRef<string | null>(null);

  const { data: rm, error: loadError } = useQuery({
    queryKey: ["roadmap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmaps")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const create = useCallback(
    async (requestedRole: string, regenerate: boolean) => {
      const targetRole = requestedRole.trim();
      if (targetRole.length < 2 || targetRole.length > 100) {
        setFormError("Enter a career role between 2 and 100 characters.");
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setFormError("");
      try {
        const roadmap = await gen({ data: { targetRole, regenerate } });
        await qc.cancelQueries({ queryKey: ["roadmap"] });
        qc.setQueryData(["roadmap"], roadmap);
        setRole(targetRole);
      } catch (e) {
        const message = errMsg(e);
        setFormError(message);
        toast.error(message);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [gen, qc],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void create(role, false);
  }

  useEffect(() => {
    const targetRole = search.role?.trim();
    if (!targetRole || autoRoleRef.current === targetRole) return;
    autoRoleRef.current = targetRole;
    setRole(targetRole);
    void create(targetRole, false);
  }, [create, search.role]);

  useEffect(() => {
    if (!search.role && !role && rm?.target_role) setRole(rm.target_role);
  }, [role, rm, search.role]);

  async function toggle(taskId: string) {
    if (!rm) return;
    const completed = rm.completed.includes(taskId)
      ? rm.completed.filter((t) => t !== taskId)
      : [...rm.completed, taskId];
    qc.setQueryData(["roadmap"], { ...rm, completed });
    const { error } = await supabase
      .from("roadmaps")
      .update({ completed, updated_at: new Date().toISOString() })
      .eq("id", rm.id);
    if (error) toast.error(error.message);
  }

  const isCurrentRoadmap =
    !!rm && rm.target_role.trim().toLowerCase() === role.trim().toLowerCase();
  const currentRoadmap = isCurrentRoadmap ? rm : null;
  const plan = currentRoadmap?.plan as unknown as RoadmapPlan | undefined;
  const total = plan?.weeks.reduce((a, w) => a + w.tasks.length, 0) ?? 0;
  const pct = total ? Math.round(((currentRoadmap?.completed.length ?? 0) / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Personalised learning roadmap"
        subtitle="AI finds your missing skills and turns them into weekly tasks."
      />
      <Panel>
        <form className="flex flex-wrap gap-3" onSubmit={submit} noValidate>
          <Input
            className="max-w-sm"
            value={role}
            maxLength={100}
            aria-label="Target career role"
            aria-invalid={!!formError}
            aria-describedby={formError ? "roadmap-error" : undefined}
            onChange={(e) => {
              setRole(e.target.value);
              setFormError("");
            }}
            placeholder="Target role, e.g. Java Developer"
          />
          <Button type="submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building…
              </>
            ) : (
              "Build roadmap"
            )}
          </Button>
          {isCurrentRoadmap && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void create(role, true)}
              disabled={busy}
            >
              Regenerate roadmap
            </Button>
          )}
          {formError && (
            <p id="roadmap-error" role="alert" className="w-full text-sm text-destructive">
              {formError}
            </p>
          )}
        </form>
      </Panel>

      {loadError && (
        <p className="mt-5 text-sm text-destructive" role="alert">
          {errMsg(loadError)}
        </p>
      )}
      {busy && (
        <p className="mt-5 text-sm text-muted-foreground" role="status">
          Building a roadmap for {role.trim()}…
        </p>
      )}
      {!busy && role.trim().length >= 2 && !currentRoadmap && !formError && (
        <p className="mt-5 text-sm text-muted-foreground">Submit the role to load its roadmap.</p>
      )}

      {currentRoadmap && plan && (
        <div className="mt-8 space-y-5">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold">{currentRoadmap.target_role}</h2>
              <span className="font-display text-2xl font-extrabold text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="mt-3" />
            {plan.source === "fallback" && (
              <p
                className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground"
                role="status"
              >
                {plan.fallbackMessage ??
                  "This is a curated, role-specific fallback roadmap, not Gemini-generated content."}
              </p>
            )}
            {plan.source === "gemini" && (
              <p className="mt-3 text-sm text-muted-foreground" role="status">
                Generated by Gemini for this role.
              </p>
            )}
            {!plan.source && (
              <p className="mt-3 text-sm text-muted-foreground" role="status">
                This saved roadmap predates source tracking; whether it was generated by Gemini or
                the fallback is unknown.
              </p>
            )}
            <h4 className="mb-2 mt-5 text-sm font-bold">Your strengths</h4>
            <Chips items={plan.strengths ?? []} tone="good" />
            <h4 className="mb-2 mt-5 text-sm font-bold">Missing skills</h4>
            <Chips items={plan.missing_skills} tone="bad" />
          </Panel>
          {plan.weeks.map((w) => (
            <Panel key={w.week}>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Week {w.week}
              </p>
              <h3 className="text-xl font-bold">{w.topic}</h3>
              <p className="text-sm text-muted-foreground">{w.goal}</p>
              <div className="mt-4 space-y-2">
                {w.tasks.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-start gap-3 text-sm">
                    <Checkbox
                      checked={currentRoadmap.completed.includes(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                      className="mt-0.5"
                    />
                    <span
                      className={
                        currentRoadmap.completed.includes(t.id)
                          ? "text-muted-foreground line-through"
                          : ""
                      }
                    >
                      {t.title}
                    </span>
                  </label>
                ))}
              </div>
              {!!w.projects?.length && (
                <div className="mt-5">
                  <h4 className="mb-2 text-sm font-bold">Suggested projects</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {w.projects.map((project, i) => (
                      <li key={i}>{project}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-bold">Practice questions</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {w.practice_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-bold">Resources</h4>
                  <ul className="space-y-1 text-sm">
                    {w.resources.map((r, i) => (
                      <li key={i}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline"
                        >
                          {r.title} <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
