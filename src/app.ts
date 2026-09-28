import "./styles.css";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

interface ChatResponse {
  reply: string;
  recalled: Array<{ blobId: string; text: string; distance: number }>;
  memoryOnline: boolean;
  write: { status: string; jobId?: string; jobToken?: string; statement?: string };
}

const messagesElement = document.querySelector<HTMLDivElement>("#messages")!;
const memoryList = document.querySelector<HTMLDivElement>("#memory-list")!;
const form = document.querySelector<HTMLFormElement>("#chat-form")!;
const input = document.querySelector<HTMLTextAreaElement>("#message-input")!;
const sendButton = document.querySelector<HTMLButtonElement>("#send-button")!;
const demoButton = document.querySelector<HTMLButtonElement>("#demo-button")!;
const demoPanel = document.querySelector<HTMLElement>("#demo-panel")!;
const demoGrid = document.querySelector<HTMLDivElement>("#demo-grid")!;
const demoState = document.querySelector<HTMLSpanElement>("#demo-state")!;

let history: Message[] = JSON.parse(sessionStorage.getItem("walrus-promise-history") ?? "[]");

function escapeHtml(value: string): string {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function saveHistory(): void {
  sessionStorage.setItem("walrus-promise-history", JSON.stringify(history.slice(-8)));
}

function addMessage(role: Role, content: string): void {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.innerHTML = `
    ${role === "assistant" ? '<div class="avatar">W</div>' : ""}
    <div class="bubble">${escapeHtml(content)}</div>
  `;
  messagesElement.appendChild(article);
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function showMemory(kind: "saved" | "recalled", text: string, detail: string): void {
  memoryList.querySelector(".empty-state")?.remove();
  const card = document.createElement("article");
  card.className = `memory-card ${kind}`;
  card.innerHTML = `
    <div class="memory-card-head"><span>${kind}</span><i></i></div>
    <p>${escapeHtml(text)}</p>
    <code>${escapeHtml(detail)}</code>
  `;
  memoryList.insertBefore(card, memoryList.firstChild);
}

async function pollJob(jobId: string, jobToken: string, statement: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const response = await fetch(
      `/api/memory-jobs/${encodeURIComponent(jobId)}?token=${encodeURIComponent(jobToken)}`,
    );
    if (!response.ok) return;
    const result = (await response.json()) as { status: string; blobId?: string };
    if (result.status === "done") {
      showMemory("saved", statement, `blob ${result.blobId ?? "confirmed"}`);
      return;
    }
    if (result.status === "failed" || result.status === "not_found") return;
  }
}

async function sendMessage(message: string): Promise<void> {
  const priorHistory = history.slice(-8);
  addMessage("user", message);
  history.push({ role: "user", content: message });
  saveHistory();
  sendButton.disabled = true;
  input.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: priorHistory }),
    });
    const result = (await response.json()) as ChatResponse & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Request failed");

    addMessage("assistant", result.reply);
    history.push({ role: "assistant", content: result.reply });
    saveHistory();

    for (const memory of result.recalled) {
      showMemory("recalled", memory.text, `distance ${memory.distance.toFixed(3)} · ${memory.blobId}`);
    }
    if (result.write.jobId && result.write.jobToken && result.write.statement) {
      showMemory("saved", result.write.statement, `job ${result.write.jobId.slice(0, 12)}… pending`);
      void pollJob(result.write.jobId, result.write.jobToken, result.write.statement);
    }
  } catch (error) {
    addMessage("assistant", error instanceof Error ? error.message : "The coach is unavailable.");
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  void sendMessage(message);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelector("#new-session")!.addEventListener("click", () => {
  history = [];
  sessionStorage.removeItem("walrus-promise-history");
  messagesElement.innerHTML = "";
  addMessage("assistant", "Fresh session. Your long-term Walrus memories are still here. What should we continue?");
  input.focus();
});

demoButton.addEventListener("click", async () => {
  demoButton.disabled = true;
  demoPanel.hidden = false;
  demoPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  demoState.textContent = "Writing a promise to Walrus…";
  demoGrid.innerHTML = '<div class="demo-loading"><i></i><span>Session one → encrypted memory → fresh session</span></div>';

  try {
    const response = await fetch("/api/demo/run", { method: "POST" });
    const result = await response.json() as {
      error?: string;
      sessionOne: { user: string; saved: string };
      receipt: { blobId: string; network: string };
      sessionTwo: { user: string; baseline: string; withMemory: string };
      recalled: Array<{ distance: number }>;
    };
    if (!response.ok) throw new Error(result.error ?? "Demo failed");
    demoState.textContent = `Verified · ${result.receipt.network}`;
    demoGrid.innerHTML = `
      <article class="demo-step">
        <span>01 · SESSION ONE</span>
        <p>${escapeHtml(result.sessionOne.user)}</p>
        <code>saved → ${escapeHtml(result.receipt.blobId)}</code>
      </article>
      <article class="demo-step baseline">
        <span>02 · WITHOUT MEMORY</span>
        <p>${escapeHtml(result.sessionTwo.baseline)}</p>
        <code>generic answer</code>
      </article>
      <article class="demo-step remembered">
        <span>03 · NEW SESSION + WALRUS</span>
        <p>${escapeHtml(result.sessionTwo.withMemory)}</p>
        <code>recall distance ${result.recalled[0]?.distance.toFixed(3) ?? "n/a"}</code>
      </article>
    `;
  } catch (error) {
    demoState.textContent = "Demo unavailable";
    demoGrid.innerHTML = `<p class="demo-error">${escapeHtml(error instanceof Error ? error.message : "Demo failed")}</p>`;
  } finally {
    demoButton.disabled = false;
  }
});

async function loadHealth(): Promise<void> {
  try {
    const response = await fetch("/api/health");
    const health = await response.json() as { memory: string; network: string };
    document.querySelector("#network-label")!.textContent = health.network === "mainnet" ? "Walrus Mainnet" : "Local preview";
    document.querySelector("#memory-label")!.textContent = health.memory === "online" ? "Memory online" : "Memory degraded";
    document.querySelector("#memory-dot")!.classList.toggle("offline", health.memory !== "online");
  } catch {
    document.querySelector("#memory-label")!.textContent = "Memory unavailable";
    document.querySelector("#memory-dot")!.classList.add("offline");
  }
}

for (const message of history) addMessage(message.role, message.content);
void loadHealth();
