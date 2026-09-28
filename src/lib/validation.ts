import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2_000),
      }),
    )
    .max(8)
    .default([]),
});

export const modelTurnSchema = z.object({
  reply: z.string().trim().min(1).max(4_000),
  memory: z
    .object({
      category: z.enum(["goal", "constraint", "commitment", "preference", "progress"]),
      statement: z.string().trim().min(3).max(500),
    })
    .nullable(),
});

export function parseModelJson(raw: string): z.infer<typeof modelTurnSchema> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("Model did not return JSON");
  return modelTurnSchema.parse(JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)));
}

export function safeJobId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{6,128}$/u.test(value);
}
