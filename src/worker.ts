import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  demoNamespace,
  sha256,
  signIdentity,
  signMemoryJob,
  userNamespace,
  verifyIdentity,
  verifyMemoryJob,
} from "./lib/crypto";
import { WorkersAiService, LocalAiService } from "./lib/ai";
import { createMemoryClient, memoryConfigured, recallSafe } from "./lib/memory";
import { chatRequestSchema, safeJobId } from "./lib/validation";
import type { AiService, AppEnv, ChatMessage } from "./types";

type Variables = { identity: string };
type AppBindings = { Bindings: AppEnv; Variables: Variables };

const ID_COOKIE = "wp_identity";
const DEV_COOKIE_SECRET = "development-only-cookie-secret-32chars";

function cookieSecret(env: AppEnv): string | null {
  if (env.COOKIE_SECRET && env.COOKIE_SECRET.length >= 32) return env.COOKIE_SECRET;
  return env.APP_ENV === "production" ? null : DEV_COOKIE_SECRET;
}

function aiService(env: AppEnv): AiService | null {
  if (env.APP_ENV !== "production") return new LocalAiService();
  return env.AI ? new WorkersAiService(env.AI) : null;
}

async function chatWithRetry(
  ai: AiService,
  history: ChatMessage[],
  memories: Awaited<ReturnType<typeof recallSafe>>["memories"],
) {
  try {
    return await ai.chat(history, memories);
  } catch {
    // Workers AI can occasionally return a transient error or malformed response.
    // One bounded retry improves reliability without risking duplicate memory writes.
    return ai.chat(history, memories);
  }
}

async function ensureIdentity(c: Context<AppBindings>): Promise<string> {
  const secret = cookieSecret(c.env);
  if (!secret) throw new Error("COOKIE_SECRET is not configured");
  const existing = getCookie(c, ID_COOKIE);
  const verified = existing ? await verifyIdentity(existing, secret) : null;
  const identity = verified ?? crypto.randomUUID();
  if (!verified) {
    setCookie(c, ID_COOKIE, await signIdentity(identity, secret), {
      httpOnly: true,
      secure: c.env.APP_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return identity;
}

export const app = new Hono<AppBindings>();

app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  await next();
});

app.get("/api/health", async (c) => {
  const secretReady = Boolean(cookieSecret(c.env));
  const memoryReady = memoryConfigured(c.env) || c.env.APP_ENV !== "production";
  const aiReady = Boolean(c.env.AI) || c.env.APP_ENV !== "production";
  let memoryOnline = false;

  if (memoryReady) {
    try {
      const client = createMemoryClient(c.env, "walrus-promise:health");
      memoryOnline = Boolean(client && (await client.health()).status);
    } catch {
      memoryOnline = false;
    }
  }

  return c.json({
    ok: secretReady && aiReady,
    environment: c.env.APP_ENV ?? "development",
    model: c.env.APP_ENV === "production" ? "qwen3-30b-a3b-fp8" : "local-safe-fallback",
    memory: memoryOnline ? "online" : memoryReady ? "degraded" : "not-configured",
    network: memoryConfigured(c.env) ? "mainnet" : "mock",
  });
});

app.post("/api/chat", async (c) => {
  const parsed = chatRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid chat request" }, 400);

  let identity: string;
  try {
    identity = await ensureIdentity(c);
  } catch {
    return c.json({ error: "Server identity is not configured" }, 503);
  }

  const ai = aiService(c.env);
  if (!ai) return c.json({ error: "AI service is not configured" }, 503);

  const namespace = await userNamespace(identity);
  const memory = createMemoryClient(c.env, namespace);
  const recalled = await recallSafe(memory, namespace, parsed.data.message);
  const history: ChatMessage[] = [
    ...parsed.data.history.slice(-8),
    { role: "user", content: parsed.data.message },
  ];

  let turn;
  try {
    turn = await chatWithRetry(ai, history, recalled.memories);
  } catch (error) {
    console.error("chat_failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message.slice(0, 300) : "Unknown failure",
    });
    return c.json({ error: "The coach could not answer right now. Please retry." }, 502);
  }

  let write: { status: string; jobId?: string; jobToken?: string; statement?: string } = {
    status: memory ? "skipped" : "unavailable",
  };

  if (memory && turn.memory) {
    const text = `[${turn.memory.category.toUpperCase()}] ${turn.memory.statement}`;
    try {
      const accepted = await memory.remember(text, namespace, {
        idempotencyKey: await sha256(`${namespace}:${text}`),
      });
      const secret = cookieSecret(c.env);
      write = {
        status: accepted.status,
        jobId: accepted.job_id,
        jobToken: secret ? await signMemoryJob(identity, accepted.job_id, secret) : undefined,
        statement: text,
      };
    } catch (error) {
      console.error("memory_write_failed", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message.slice(0, 300) : "Unknown failure",
      });
      write = { status: "failed", statement: text };
    }
  }

  return c.json({
    reply: turn.reply,
    recalled: recalled.memories,
    memoryOnline: recalled.online,
    write,
  });
});

