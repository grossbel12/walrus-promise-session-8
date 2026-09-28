import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.EVIDENCE_BASE_URL?.replace(/\/$/u, "");
if (!baseUrl) throw new Error("Set EVIDENCE_BASE_URL to the deployed Walrus Promise URL.");
if (process.env.CONFIRM_MAINNET_EVIDENCE !== "YES") {
  throw new Error("Set CONFIRM_MAINNET_EVIDENCE=YES to authorize exactly 10 evidence writes.");
}

const personas = [
  ["Ari", "publish the cobalt accessibility audit", "review one keyboard flow tonight"],
  ["Bo", "finish the juniper onboarding guide", "draft the first three steps today"],
  ["Cleo", "ship the amber portfolio case study", "write the outcome section before lunch"],
  ["Dara", "launch the orchid user interviews", "invite two participants this afternoon"],
  ["Emi", "complete the silver API tutorial", "record the authentication example tonight"],
  ["Finn", "release the maple budgeting template", "test the formulas for twenty minutes"],
  ["Gia", "submit the violet conference proposal", "outline the opening story today"],
  ["Hugo", "publish the coral design system", "document the button states this evening"],
  ["Inez", "launch the cedar community newsletter", "edit the first issue for thirty minutes"],
  ["Jules", "finish the indigo product brief", "write the risks section before dinner"],
];

function cookieFrom(response) {
  const value = response.headers.get("set-cookie");
  if (!value) throw new Error("The deployment did not issue an identity cookie.");
  return value.split(";", 1)[0];
}

async function json(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}

async function waitForJob(jobId, jobToken, cookie) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const response = await fetch(`${baseUrl}/api/memory-jobs/${encodeURIComponent(jobId)}?token=${encodeURIComponent(jobToken)}`, {
      headers: { cookie },
    });
    const status = await json(response);
    if (status.status === "done") return status;
    if (["failed", "not_found"].includes(status.status)) {
      throw new Error(`Memory job ${jobId} ended as ${status.status}.`);
    }
  }
  throw new Error(`Memory job ${jobId} timed out.`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseUrl,
  disclosure: "Synthetic personas used for reproducible technical verification; not real-user evidence.",
  runs: [],
};

for (const [index, [name, goal, action]] of personas.entries()) {
  const marker = `WP-${String(index + 1).padStart(2, "0")}`;
  const initialMessage = `I am ${name}. My goal is to ${goal}. I promise to ${action}. Remember marker ${marker}.`;
  const firstResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: initialMessage, history: [] }),
  });
  const cookie = cookieFrom(firstResponse);
  const first = await json(firstResponse);
  if (!first.write?.jobId || !first.write?.jobToken) throw new Error(`Persona ${marker} did not create a memory job.`);
  const receipt = await waitForJob(first.write.jobId, first.write.jobToken, cookie);

  const recallQuestion = `In a fresh session, remind me of my goal, promised action, and marker ${marker}.`;
  const second = await json(
    await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ message: recallQuestion, history: [] }),
    }),
  );

  const matched = second.recalled?.some(
    (memory) => memory.blobId === receipt.blobId || memory.text.includes(marker),
  );
  report.runs.push({
    marker,
    savedStatement: first.write.statement,
    jobId: first.write.jobId,
    blobId: receipt.blobId,
    recalled: second.recalled,
    answer: second.reply,
    passed: Boolean(matched),
  });
  process.stdout.write(`${marker}: ${matched ? "PASS" : "FAIL"} ${receipt.blobId ?? ""}\n`);
}

report.summary = {
  writes: report.runs.length,
  passed: report.runs.filter((run) => run.passed).length,
  failed: report.runs.filter((run) => !run.passed).length,
};

await mkdir("artifacts/private", { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-");
const output = `artifacts/private/mainnet-evidence-${timestamp}.json`;
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Report: ${output}\n`);
if (report.summary.failed > 0) process.exitCode = 1;
