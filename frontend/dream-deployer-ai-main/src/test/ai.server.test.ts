import { ApiError } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateContentMock, clientOptionsMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  clientOptionsMock: vi.fn(),
}));

vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return {
    ...actual,
    GoogleGenAI: class {
      constructor(options: unknown) {
        clientOptionsMock(options);
      }

      models = { generateContent: generateContentMock };
    },
  };
});

import { aiJson } from "../lib/ai.server";

describe("aiJson model fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["GEMINI_API_KEY"] = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env["GEMINI_API_KEY"];
  });

  it("falls back to the next listed Gemini Flash model after a temporary outage", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateContentMock
      .mockRejectedValueOnce(new ApiError({ status: 503, message: "Unavailable" }))
      .mockResolvedValueOnce({ text: '{"answer":"ready"}' });

    const result = await aiJson<{ answer: string }>({
      instructions: "Respond in JSON.",
      input: "Return a ready answer.",
      models: ["models/gemini-flash-latest", "models/gemini-flash-lite-latest"],
      schema: {
        type: "object",
        properties: { answer: { type: "string" } },
        required: ["answer"],
      },
    });

    expect(result).toEqual({ answer: "ready" });
    expect(generateContentMock.mock.calls.map(([request]) => request.model)).toEqual([
      "models/gemini-flash-latest",
      "models/gemini-flash-lite-latest",
    ]);
    expect(clientOptionsMock.mock.calls[0]?.[0]).toMatchObject({
      httpOptions: { retryOptions: { attempts: 1 } },
    });
  });

  it("retries transient 429 responses with a delay", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 429, headers: { "retry-after": "2" } })),
    );
    generateContentMock
      .mockImplementationOnce(async () => {
        const options = clientOptionsMock.mock.calls[0]?.[0] as {
          httpOptions: { fetch: (input: string) => Promise<Response> };
        };
        await options.httpOptions.fetch("https://example.test");
        throw new ApiError({
          status: 429,
          message: "RESOURCE_EXHAUSTED: requests per minute limit exceeded",
        });
      })
      .mockResolvedValueOnce({ text: '{"answer":"ready"}' });

    await expect(
      aiJson<{ answer: string }>({
        instructions: "Respond in JSON.",
        input: "Return a ready answer.",
        models: ["models/gemini-flash-latest"],
        schema: {
          type: "object",
          properties: { answer: { type: "string" } },
          required: ["answer"],
        },
      }),
    ).resolves.toEqual({ answer: "ready" });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("respects the provider retry delay and retries only once", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateContentMock
      .mockRejectedValueOnce(
        new ApiError({ status: 429, message: "RESOURCE_EXHAUSTED; retry in 3s" }),
      )
      .mockResolvedValueOnce({ text: '"ready"' });

    const request = aiJson<string>({
      instructions: "Respond in JSON.",
      input: "Return a ready answer.",
      models: ["models/gemini-flash-latest"],
      schema: { type: "string" },
    });
    const result = expect(request).resolves.toBe("ready");

    for (let i = 0; i < 10 && vi.getTimerCount() === 0; i += 1) {
      await Promise.resolve();
    }
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(2_999);
    expect(generateContentMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry exhausted Gemini quota responses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateContentMock.mockRejectedValue(
      new ApiError({ status: 429, message: "Daily quota exhausted" }),
    );

    await expect(
      aiJson({
        instructions: "Respond in JSON.",
        input: "Return a ready answer.",
        models: ["models/gemini-flash-latest"],
        schema: { type: "string" },
      }),
    ).rejects.toMatchObject({
      message:
        "Gemini API quota is exhausted for the configured Google project. Check its quota and billing limits before trying again.",
      status: 429,
    });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the provider asks for a wait longer than the maximum", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 429, headers: { "retry-after": "301" } })),
    );
    generateContentMock.mockImplementation(async () => {
      const options = clientOptionsMock.mock.calls[0]?.[0] as {
        httpOptions: { fetch: (input: string) => Promise<Response> };
      };
      await options.httpOptions.fetch("https://example.test");
      throw new ApiError({ status: 429, message: "Rate limit exceeded" });
    });

    await expect(
      aiJson({
        instructions: "Respond in JSON.",
        input: "Return a ready answer.",
        models: ["models/gemini-flash-latest"],
        schema: { type: "string" },
      }),
    ).rejects.toMatchObject({
      message:
        "Gemini asked the app to wait longer before retrying. No automatic retry was made; try again later.",
      status: 429,
    });
    expect(generateContentMock).toHaveBeenCalledOnce();
  });

  it("logs the provider status and response detail without logging the API key", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    generateContentMock.mockRejectedValue(
      new ApiError({ status: 403, message: "PERMISSION_DENIED: key test-key is not authorized" }),
    );

    await expect(
      aiJson({
        instructions: "Respond in JSON.",
        input: "Return a ready answer.",
        models: ["models/gemini-flash-latest"],
        schema: { type: "string" },
      }),
    ).rejects.toMatchObject({
      message:
        "Gemini rejected the API key. Check that GEMINI_API_KEY is valid and has Gemini API access.",
      status: 403,
    });

    expect(logger).toHaveBeenCalledWith(
      "[Gemini] models/gemini-flash-latest request failed (403): PERMISSION_DENIED: key [redacted] is not authorized",
    );
  });

  it("can return a rate-limit response immediately when retries are disabled", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateContentMock.mockRejectedValue(
      new ApiError({ status: 429, message: "Rate limit exceeded" }),
    );

    await expect(
      aiJson({
        instructions: "Respond in JSON.",
        input: "Return a ready answer.",
        models: ["models/gemini-flash-latest", "models/gemini-flash-lite-latest"],
        maxRateLimitRetries: 0,
        schema: { type: "string" },
      }),
    ).rejects.toMatchObject({ status: 429 });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });
});
