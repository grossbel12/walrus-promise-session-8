import { MemWal, MemWalMock } from "@mysten-incubation/memwal";
import type { AppEnv, MemoryClient, RecalledMemory } from "../types";

const mockClients = new Map<string, MemWalMock>();

export function memoryConfigured(env: AppEnv): boolean {
  return Boolean(env.MEMWAL_PRIVATE_KEY && env.MEMWAL_ACCOUNT_ID);
}

export function createMemoryClient(env: AppEnv, namespace: string): MemoryClient | null {
  if (memoryConfigured(env)) {
    return MemWal.create({
      key: env.MEMWAL_PRIVATE_KEY!,
      accountId: env.MEMWAL_ACCOUNT_ID!,
      serverUrl: env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz",
      namespace,
      requestTimeoutMs: 15_000,
    }) as MemoryClient;
  }

  if (env.APP_ENV !== "production") {
    let mock = mockClients.get(namespace);
    if (!mock) {
      mock = MemWalMock.create({ namespace });
      mockClients.set(namespace, mock);
    }
    return mock as MemoryClient;
  }
  return null;
}

export async function recallSafe(
  client: MemoryClient | null,
  namespace: string,
  query: string,
): Promise<{ memories: RecalledMemory[]; online: boolean }> {
  if (!client) return { memories: [], online: false };
  try {
    // Exclude only a complete mismatch here. The relayer's semantic distance is
    // model-dependent; stricter relevance policy is applied in the model prompt.
    const result = await client.recall({ query, limit: 5, namespace, maxDistance: 0.99 });
    return {
      online: true,
      memories: result.results.map((memory) => ({
        blobId: memory.blob_id,
        text: memory.text,
        distance: memory.distance,
      })),
    };
  } catch {
    return { memories: [], online: false };
  }
}
