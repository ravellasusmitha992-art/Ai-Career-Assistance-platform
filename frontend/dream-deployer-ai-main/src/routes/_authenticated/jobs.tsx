import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Chips, errMsg } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Pathwise" }, { name: "description", content: "Skill-matched job recommendations and application tracking." }] }),
  component: JobsPage,
});

const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"] as const;

function JobsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const [open, setOpen] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const [j, p, s] = await Promise.all([
        supabase.from("jobs").select("*"),
        supabase.from("profiles").select("skills").eq("id", u.user!.id).maybeSingle(),
        supabase.from("saved_jobs").select("*"),
      ]);
      return { uid: u.user!.id, jobs: j.data ?? [], skills: (p.data?.skills ?? []).map((x) => x.toLowerCase()), saved: s.data ?? [] };
    },
  });

  const scored = useMemo(() => {
    if (!data) return [];
    return data.jobs
      .map((j) => {
        const match = j.skills.filter((s) => data.skills.includes(s.toLowerCase()));
        return { ...j, match, score: j.skills.length ? Math.round((match.length / j.skills.length) * 100) : 0 };
      })
      .sort((a, b) => b.score - a.score);
  }, [data]);

  const locations = Array.from(new Set(data?.jobs.map((j) => j.location) ?? [])).sort();
  const filtered = scored.filter(
    (j) => (loc === "all" || j.location === loc) && (!q || (j.title + j.company + j.skills.join(" ")).toLowerCase().includes(q.toLowerCase())),
  );
  const savedMap = new Map(data?.saved.map((s) => [s.job_id, s]) ?? []);

  async function toggleSave(jobId: string) {
    try {
      const s = savedMap.get(jobId);
      if (s) await supabase.from("saved_jobs").delete().eq("id", s.id);
      else {
        const { error } = await supabase.from("saved_jobs").insert({ user_id: data!.uid, job_id: jobId });
        if (error) throw error;
        toast.success("Job saved");
      }
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function setStatus(id: string, status: string) {
    await supabase.from("saved_jobs").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  const JobCard = ({ j }: { j: (typeof scored)[number] }) => (
    <Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{j.title}</h3>
          <p className="text-sm text-muted-foreground">{j.company}</p>
        </div>
        <button onClick={() => toggleSave(j.id)} aria-label="Save job" className="text-primary">
          {savedMap.has(j.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" /> {j.location} · {j.job_type} · {j.experience}
      </p>
      <div className="mt-3"><Chips items={j.skills} /></div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className={`text-sm font-bold ${j.score >= 50 ? "text-success" : "text-muted-foreground"}`}>{j.score}% skill match</span>
        <Button size="sm" variant="outline" onClick={() => setOpen(j)}>Details</Button>
      </div>
    </Panel>
  );

  return (
    <>
      <PageHeader title="Job recommendations" subtitle="Sorted by how well your profile skills match. Sample listings for now." />
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Recommended</TabsTrigger>
          <TabsTrigger value="tracker">My applications ({data?.saved.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <div className="mb-6 flex flex-wrap gap-3">
            <Input className="max-w-xs" placeholder="Search title, company, skill…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={loc} onValueChange={setLoc}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">{filtered.map((j) => <JobCard key={j.id} j={j} />)}</div>
          {!filtered.length && <p className="text-muted-foreground">No jobs match these filters.</p>}
        </TabsContent>
        <TabsContent value="tracker" className="mt-6 space-y-3">
          {data?.saved.map((s) => {
            const j = scored.find((x) => x.id === s.job_id);
            if (!j) return null;
            return (
              <Panel key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{j.title}</p>
                  <p className="text-sm text-muted-foreground">{j.company} · {j.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={s.status} onValueChange={(v) => setStatus(s.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((st) => <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => toggleSave(j.id)}>Remove</Button>
                </div>
              </Panel>
            );
          })}
          {!data?.saved.length && <p className="text-muted-foreground">Save jobs to track your applications here.</p>}
        </TabsContent>
      </Tabs>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          {open && (
            <>
              <DialogHeader><DialogTitle>{open.title} — {open.company}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">{open.location} · {open.job_type} · {open.salary}</p>
              <p className="text-sm">{open.description}</p>
              <div><h4 className="mb-1 text-sm font-bold">Eligibility</h4><p className="text-sm">{open.eligibility}</p></div>
              <div><h4 className="mb-2 text-sm font-bold">Skills</h4><Chips items={open.skills} /></div>
              <div className="flex gap-2">
                <Button asChild><a href={open.apply_url} target="_blank" rel="noreferrer">Apply <ExternalLink className="ml-1 h-4 w-4" /></a></Button>
                <Button variant="outline" onClick={() => toggleSave(open.id)}>{savedMap.has(open.id) ? "Unsave" : "Save"}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
