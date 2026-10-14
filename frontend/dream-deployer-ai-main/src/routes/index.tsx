import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Compass, Briefcase, Mic, Map, UserRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pathwise — AI Career Assistant for Students" },
      { name: "description", content: "Analyse your resume, discover career paths, find jobs, practise interviews and follow a personal learning roadmap." },
      { property: "og:title", content: "Pathwise — AI Career Assistant for Students" },
      { property: "og:description", content: "Your AI career co-pilot: resume analyzer, career guidance, jobs, mock interviews and roadmaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: UserRound, title: "Student profile", text: "Education, skills, interests and career goals in one place." },
  { icon: FileText, title: "AI resume analyzer", text: "Upload a PDF, get extracted skills, fixes and a job match score." },
  { icon: Compass, title: "Career guidance", text: "Roles that fit you — Java Developer, Tester, Data Analyst and more." },
  { icon: Briefcase, title: "Job recommendations", text: "Skill-matched openings with filters, saving and application tracking." },
  { icon: Mic, title: "Mock interview", text: "Technical + HR questions with AI feedback on every answer." },
  { icon: Map, title: "Learning roadmap", text: "Week-by-week plan for missing skills, with tasks and practice." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <section className="bg-hero text-ink-foreground">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="font-display text-2xl font-extrabold">
            path<span className="text-accent">wise</span>
          </span>
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </nav>
        <div className="mx-auto max-w-6xl px-6 pb-28 pt-16 md:pt-24">
          <p className="mb-5 inline-block rounded-full border border-ink-foreground/20 px-3 py-1 text-xs uppercase tracking-widest text-ink-foreground/80">
            AI career assistant for students
          </p>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] md:text-7xl">
            From resume to <span className="text-accent">first job</span>, with a plan.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-foreground/75">
            Tell us where you want to go. Pathwise reads your resume, finds the gaps, recommends roles and jobs,
            and coaches you through interviews.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">
                Get started free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-14 max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <h2 className="text-3xl font-extrabold md:text-4xl">How it works — example: becoming a Java Developer</h2>
          <ol className="space-y-4">
            {[
              "Fill your profile: B.Tech CSE, knows Core Java & SQL, goal: Java Developer.",
              "Upload your resume — AI extracts skills and scores it against a Java job description.",
              "Career guidance confirms the fit and lists Spring Boot, REST APIs and Git as next skills.",
              "Your roadmap turns those gaps into weekly tasks you can tick off.",
              "Practise a Java Developer mock interview, then apply to matched jobs and track them.",
            ].map((s, i) => (
              <li key={i} className="flex gap-4 rounded-xl border bg-card p-4">
                <span className="font-display text-2xl font-extrabold text-accent">{i + 1}</span>
                <span className="text-sm leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
