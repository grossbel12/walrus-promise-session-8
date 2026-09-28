import { chatPrompt, replyPrompt } from "./prompts";
import { parseModelJson } from "./validation";
import type { AiService, ChatMessage, ModelTurn, RecalledMemory } from "../types";

const MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

interface WorkersAiResponse {
  response?: unknown;
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
}

export function textFromResponse(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const typed = result as WorkersAiResponse;
    if (typeof typed.response === "string") return typed.response;
    if (typed.response && typeof typed.response === "object") return JSON.stringify(typed.response);
    const choice = typed.choices?.[0];
    if (typeof choice?.message?.content === "string") return choice.message.content;
    if (typeof choice?.text === "string") return choice.text;
  }
  throw new Error("Unexpected AI response");
}

function stripReasoning(value: string): string {
  return value.replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
}

export class WorkersAiService implements AiService {
  constructor(private readonly ai: Ai) {}

  private async run(messages: ChatMessage[]): Promise<string> {
    const result = await this.ai.run(MODEL as never, {
      messages,
      temperature: 0.35,
      max_tokens: 700,
    } as never);
    return textFromResponse(result);
  }

  async chat(history: ChatMessage[], memories: RecalledMemory[]): Promise<ModelTurn> {
    const raw = await this.run(chatPrompt(history, memories));
    return parseModelJson(raw);
  }

  async reply(history: ChatMessage[], memories: RecalledMemory[]): Promise<string> {
    return stripReasoning(await this.run(replyPrompt(history, memories)));
  }
}

export class LocalAiService implements AiService {
  async chat(history: ChatMessage[], memories: RecalledMemory[]): Promise<ModelTurn> {
    const latest = history.at(-1)?.content ?? "";
    const remembered = memories[0]?.text;
    const memoryMatch = latest.match(/(?:goal is|I want to|хочу|цель)[\s:]+(.+)/iu);
    return {
      reply: remembered
        ? `I remember: ${remembered} What is the smallest step you can complete today?`
        : "What is one small, concrete action you can complete today?",
      memory: memoryMatch
        ? { category: "goal", statement: `User's goal: ${memoryMatch[1]!.slice(0, 300)}` }
        : null,
    };
  }

  async reply(_history: ChatMessage[], memories: RecalledMemory[]): Promise<string> {
    return memories[0]
      ? `I remember your promise: ${memories[0].text} Start with the smallest next step today.`
      : "Choose one goal and one action you can finish today.";
  }
}
