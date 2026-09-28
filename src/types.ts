export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type MemoryCategory =
  | "goal"
  | "constraint"
  | "commitment"
  | "preference"
  | "progress";

export interface ExtractedMemory {
  category: MemoryCategory;
  statement: string;
}

export interface ModelTurn {
  reply: string;
  memory: ExtractedMemory | null;
}

export interface RecalledMemory {
  blobId: string;
  text: string;
  distance: number;
}

export interface MemoryStatus {
  status: "pending" | "running" | "uploaded" | "done" | "failed" | "not_found";
  jobId: string;
  blobId?: string;
  error?: string;
}

export interface MemoryClient {
  health(): Promise<{ status: string; version?: string }>;
  recall(input: {
    query: string;
    limit?: number;
    namespace?: string;
    maxDistance?: number;
  }): Promise<{
    results: Array<{ blob_id: string; text: string; distance: number }>;
    total: number;
  }>;
  remember(
    text: string,
    namespace?: string,
    options?: { idempotencyKey?: string },
  ): Promise<{ job_id: string; status: string }>;
  rememberAndWait(
    text: string,
    namespace?: string,
    options?: { timeoutMs?: number; idempotencyKey?: string },
  ): Promise<{ job_id?: string; blob_id: string; owner: string; namespace: string }>;
  getRememberStatus(jobId: string): Promise<{
    job_id: string;
    status: "pending" | "running" | "uploaded" | "done" | "failed" | "not_found";
    blob_id?: string;
    error?: string;
  }>;
}

export interface AiService {
  chat(history: ChatMessage[], memories: RecalledMemory[]): Promise<ModelTurn>;
  reply(history: ChatMessage[], memories: RecalledMemory[]): Promise<string>;
}

export interface AppEnv {
  AI?: Ai;
  ASSETS?: Fetcher;
  APP_ENV?: string;
  COOKIE_SECRET?: string;
  MEMWAL_PRIVATE_KEY?: string;
  MEMWAL_ACCOUNT_ID?: string;
  MEMWAL_SERVER_URL?: string;
}
