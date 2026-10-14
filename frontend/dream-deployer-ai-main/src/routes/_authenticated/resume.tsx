
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  analyzeResume,
  type ResumeAnalysis,
} from "@/lib/ai.functions";
import { extractPdfText } from "@/lib/pdf";

import {
  PageHeader,
  Panel,
  Chips,
  ScoreRing,
  errMsg,
} from "@/components/page";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({
    meta: [
      { title: "Resume Analyzer — Pathwise" },
      {
        name: "description",
        content: "AI resume analysis and job match score.",
      },
    ],
  }),
  component: ResumePage,
});

function ResumePage() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeResume);

  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);

  const history = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select(
          "id, file_name, match_score, analysis, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data ?? [];
    },
  });

  async function run() {
    if (busyRef.current) return;
    if (!file) {
      toast.error("Choose a PDF resume first");
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      let text: string;
      try {
        text = await extractPdfText(file);
      } catch (error) {
        console.error("PDF text extraction failed:", error);
        throw new Error("Couldn't read this PDF. Check that it is a valid, unencrypted PDF and try again.");
      }

      if (text.length < 30) {
        throw new Error(
          "No readable text was found. Upload a text-based PDF instead of a scanned image."
        );
      }

      const response = await analyze({
        data: {
          fileName: file.name,
          resumeText: text.slice(0, 60000),
          jobDescription: jd.trim() || undefined,
        },
      });

      setResult(response.analysis);

      await qc.invalidateQueries({
        queryKey: ["resumes"],
      });

      toast.success("Resume analysis completed!");
    } catch (error) {
      console.error("Resume analysis failed:", error);
      toast.error(errMsg(error));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Resume Analyzer"
        subtitle="Upload your resume as PDF. Add a job description to get a match score."
      />

      <Panel>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center hover:bg-muted">
            <Upload className="h-8 w-8 text-primary" />

            <span className="mt-3 font-semibold">
              {file ? file.name : "Choose PDF resume"}
            </span>

            <span className="text-xs text-muted-foreground">
              PDF only, text-based
            </span>

            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0] ?? null;

                setFile(selectedFile);
                setResult(null);
              }}
            />
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="jd">
              Job description (optional)
            </Label>

            <Textarea
              id="jd"
              rows={7}
              value={jd}
              onChange={(event) => setJd(event.target.value)}
              placeholder="Paste the job description you want to compare against..."
            />
          </div>
        </div>

        <Button
          className="mt-6"
          size="lg"
          onClick={run}
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analysing...
            </>
          ) : (
            "Analyse resume"
          )}
        </Button>
      </Panel>

      {result && (
        <AnalysisView
          a={result}
          hasJd={!!jd.trim()}
        />
      )}

      {history.isError && (
        <p className="mt-4 text-sm text-destructive">
          Could not load previous analyses.
        </p>
      )}

      {!!history.data?.length && (
        <div className="mt-10">
          <h2 className="mb-3 text-xl font-bold">
            Previous analyses
          </h2>

          <div className="space-y-2">
            {history.data.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setResult(item.analysis as ResumeAnalysis)
                }
                className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted"
              >
                <span className="font-medium">
                  {item.file_name}
                </span>

                <span className="text-sm text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                  {" · "}
                  Score {item.match_score}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function AnalysisView({
  a,
  hasJd,
}: {
  a: ResumeAnalysis;
  hasJd: boolean;
}) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-[auto_1fr]">
      <Panel className="flex flex-col items-center justify-center">
        <ScoreRing
          score={a.match_score}
          label={hasJd ? "Job match" : "Resume score"}
        />
      </Panel>

      <Panel>
        <h3 className="font-bold">Summary</h3>

        <p className="mt-1 text-sm text-muted-foreground">
          {a.summary}
        </p>

        <p className="mt-3 text-sm font-semibold">
          {a.verdict}
        </p>
      </Panel>

      <Panel className="md:col-span-2">
        <h3 className="mb-3 font-bold">
          Extracted skills
        </h3>

        <Chips items={a.skills} />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-bold">
              Matched skills
            </h4>

            <Chips
              items={a.matched_skills}
              tone="good"
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-bold">
              Missing skills
            </h4>

            <Chips
              items={a.missing_skills}
              tone="bad"
            />
          </div>
        </div>
      </Panel>

      <Panel>
        <h3 className="mb-2 font-bold">Strengths</h3>

        <ul className="list-disc space-y-1 pl-5 text-sm">
          {a.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h3 className="mb-2 font-bold">Weaknesses</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {(a.weaknesses ?? []).map((weakness, index) => (
            <li key={index}>{weakness}</li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h3 className="mb-2 font-bold">ATS suggestions</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {(a.ats_suggestions ?? []).map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </Panel>

      <Panel className="md:col-span-2">
        <h3 className="mb-2 font-bold">
          Improvement suggestions
        </h3>

        <ul className="list-disc space-y-1 pl-5 text-sm">
          {a.improvements.map((improvement, index) => (
            <li key={index}>{improvement}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
