import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { startInterview, submitInterview, type InterviewQuestion, type InterviewFeedback } from "@/lib/ai.functions";
import { PageHeader, Panel, ScoreRing, errMsg } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/interview")({
  validateSearch: z.object({ role: z.string().optional() }),
  head: () => ({ meta: [{ title: "Mock Interview — Pathwise" }, { name: "description", content: "AI mock interviews with feedback." }] }),
  component: InterviewPage,
});

const ROLES = ["Java Developer", "Software Tester", "Data Analyst", "Frontend Developer", "Python Developer", "Full Stack Developer"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isInterviewQuestions(value: unknown): value is InterviewQuestion[] {
  return Array.isArray(value) && value.every((question) =>
    isRecord(question) &&
    typeof question["id"] === "string" &&
    (question["type"] === "technical" || question["type"] === "hr") &&
    typeof question["question"] === "string"
  );
}

function isInterviewAnswers(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((answer) => typeof answer === "string");
}

function isInterviewFeedback(value: unknown): value is InterviewFeedback {
  return (
    isRecord(value) &&
    typeof value["overall_score"] === "number" &&
    typeof value["summary"] === "string" &&
    Array.isArray(value["tips"]) &&
    value["tips"].every((tip) => typeof tip === "string") &&
    Array.isArray(value["items"]) &&
    value["items"].every((item) =>
      isRecord(item) &&
      typeof item["id"] === "string" &&
      typeof item["score"] === "number" &&
      typeof item["feedback"] === "string" &&
      typeof item["ideal_answer"] === "string"
    )
  );
}

function InterviewPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const start = useServerFn(startInterview);
  const submit = useServerFn(submitInterview);
  const [role, setRole] = useState(search.role ?? "Java Developer");
  const [technologies, setTechnologies] = useState("");
  const [session, setSession] = useState<{ id: string; questions: InterviewQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const history = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => (await supabase.from("interviews").select("id, role, overall_score, created_at, questions, answers, feedback").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  async function begin() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback(null);
    setAnswers({});
    try {
      setSession(await start({ data: { role, technologies } }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function finish() {
    if (!session) return;
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      setFeedback(await submit({ data: { id: session.id, answers } }));
      qc.invalidateQueries({ queryKey: ["interviews"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="AI Mock Interview" subtitle="Pick a role, answer technical and HR questions, get scored feedback." />
      <Panel>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button key={r} onClick={() => setRole(r)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${role === r ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input className="max-w-xs" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Or type any role" />
          <Input className="max-w-sm" value={technologies} onChange={(e) => setTechnologies(e.target.value)} placeholder="Technologies (e.g. Java, Spring Boot, SQL)" aria-label="Technologies for interview questions" />
          <Button onClick={begin} disabled={busy || role.length < 2}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing…</> : "Start interview"}
          </Button>
        </div>
      </Panel>

      {feedback && session && (
        <div className="mt-8 space-y-4">
          <Panel className="flex flex-wrap items-center gap-6">
            <ScoreRing score={feedback.overall_score} label="Overall" />
            <div className="flex-1">
              <p>{feedback.summary}</p>
              <h4 className="mb-1 mt-4 text-sm font-bold">Improvement tips</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm">{feedback.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          </Panel>
          {session.questions.map((q) => {
            const f = feedback.items.find((i) => i.id === q.id);
            return (
              <Panel key={q.id}>
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{q.question}</p>
                  {f && <span className="font-display text-xl font-extrabold text-primary">{f.score}/10</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Your answer: {answers[q.id] || "(no answer)"}</p>
                {f && (
                  <>
                    <p className="mt-3 text-sm">{f.feedback}</p>
                    <p className="mt-2 rounded-lg bg-muted p-3 text-sm"><b>Ideal answer:</b> {f.ideal_answer}</p>
                  </>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {session && !feedback && (
        <div className="mt-8 space-y-4">
          {session.questions.map((q, i) => (
            <Panel key={q.id}>
              <p className="text-xs font-bold uppercase tracking-wider text-accent-foreground">
                <span className="rounded bg-accent px-2 py-0.5">{q.type === "hr" ? "HR" : "Technical"}</span> Question {i + 1}
              </p>
              <p className="mt-2 font-semibold">{q.question}</p>
              <Textarea className="mt-3" rows={4} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Type your answer…" />
            </Panel>
          ))}
          <Button size="lg" onClick={finish} disabled={busy}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Evaluating…</> : "Submit answers"}
          </Button>
        </div>
      )}

      {!!history.data?.length && (
        <div className="mt-10">
          <h2 className="mb-3 text-xl font-bold">Interview history</h2>
          <div className="space-y-2">
            {history.data.map((h) => (
              <button
                key={h.id}
                disabled={!h.feedback}
                onClick={() => {
                  if (!isInterviewQuestions(h.questions) || !isInterviewFeedback(h.feedback)) {
                    toast.error("This saved interview has incomplete results and cannot be reopened.");
                    return;
                  }
                  setSession({ id: h.id, questions: h.questions });
                  setAnswers(isInterviewAnswers(h.answers) ? h.answers : {});
                  setFeedback(h.feedback);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <span className="font-medium">{h.role}</span>
                <span className="text-sm text-muted-foreground">{new Date(h.created_at).toLocaleDateString()} · {h.overall_score ?? "not submitted"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
