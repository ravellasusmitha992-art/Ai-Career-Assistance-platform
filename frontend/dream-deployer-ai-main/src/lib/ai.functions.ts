import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { aiJson, AiError, S } from "./ai.server";
import { generateRoadmapWithFallback, type RoadmapPlan } from "./roadmap";

async function getProfileText(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data)
    throw new Error(
      "Save your profile, including your skills and career goals, before requesting personalized guidance.",
    );
  return `Name: ${data.full_name ?? ""}
Education: ${data.degree ?? ""} ${data.branch ?? ""}, ${data.college ?? ""}, graduating ${data.graduation_year ?? ""}, CGPA ${data.cgpa ?? ""}
Skills: ${(data.skills ?? []).join(", ")}
Interests: ${(data.interests ?? []).join(", ")}
Career goal: ${data.career_goal ?? ""}
Preferred location: ${data.location ?? ""}`;
}

// ---------- Resume Analyzer ----------
export type ResumeAnalysis = {
  summary: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  ats_suggestions: string[];
  improvements: string[];
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  verdict: string;
};

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        fileName: z.string().trim().min(1).max(300),
        resumeText: z.string().trim().min(30).max(60000),
        jobDescription: z.string().trim().max(20000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const jd = data.jobDescription?.trim();
    const result = await aiJson<ResumeAnalysis>({
      instructions:
        "You are an expert technical recruiter and ATS reviewer. Analyse only the provided resume and job description; do not invent qualifications. Extract concrete skills, specific strengths and weaknesses, actionable improvement recommendations, and ATS-focused suggestions. If a job description is given, compare the resume against its requirements, compute match_score from 0-100, and list matched and missing skills. Without a job description, use overall resume quality for match_score and list relevant missing skills for the apparent target role.",
      input: `RESUME:\n${data.resumeText}\n\nJOB DESCRIPTION:\n${jd || "(none provided)"}`,
      schema: S.obj({
        summary: S.str,
        skills: S.arr(S.str),
        strengths: S.arr(S.str),
        weaknesses: S.arr(S.str),
        ats_suggestions: S.arr(S.str),
        improvements: S.arr(S.str),
        match_score: S.int,
        matched_skills: S.arr(S.str),
        missing_skills: S.arr(S.str),
        verdict: S.str,
      }),
    });
    result.match_score = Math.max(0, Math.min(100, Math.round(result.match_score)));
    const { data: row, error } = await context.supabase
      .from("resumes")
      .insert({
        user_id: context.userId,
        file_name: data.fileName,
        resume_text: data.resumeText,
        job_description: jd || null,
        analysis: result,
        match_score: result.match_score,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, analysis: result };
  });

// ---------- Career Guidance ----------
export type CareerGuidance = {
  overview: string;
  careers: {
    role: string;
    fit_score: number;
    why: string;
    required_skills: string[];
    skills_you_have: string[];
    salary_range: string;
    roadmap: { step: string; duration: string }[];
  }[];
};

export const generateCareerGuidance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ targetRole: z.string().trim().min(2).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const profile = await getProfileText(context.supabase, context.userId);
    const result = await aiJson<CareerGuidance>({
      instructions:
        "You are a career counsellor for Indian engineering/degree students. Make the requested target role the primary recommendation and tailor its required skills, fit, explanation, and 4-6 step learning roadmap to the student's profile. Also suggest 2-3 closely related alternative tech career paths. Return 3-4 total careers, including the exact requested target role as one of them. fit_score is 0-100. Salary is in INR LPA for freshers. Every roadmap has 4-6 ordered steps with durations. Do not invent qualifications or experience.",
      input: `TARGET CAREER ROLE: ${data.targetRole}\n\nSTUDENT PROFILE:\n${profile}`,
      schema: S.obj({
        overview: S.str,
        careers: S.arr(
          S.obj({
            role: S.str,
            fit_score: S.int,
            why: S.str,
            required_skills: S.arr(S.str),
            skills_you_have: S.arr(S.str),
            salary_range: S.str,
            roadmap: S.arr(S.obj({ step: S.str, duration: S.str })),
          }),
        ),
      }),
    });
    if (result.careers.length < 3 || result.careers.length > 4) {
      throw new AiError("Gemini returned incomplete career guidance. Please try again.", 502);
    }
    if (
      !result.careers.some(
        (career) => career.role.trim().toLowerCase() === data.targetRole.toLowerCase(),
      )
    ) {
      throw new AiError(
        "Gemini did not include the requested career role. Please try generating the guidance again.",
        502,
      );
    }
    result.careers = result.careers.map((career) => ({
      ...career,
      fit_score: Math.max(0, Math.min(100, Math.round(career.fit_score))),
    }));
    const { error } = await context.supabase
      .from("career_guidance")
      .insert({ user_id: context.userId, result });
    if (error) throw new Error(error.message);
    return result;
  });

