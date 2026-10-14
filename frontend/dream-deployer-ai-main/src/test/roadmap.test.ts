import { describe, expect, it, vi } from "vitest";
import { AiError } from "../lib/ai.server";
import {
  createFallbackRoadmap,
  generateRoadmapWithFallback,
  type RoadmapPlan,
} from "../lib/roadmap";

describe("role-specific roadmap fallback", () => {
  it.each([
    ["Python Developer", "Python syntax", "Python tutorial"],
    ["Java Developer", "Java syntax", "Dev.java learning"],
    ["Full Stack Developer", "React components", "Node.js documentation"],
    ["Frontend Developer", "Semantic HTML", "web.dev learn"],
    ["Backend Developer", "HTTP, REST", "MDN HTTP guide"],
    ["Data Analyst", "SQL filtering", "pandas getting started"],
    ["Software Tester", "Testing fundamentals", "Playwright documentation"],
  ])("builds a structured %s roadmap", (role, expectedTopic, expectedResource) => {
    const plan = createFallbackRoadmap(role);

    expect(plan.source).toBe("fallback");
    expect(plan.weeks).toHaveLength(6);
    expect(plan.weeks.some((week) => week.topic.includes(expectedTopic))).toBe(true);
    expect(plan.weeks[0]?.resources.some((resource) => resource.title === expectedResource)).toBe(
      true,
    );
    expect(
      plan.weeks.every((week) => week.tasks.length > 0 && week.practice_questions.length > 0),
    ).toBe(true);
    expect(new Set(plan.weeks.flatMap((week) => week.tasks.map((task) => task.id))).size).toBe(18);
    expect(plan.weeks[0]?.projects[0]).toContain(role);
  });

  it("uses separate role-specific content for Python and Java", () => {
    const pythonPlan = createFallbackRoadmap("Python Developer");
    const javaPlan = createFallbackRoadmap("Java Developer");

    expect(pythonPlan.weeks[0]?.topic).not.toBe(javaPlan.weeks[0]?.topic);
    expect(pythonPlan.missing_skills).not.toEqual(javaPlan.missing_skills);
  });

  it("returns a clearly marked fallback after a Gemini rate limit", async () => {
    const generate = vi
      .fn()
      .mockRejectedValue(
        new AiError(
          "Gemini is rate-limiting requests. No further automatic retries were made; wait before trying again.",
          429,
        ),
      );
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const plan = await generateRoadmapWithFallback("Python Developer", generate);

    expect(generate).toHaveBeenCalledOnce();
    expect(plan.source).toBe("fallback");
    expect(plan.fallbackMessage).toContain("rate-limiting");
    expect(plan.weeks[0]?.topic).toContain("Python");
  });

  it("clearly identifies quota exhaustion when serving a roadmap fallback", async () => {
    const generate = vi
      .fn()
      .mockRejectedValue(
        new AiError(
          "Gemini API quota is exhausted for the configured Google project. Check its quota and billing limits before trying again.",
          429,
        ),
      );
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const plan = await generateRoadmapWithFallback("Java Developer", generate);

    expect(plan.source).toBe("fallback");
    expect(plan.fallbackMessage).toContain("API quota is exhausted");
    expect(plan.weeks[0]?.topic).toContain("Java");
  });

  it("marks a successful Gemini roadmap as Gemini-generated", async () => {
    const plan: RoadmapPlan = { strengths: [], missing_skills: [], weeks: [] };

    await expect(
      generateRoadmapWithFallback("Java Developer", async () => plan),
    ).resolves.toMatchObject({
      source: "gemini",
    });
  });

  it("does not hide unexpected non-Gemini errors behind a fallback", async () => {
    const error = new Error("Database failure");
    await expect(
      generateRoadmapWithFallback("Python Developer", async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  it.each([400, 401, 403, 404, 500])(
    "does not turn a non-fallback provider error (%i) into a roadmap",
    async (status) => {
      const error = new AiError("Provider configuration error", status);
      await expect(
        generateRoadmapWithFallback("Python Developer", async () => {
          throw error;
        }),
      ).rejects.toBe(error);
    },
  );
});