app.get("/api/memory-jobs/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  if (!safeJobId(jobId)) return c.json({ error: "Invalid job id" }, 400);
  const token = c.req.query("token") ?? "";

  let identity: string;
  try {
    identity = await ensureIdentity(c);
  } catch {
    return c.json({ error: "Server identity is not configured" }, 503);
  }

  const secret = cookieSecret(c.env);
  if (!secret || !(await verifyMemoryJob(identity, jobId, token, secret))) {
    return c.json({ error: "Memory job not found" }, 404);
  }

  const namespace = await userNamespace(identity);
  const memory = createMemoryClient(c.env, namespace);
  if (!memory) return c.json({ error: "Memory is not configured" }, 503);

  try {
    const status = await memory.getRememberStatus(jobId);
    return c.json({
      jobId: status.job_id,
      status: status.status,
      blobId: status.blob_id,
      error: status.status === "failed" ? "Memory write failed" : undefined,
    });
  } catch {
    return c.json({ error: "Unable to read memory status" }, 502);
  }
});

app.post("/api/demo/run", async (c) => {
  let identity: string;
  try {
    identity = await ensureIdentity(c);
  } catch {
    return c.json({ error: "Server identity is not configured" }, 503);
  }

  const ai = aiService(c.env);
  const namespace = await demoNamespace(identity);
  const memory = createMemoryClient(c.env, namespace);
  if (!ai || !memory) return c.json({ error: "Demo services are not configured" }, 503);

  const sessionOne =
    "My goal is to publish my accessibility portfolio this Friday. Perfectionism is blocking me, so I promise to spend 30 minutes today shipping the first case study.";
  const promise =
    "[COMMITMENT] User will spend 30 minutes today publishing the first accessibility case study toward a Friday portfolio launch; perfectionism is the main obstacle.";
  const sessionTwo = "I opened a fresh session. What should I focus on today, and why?";

  try {
    const receipt = await memory.rememberAndWait(promise, namespace, {
      timeoutMs: 45_000,
      idempotencyKey: await sha256(`${namespace}:${promise}`),
    });
    const recalled = await recallSafe(memory, namespace, sessionTwo);
    if (recalled.memories.length === 0) throw new Error("Demo recall returned no memories");

    const question: ChatMessage[] = [{ role: "user", content: sessionTwo }];
    const [baseline, withMemory] = await Promise.all([
      ai.reply(question, []),
      ai.reply(question, recalled.memories),
    ]);

    return c.json({
      sessionOne: { user: sessionOne, saved: promise },
      receipt: {
        jobId: receipt.job_id,
        blobId: receipt.blob_id,
        network: memoryConfigured(c.env) ? "Walrus Mainnet" : "Local mock",
      },
      sessionTwo: { user: sessionTwo, baseline, withMemory },
      recalled: recalled.memories,
    });
  } catch {
    return c.json({ error: "The memory demonstration could not complete" }, 502);
  }
});

app.all("*", async (c) => {
  if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  return c.text("Walrus Promise API", 404);
});

export default app;
