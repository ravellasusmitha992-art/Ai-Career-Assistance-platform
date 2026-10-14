import { ApiError, GoogleGenAI } from "@google/genai";

export class AiError extends Error {
  public statusCode: number;

  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AiError";
    this.statusCode = status;
  }
}

type JsonSchema = {
  type?: "object" | "array" | "string" | "integer";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number)[];
  additionalProperties?: boolean;
};

const MAX_RATE_LIMIT_RETRIES = 1;
const RATE_LIMIT_RETRY_DELAYS_MS = [1_000] as const;
const MAX_RETRY_AFTER_MS = 5 * 60 * 1_000;

function retryAfterMilliseconds(
  retryAfterMs: string | undefined,
  retryAfter: string | undefined,
  providerMessage: string,
): number | undefined {
  if (retryAfterMs) {
    const milliseconds = Number(retryAfterMs);
    if (Number.isFinite(milliseconds) && milliseconds >= 0) return milliseconds;
  }
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

    const retryAt = Date.parse(retryAfter);
    if (!Number.isNaN(retryAt)) return Math.max(0, retryAt - Date.now());
  }

  const delayMatch =
    /retry(?:\s+in|after)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|m|minutes?)/i.exec(
      providerMessage,
    ) ?? /retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)\s*(ms|s|m)/i.exec(providerMessage);
  if (!delayMatch) return undefined;

  const delay = Number(delayMatch[1]);
  const unit = delayMatch[2]!.toLowerCase();
  const multiplier =
    unit.startsWith("m") && unit !== "ms" && !unit.startsWith("millisecond")
      ? 60_000
      : unit.startsWith("s")
        ? 1_000
        : 1;
  return delay * multiplier;
}

function isQuotaExhausted(error: ApiError): boolean {
  const message = error.message.toLowerCase().replace(/[^a-z0-9_:/ ]/g, " ");
  return /billing|daily quota|monthly quota|per[_ ]day|per[_ ]month|limit: ?0|quota[_ ]exceeded|quota.{0,30}(exhaust|deplet)|(?:exhaust|deplet).{0,30}quota/.test(
    message,
  );
}

function safeProviderMessage(message: string, apiKey: string): string {
  return message
    .replaceAll(apiKey, "[redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 1_000);
}

function matchesSchema(value: unknown, schema: JsonSchema): boolean {
  if (schema.enum && !schema.enum.includes(value as string | number)) return false;
  if (schema.type === "string") return typeof value === "string";
  if (schema.type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (schema.type === "array") {
    return (
      Array.isArray(value) &&
      !!schema.items &&
      value.every((item) => matchesSchema(item, schema.items!))
    );
  }
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value) || !schema.properties)
      return false;
    const record = value as Record<string, unknown>;
    if (schema.required?.some((key) => !(key in record))) return false;
    if (
      schema.additionalProperties === false &&
      Object.keys(record).some((key) => !(key in schema.properties!))
    )
      return false;
    return Object.entries(schema.properties).every(
      ([key, propertySchema]) => !(key in record) || matchesSchema(record[key], propertySchema),
    );
  }
  return false;
}

