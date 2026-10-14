import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, errMsg } from "@/components/page";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Pathwise" }, { name: "description", content: "Your education, skills and career goals." }] }),
  component: Profile,
});

type Form = {
  full_name: string; phone: string; college: string; degree: string; branch: string;
  graduation_year: string; cgpa: string; location: string; career_goal: string;
  skills: string[]; interests: string[];
};

function Profile() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
      return { uid: u.user!.id, email: u.user!.email, p: data };
    },
  });
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const p = data.p;
    setF({
      full_name: p?.full_name ?? "", phone: p?.phone ?? "", college: p?.college ?? "", degree: p?.degree ?? "",
      branch: p?.branch ?? "", graduation_year: p?.graduation_year?.toString() ?? "", cgpa: p?.cgpa ?? "",
      location: p?.location ?? "", career_goal: p?.career_goal ?? "", skills: p?.skills ?? [], interests: p?.interests ?? [],
    });
  }, [data]);

  if (!f || !data) return <p className="text-muted-foreground">Loading…</p>;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f || !data) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: data.uid, email: data.email ?? null, ...f,
        graduation_year: f.graduation_year ? parseInt(f.graduation_year) : null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Profile saved");
      qc.invalidateQueries();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof Form, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={f[k] as string} onChange={set(k)} />
    </div>
  );

  return (
    <>
      <PageHeader title="Student profile" subtitle="This powers your career guidance, job matches and learning roadmap." />
      <form onSubmit={save} className="space-y-6">
        <Panel>
          <h2 className="mb-4 text-lg font-bold">Personal</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("full_name", "Full name")}
            {field("phone", "Phone")}
            {field("location", "Preferred job location")}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-bold">Education</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("college", "College")}
            {field("degree", "Degree (e.g. B.Tech)")}
            {field("branch", "Branch (e.g. CSE)")}
            {field("graduation_year", "Graduation year", "number")}
            {field("cgpa", "CGPA / %")}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-bold">Skills, interests & goals</h2>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Skills</Label>
              <TagInput value={f.skills} onChange={(v) => setF({ ...f, skills: v })} placeholder="Java, SQL, HTML…" />
            </div>
            <div className="space-y-1.5">
              <Label>Interests</Label>
              <TagInput value={f.interests} onChange={(v) => setF({ ...f, interests: v })} placeholder="Backend, Testing, Data…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="career_goal">Career goal</Label>
              <Textarea id="career_goal" value={f.career_goal} onChange={set("career_goal")} placeholder="I want to become a Java Developer at a product company." />
            </div>
          </div>
        </Panel>
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
      </form>
    </>
  );
}
