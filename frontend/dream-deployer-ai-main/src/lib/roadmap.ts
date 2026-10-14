import { AiError } from "./ai.server";

export type RoadmapPlan = {
  strengths: string[];
  missing_skills: string[];
  weeks: {
    week: number;
    topic: string;
    goal: string;
    tasks: { id: string; title: string }[];
    projects: string[];
    practice_questions: string[];
    resources: { title: string; url: string }[];
  }[];
  source?: "gemini" | "fallback";
  fallbackMessage?: string;
};

type RoadmapTrack = {
  label: string;
  missingSkills: string[];
  topics: string[];
  resources: RoadmapPlan["weeks"][number]["resources"];
};

const tracks: { match: RegExp; track: RoadmapTrack }[] = [
  {
    match: /full[\s-]*stack/i,
    track: {
      label: "full-stack web development",
      missingSkills: [
        "JavaScript and TypeScript",
        "React",
        "REST APIs",
        "Databases",
        "Testing and deployment",
      ],
      topics: [
        "HTML, CSS, and JavaScript foundations",
        "React components and state",
        "Node.js and REST API design",
        "SQL data modeling and authentication",
        "Full-stack testing and security",
        "Deployment and portfolio capstone",
      ],
      resources: [
        { title: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn" },
        { title: "React documentation", url: "https://react.dev/learn" },
        { title: "Node.js documentation", url: "https://nodejs.org/docs/latest/api/" },
      ],
    },
  },
  {
    match: /python/i,
    track: {
      label: "Python development",
      missingSkills: [
        "Python language and standard library",
        "Data structures and algorithms",
        "Testing with pytest",
        "REST APIs",
        "SQL and application deployment",
      ],
      topics: [
        "Python syntax, functions, and modules",
        "Data structures, typing, and error handling",
        "Object-oriented Python and pytest",
        "REST APIs with FastAPI or Django",
        "SQL, persistence, and application security",
        "Deployment and Python portfolio capstone",
      ],
      resources: [
        { title: "Python tutorial", url: "https://docs.python.org/3/tutorial/" },
        { title: "pytest documentation", url: "https://docs.pytest.org/en/stable/" },
        { title: "FastAPI tutorial", url: "https://fastapi.tiangolo.com/tutorial/" },
      ],
    },
  },
  {
    match: /java/i,
    track: {
      label: "Java development",
      missingSkills: [
        "Java and object-oriented programming",
        "Collections and generics",
        "JUnit testing",
        "Spring Boot REST APIs",
        "SQL and JPA",
      ],
      topics: [
        "Java syntax, classes, and object-oriented design",
        "Collections, generics, and exception handling",
        "JUnit, debugging, and clean code",
        "Spring Boot REST API development",
        "SQL, JPA, and application security",
        "Deployment and Java portfolio capstone",
      ],
      resources: [
        { title: "Dev.java learning", url: "https://dev.java/learn/" },
        { title: "JUnit 5 user guide", url: "https://junit.org/junit5/docs/current/user-guide/" },
        { title: "Spring Boot reference", url: "https://docs.spring.io/spring-boot/reference/" },
      ],
    },
  },
  {
    match: /front[\s-]*end|ui developer/i,
    track: {
      label: "frontend development",
      missingSkills: [
        "HTML and semantic markup",
        "CSS and responsive design",
        "JavaScript and TypeScript",
        "React and UI state",
        "Accessibility and frontend testing",
      ],
      topics: [
        "Semantic HTML and modern CSS",
        "Responsive layouts and accessibility",
        "JavaScript, DOM, and TypeScript",
        "React components, hooks, and state",
        "Frontend testing and performance",
        "Deployment and frontend portfolio capstone",
      ],
      resources: [
        { title: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn" },
        { title: "React documentation", url: "https://react.dev/learn" },
        { title: "web.dev learn", url: "https://web.dev/learn/" },
      ],
    },
  },
  {
    match: /back[\s-]*end|server[\s-]*side/i,
    track: {
      label: "backend development",
      missingSkills: [
        "Server-side programming",
        "HTTP and REST API design",
        "SQL and data modeling",
        "Authentication and security",
        "Testing and deployment",
      ],
      topics: [
        "Server-side language and runtime fundamentals",
        "HTTP, REST, and API validation",
        "SQL, transactions, and data modeling",
        "Authentication, authorization, and security",
        "Automated tests, caching, and reliability",
        "Deployment and backend portfolio capstone",
      ],
      resources: [
        { title: "MDN HTTP guide", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP" },
        {
          title: "PostgreSQL tutorial",
          url: "https://www.postgresql.org/docs/current/tutorial.html",
        },
        { title: "OWASP Cheat Sheet Series", url: "https://cheatsheetseries.owasp.org/" },
      ],
    },
  },
  {
    match: /data[\s-]*analyst|business[\s-]*analyst/i,
    track: {
      label: "data analysis",
      missingSkills: [
        "SQL querying",
        "Python and pandas",
        "Statistics and data quality",
        "Visualization and dashboards",
        "Communicating insights",
      ],
      topics: [
        "Spreadsheets, data cleaning, and analytical questions",
        "SQL filtering, joins, grouping, and window functions",
        "Python, pandas, and exploratory analysis",
        "Statistics, sampling, and data quality",
        "Visualization and dashboard storytelling",
        "End-to-end analysis and portfolio capstone",
      ],
      resources: [
        {
          title: "PostgreSQL tutorial",
          url: "https://www.postgresql.org/docs/current/tutorial.html",
        },
        {
          title: "pandas getting started",
          url: "https://pandas.pydata.org/docs/getting_started/index.html",
        },
        { title: "Kaggle Learn", url: "https://www.kaggle.com/learn" },
      ],
    },
  },
  {
    match: /software[\s-]*test|qa[\s-]*engineer|quality[\s-]*assurance/i,
    track: {
      label: "software testing",
      missingSkills: [
        "Test design and defect reporting",
        "Web and API testing",
        "Automation with Playwright",
        "Regression and performance testing",
        "CI test workflows",
      ],
      topics: [
        "Testing fundamentals and clear defect reports",
        "Risk-based test design and exploratory testing",
        "HTTP, API testing, and test data",
        "Browser automation with Playwright",
        "Regression, accessibility, and performance checks",
        "CI integration and testing portfolio capstone",
      ],
      resources: [
        {
          title: "ISTQB Foundation Level overview",
          url: "https://www.istqb.org/certifications/certified-tester-foundation-level",
        },
        { title: "Playwright documentation", url: "https://playwright.dev/docs/intro" },
        { title: "Postman learning center", url: "https://learning.postman.com/" },
      ],
    },
  },
];

function getTrack(role: string): RoadmapTrack {
  return (
    tracks.find(({ match }) => match.test(role))?.track ?? {
      label: "software development",
      missingSkills: [
        "Programming fundamentals",
        "Data structures and algorithms",
        "Version control",
        "Testing",
        "Deployment",
      ],
      topics: [
        "Programming language foundations",
        "Data structures and problem solving",
        "Git, debugging, and code quality",
        "APIs and data persistence",
        "Automated testing and security",
        "Deployment and software portfolio capstone",
      ],
      resources: [
        { title: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn" },
        { title: "Git documentation", url: "https://git-scm.com/doc" },
        { title: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/" },
      ],
    }
  );
}

export function createFallbackRoadmap(targetRole: string): RoadmapPlan {
  const track = getTrack(targetRole);
  return {
    source: "fallback",
    fallbackMessage:
      "This is a curated, role-specific fallback roadmap, not Gemini-generated content.",
    strengths: [
      `The plan is organized around practical ${track.label} milestones.`,
      "Each week combines focused practice with a portfolio-ready project step.",
    ],
    missing_skills: track.missingSkills,
    weeks: track.topics.map((topic, index) => ({
      week: index + 1,
      topic,
      goal: `Build practical ${track.label} ability by applying ${topic.toLowerCase()} to the target role.`,
      tasks: [
        {
          id: `w${index + 1}t1`,
          title: `Study the core concepts in ${topic} and record concise notes.`,
        },
        { id: `w${index + 1}t2`, title: `Complete three hands-on exercises applying ${topic}.` },
        {
          id: `w${index + 1}t3`,
          title: `Add a tested, documented ${topic.toLowerCase()} feature to a role-focused portfolio project.`,
        },
      ],
      projects: [
        `Build a ${targetRole} portfolio milestone that demonstrates ${topic.toLowerCase()}.`,
      ],
      practice_questions: [
        `Which core concepts in ${topic} matter most for a ${targetRole}?`,
        `How would you apply ${topic} to solve a realistic ${targetRole} task, and how would you verify the result?`,
      ],
      resources: track.resources,
    })),
  };
}

export async function generateRoadmapWithFallback(
  targetRole: string,
  generate: () => Promise<RoadmapPlan>,
): Promise<RoadmapPlan> {
  try {
    return { ...(await generate()), source: "gemini" };
  } catch (error) {
    if (!(error instanceof AiError) || ![429, 502, 503, 504].includes(error.status)) {
      throw error;
    }
    console.warn(
      `[Roadmap] Gemini unavailable (${error.status}); serving a role-specific fallback.`,
    );
    const fallbackMessage =
      error.status === 429 && /quota is exhausted/i.test(error.message)
        ? "Gemini API quota is exhausted for the configured Google project. Showing this role-specific fallback roadmap instead; it is not Gemini-generated content."
        : error.status === 429
          ? "Gemini is rate-limiting requests. Showing a role-specific fallback roadmap instead; it is not Gemini-generated content."
          : [502, 503, 504].includes(error.status)
            ? "Gemini is temporarily unavailable. Showing a role-specific fallback roadmap, not Gemini-generated content."
            : "Gemini could not generate this roadmap. Showing a role-specific fallback, not Gemini-generated content.";
    return { ...createFallbackRoadmap(targetRole), fallbackMessage };
  }
}
