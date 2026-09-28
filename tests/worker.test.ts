import { describe, expect, it } from "vitest";
import { app } from "../src/worker";
import type { AppEnv } from "../src/types";

const env: AppEnv = { APP_ENV: "test" };

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Expected identity cookie");
  return setCookie.split(";", 1)[0]!;
}

describe("worker API", () => {
  it("reports a healthy local fallback without exposing secrets", async () => {
    const response = await app.request("http://local.test/api/health", {}, env);
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, network: "mock", memory: "online" });
    expect(JSON.stringify(body)).not.toContain("PRIVATE_KEY");
  });

  it("fails closed in production when secrets are absent", async () => {
    const productionEnv: AppEnv = { APP_ENV: "production" };
    const health = await app.request("http://local.test/api/health", {}, productionEnv);
    await expect(health.json()).resolves.toMatchObject({ ok: false, memory: "not-configured" });

    const chat = await app.request(
      "http://local.test/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hello", history: [] }),
      },
      productionEnv,
    );
    expect(chat.status).toBe(503);
  });

  it("stores, polls and recalls a goal across fresh chat requests", async () => {
    const first = await app.request(
      "http://local.test/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "My goal is: publish the portfolio Friday", history: [] }),
      },
      env,
    );
    expect(first.status).toBe(200);
    const cookie = cookieFrom(first);
    const firstBody = await first.json() as { write: { jobId: string; jobToken: string; statement: string } };
    expect(firstBody.write.statement).toContain("publish the portfolio Friday");

    const status = await app.request(
      `http://local.test/api/memory-jobs/${firstBody.write.jobId}?token=${firstBody.write.jobToken}`,
      { headers: { cookie } },
      env,
    );
    expect(status.status).toBe(200);
    await expect(status.json()).resolves.toMatchObject({ status: "done" });

    const unauthorized = await app.request(
      `http://local.test/api/memory-jobs/${firstBody.write.jobId}?token=wrong`,
      { headers: { cookie } },
      env,
    );
    expect(unauthorized.status).toBe(404);

    const second = await app.request(
      "http://local.test/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ message: "What is my goal?", history: [] }),
      },
      env,
    );
    const secondBody = await second.json() as { recalled: Array<{ text: string }> };
    expect(secondBody.recalled[0]?.text).toContain("publish the portfolio Friday");
  });

  it("keeps two anonymous users isolated", async () => {
    const owner = await app.request(
      "http://local.test/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "My goal is: private alpha launch", history: [] }),
      },
      env,
    );
    expect(owner.status).toBe(200);

    const stranger = await app.request(
      "http://local.test/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "What is my goal?", history: [] }),
      },
      env,
    );
    const body = await stranger.json() as { recalled: unknown[] };
    expect(body.recalled).toHaveLength(0);
  });

  it("runs the autonomous two-session demo", async () => {
    const response = await app.request(
      "http://local.test/api/demo/run",
      { method: "POST" },
      env,
    );
    expect(response.status).toBe(200);
    const body = await response.json() as {
      receipt: { blobId: string };
      sessionTwo: { baseline: string; withMemory: string };
      recalled: unknown[];
    };
    expect(body.receipt.blobId).toMatch(/^mock-blob-/u);
    expect(body.recalled.length).toBeGreaterThan(0);
    expect(body.sessionTwo.withMemory).not.toBe(body.sessionTwo.baseline);
  });

  it("rejects malformed requests and job ids", async () => {
    const badChat = await app.request(
      "http://local.test/api/chat",
      { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      env,
    );
    expect(badChat.status).toBe(400);

    const badJob = await app.request("http://local.test/api/memory-jobs/..%2Fadmin", {}, env);
    expect(badJob.status).toBe(400);
  });
});