export async function aiJson<T>(opts: {
  instructions: string;
  input: string;
  schema: JsonSchema;
  models?: readonly string[];
  maxRateLimitRetries?: number;
}): Promise<T> {
  const key = process.env["GEMINI_API_KEY"]?.trim();
  if (!key) {
    throw new AiError(
      "AI features require the server-side GEMINI_API_KEY. Add it to your .env file and restart the development server.",
      500,
    );
  }

  let retryAfterHeader: string | undefined;
  let retryAfterMsHeader: string | undefined;
  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      retryOptions: { attempts: 1 },
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        retryAfterMsHeader = response.headers.get("retry-after-ms") ?? undefined;
        retryAfterHeader = response.headers.get("retry-after") ?? undefined;
        return response;
      },
    },
  });
  // Gemini explicitly recommended 3.8 Flash when this API key reported 2.5 Flash unavailable.
  const models = opts.models ?? [
    "models/gemini-3.8-flash",
    "models/gemini-3.7-flash",
    "models/gemini-3.6-flash",
    "models/gemini-3.5-flash",
  ];
  const configuredRetries = opts.maxRateLimitRetries ?? MAX_RATE_LIMIT_RETRIES;
  const maxRateLimitRetries = Number.isFinite(configuredRetries)
    ? Math.max(0, Math.min(MAX_RATE_LIMIT_RETRIES, Math.floor(configuredRetries)))
    : MAX_RATE_LIMIT_RETRIES;
  let responseText: string | undefined;
  let lastProviderError: ApiError | undefined;

  for (const model of models) {
    let rateLimitRetries = 0;
    while (true) {
      retryAfterMsHeader = undefined;
      retryAfterHeader = undefined;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: opts.input,
          config: {
            systemInstruction: opts.instructions,
            responseMimeType: "application/json",
            responseJsonSchema: opts.schema,
          },
        });
        responseText = response.text;
        break;
      } catch (error) {
        if (!(error instanceof ApiError)) {
          console.error("[Gemini] Could not connect to the provider.");
          throw new AiError(
            "Could not connect to Gemini. Check your server connection and try again.",
            502,
          );
        }

        const providerMessage = safeProviderMessage(error.message, key);
        console.error(`[Gemini] ${model} request failed (${error.status}): ${providerMessage}`);
        if (error.status === 401 || error.status === 403) {
          throw new AiError(
            "Gemini rejected the API key. Check that GEMINI_API_KEY is valid and has Gemini API access.",
            error.status,
          );
        }
        if (error.status === 429) {
          if (isQuotaExhausted(error)) {
            throw new AiError(
              "Gemini API quota is exhausted for the configured Google project. Check its quota and billing limits before trying again.",
              429,
            );
          }

          const retryAfterMs = retryAfterMilliseconds(
            retryAfterMsHeader,
            retryAfterHeader,
            providerMessage,
          );
          console.error(
            `[Gemini] ${model} rate-limit retry delay: ${retryAfterMs === undefined ? "not provided" : `${retryAfterMs}ms`}.`,
          );
          if (rateLimitRetries >= maxRateLimitRetries) {
            throw new AiError(
              "Gemini is rate-limiting requests. No further automatic retries were made; wait before trying again.",
              429,
            );
          }
          if (retryAfterMs !== undefined && retryAfterMs > MAX_RETRY_AFTER_MS) {
            throw new AiError(
              "Gemini asked the app to wait longer before retrying. No automatic retry was made; try again later.",
              429,
            );
          }

          const delayMs = retryAfterMs ?? RATE_LIMIT_RETRY_DELAYS_MS[rateLimitRetries]!;
          rateLimitRetries += 1;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        if (![404, 500, 502, 503, 504].includes(error.status)) {
          throw new AiError(
            "Gemini could not process this request. Check the provided information and try again.",
            error.status,
          );
        }

        lastProviderError = error;
        break;
      }
    }
    if (responseText) break;
  }

  if (!responseText && lastProviderError) {
    if (lastProviderError.status === 404) {
      throw new AiError(
        "Gemini could not find an available model for this request. Check the configured model IDs and API access.",
        502,
      );
    }
    throw new AiError(
      "Gemini is temporarily unavailable on all configured models. Please wait a moment and try again.",
      lastProviderError.status,
    );
  }

  if (!responseText?.trim()) {
    throw new AiError("Gemini returned an empty response. Please try again.", 502);
  }

  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new AiError("Gemini returned an unreadable response. Please try again.", 502);
  }

  if (!matchesSchema(result, opts.schema)) {
    throw new AiError("Gemini returned an incomplete response. Please try again.", 502);
  }
  return result as T;
}

export const S = {
  str: { type: "string" } as const,
  int: { type: "integer" } as const,
  arr: (items: JsonSchema): JsonSchema => ({ type: "array", items }),
  obj: (props: Record<string, JsonSchema>): JsonSchema => ({
    type: "object",
    properties: props,
    required: Object.keys(props),
    additionalProperties: false,
  }),
};