// ---------- Mock Interview ----------
export type InterviewQuestion = { id: string; type: "technical" | "hr"; question: string };
export type InterviewFeedback = {
  overall_score: number;
  summary: string;
  items: { id: string; score: number; feedback: string; ideal_answer: string }[];
  tips: string[];
};

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        role: z.string().trim().min(2).max(100),
        technologies: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const technologies = data.technologies?.trim();
    const r = await aiJson<{ questions: { type: "technical" | "hr"; question: string }[] }>({
      instructions:
        "You are an interviewer at an Indian IT company hiring freshers. Generate exactly 5 technical questions and 3 HR questions for the given role, prioritizing the requested technologies. Questions must be specific and dynamically tailored to the role and technologies; type must be 'technical' or 'hr'. Keep questions concise.",
      input: `Role: ${data.role}\nTechnologies: ${technologies || "Select the most relevant technologies for this role."}`,
      schema: S.obj({
        questions: S.arr(
          S.obj({ type: { type: "string", enum: ["technical", "hr"] }, question: S.str }),
        ),
      }),
    });
    if (
      r.questions.length !== 8 ||
      r.questions.filter((question) => question.type === "technical").length !== 5 ||
      r.questions.filter((question) => question.type === "hr").length !== 3
    ) {
      throw new AiError(
        "Gemini returned an incomplete interview. Please generate the questions again.",
        502,
      );
    }
    const questions: InterviewQuestion[] = r.questions.map((q, i) => ({
      id: `q${i + 1}`,
      type: q.type,
      question: q.question,
    }));
    const { data: row, error } = await context.supabase
      .from("interviews")
      .insert({ user_id: context.userId, role: data.role, questions })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, questions };
  });

export const submitInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({ id: z.string().uuid(), answers: z.record(z.string().max(5000)) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: iv, error } = await context.supabase
      .from("interviews")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (!iv) throw new Error("Interview not found");
    const qs = iv.questions as unknown as InterviewQuestion[];
    const transcript = qs
      .map(
        (q) =>
          `[${q.id}] (${q.type}) Q: ${q.question}\nA: ${data.answers[q.id]?.trim() || "(no answer)"}`,
      )
      .join("\n\n");
    const fb = await aiJson<InterviewFeedback>({
      instructions:
        "You are a supportive but honest interview coach. Score each answer 0-10, give specific feedback and a short ideal answer. overall_score is 0-100. Give 3-5 improvement tips. Use the question ids given.",
      input: `Role: ${iv.role}\n\n${transcript}`,
      schema: S.obj({
        overall_score: S.int,
        summary: S.str,
        items: S.arr(S.obj({ id: S.str, score: S.int, feedback: S.str, ideal_answer: S.str })),
        tips: S.arr(S.str),
      }),
    });
    const questionIds = new Set(qs.map((question) => question.id));
    if (
      fb.items.length !== qs.length ||
      new Set(fb.items.map((item) => item.id)).size !== qs.length ||
      fb.items.some((item) => !questionIds.has(item.id))
    ) {
      throw new AiError(
        "Gemini returned incomplete interview feedback. Please submit your answers again.",
        502,
      );
    }
    fb.overall_score = Math.max(0, Math.min(100, Math.round(fb.overall_score)));
    fb.items = fb.items.map((item) => ({
      ...item,
      score: Math.max(0, Math.min(10, Math.round(item.score))),
    }));
    const { error: updateError } = await context.supabase
      .from("interviews")
      .update({ answers: data.answers, feedback: fb, overall_score: fb.overall_score })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);
    return fb;
  });

// ---------- Learning Roadmap ----------
export type { RoadmapPlan } from "./roadmap";

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({ targetRole: z.string().trim().min(2).max(100), regenerate: z.boolean().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.regenerate) {
      const { data: existing, error } = await context.supabase
        .from("roadmaps")
        .select("*")
        .eq("target_role", data.targetRole)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (existing) return existing;
    }

    const profile = await getProfileText(context.supabase, context.userId);
    const plan = await generateRoadmapWithFallback(data.targetRole, () =>
      aiJson<RoadmapPlan>({
        instructions:
          "You are a mentor. Use the student's career goal, current skills, education, and any explicitly documented experience to personalize the plan for the target role. Identify relevant strengths and missing skills. The profile does not collect work history, so do not invent professional experience; when none is documented, treat the student as entry-level and use their education and skills to set an appropriate starting point. Build a personalized 6-8 week step-by-step plan. Each week must include 3-5 concrete practice tasks with unique ids like 'w1t1', 1-2 realistic project ideas, 2-3 practice questions, and 2-3 free learning resources with real well-known URLs (official docs, freeCodeCamp, GeeksforGeeks, W3Schools, YouTube channels, LeetCode, HackerRank).",
        input: `TARGET ROLE: ${data.targetRole}\n\nSTUDENT PROFILE:\n${profile}`,
        models: ["models/gemini-flash-latest", "models/gemini-flash-lite-latest"],
        maxRateLimitRetries: 0,
        schema: S.obj({
          strengths: S.arr(S.str),
          missing_skills: S.arr(S.str),
          weeks: S.arr(
            S.obj({
              week: S.int,
              topic: S.str,
              goal: S.str,
              tasks: S.arr(S.obj({ id: S.str, title: S.str })),
              projects: S.arr(S.str),
              practice_questions: S.arr(S.str),
              resources: S.arr(S.obj({ title: S.str, url: S.str })),
            }),
          ),
        }),
      }),
    );
    const taskIds = plan.weeks.flatMap((week) => week.tasks.map((task) => task.id));
    if (
      plan.weeks.length < 6 ||
      plan.weeks.length > 8 ||
      taskIds.some((id) => !id.trim()) ||
      new Set(taskIds).size !== taskIds.length
    ) {
      throw new AiError("Gemini returned an incomplete learning roadmap. Please try again.", 502);
    }
    const { data: row, error } = await context.supabase
      .from("roadmaps")
      .insert({ user_id: context.userId, target_role: data.targetRole, plan })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
