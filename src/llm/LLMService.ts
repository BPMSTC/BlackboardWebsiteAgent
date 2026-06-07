import { LMStudioClient } from "./providers/LMStudioClient";
import { OpenAIClient } from "./providers/OpenAIClient";
import type {
  LLMClient,
  LLMGenerateRequest,
  LLMGenerateResult,
  LLMMessage,
  LLMProviderName,
} from "./types";

type LLMServiceOptions = {
  provider?: LLMProviderName;
  clients?: Partial<Record<LLMProviderName, LLMClient>>;
};

const SYSTEM_PROMPT_CONTRACT = [
  "You are an instructional content generator for Blackboard lesson pages.",
  "Treat user-provided constraints as mandatory requirements.",
  "Never include quizzes, tests, or assessment prompts unless explicitly requested.",
  "If constraints conflict, prioritize explicit do-not-include and safety requirements.",
  "Return only the requested lesson draft content with clear headings and accessible structure.",
].join(" ");

export class LLMService {
  private readonly clients: Partial<Record<LLMProviderName, LLMClient>>;

  private activeProvider: LLMProviderName;

  constructor(options: LLMServiceOptions = {}) {
    this.activeProvider = options.provider ?? this.resolveDefaultProvider();
    this.clients = options.clients ?? {};
  }

  useProvider(provider: LLMProviderName) {
    this.activeProvider = provider;
  }

  getProvider() {
    return this.activeProvider;
  }

  async generate(request: LLMGenerateRequest) {
    const client = this.getOrCreateClient(this.activeProvider);
    return client.generate(request);
  }

  async generateFromPrompt(prompt: string, options: Omit<LLMGenerateRequest, "messages"> = {}) {
    const messages: LLMMessage[] = [
      { role: "system", content: SYSTEM_PROMPT_CONTRACT },
      { role: "user", content: prompt },
    ];

    return this.generate({
      ...options,
      messages,
    });
  }

  private resolveDefaultProvider(): LLMProviderName {
    const envProvider = import.meta.env.VITE_LLM_PROVIDER;
    return envProvider === "openai" ? "openai" : "lmstudio";
  }

  private getOrCreateClient(provider: LLMProviderName): LLMClient {
    if (this.clients[provider]) {
      return this.clients[provider] as LLMClient;
    }

    const created = provider === "openai" ? new OpenAIClient() : new LMStudioClient();
    this.clients[provider] = created;

    return created;
  }
}

export async function runPrompt(
  prompt: string,
  options: {
    provider?: LLMProviderName;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    reasoningEffort?: "none" | "low" | "medium" | "high";
    timeoutMs?: number;
    traceId?: string;
  } = {},
): Promise<LLMGenerateResult> {
  const service = new LLMService({ provider: options.provider });

  return service.generateFromPrompt(prompt, {
    model: options.model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    jsonMode: options.jsonMode,
    reasoningEffort: options.reasoningEffort,
    timeoutMs: options.timeoutMs,
    traceId: options.traceId,
  });
}
