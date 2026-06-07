export type LLMProviderName = "lmstudio" | "openai";

export type LLMRole = "system" | "user" | "assistant";

export type LLMMessage = {
  role: LLMRole;
  content: string;
};

export type LLMGenerateRequest = {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  timeoutMs?: number;
  traceId?: string;
};

export type LLMGenerateResult = {
  provider: LLMProviderName;
  model: string;
  content: string;
  finishReason: string | null;
  raw: unknown;
};

export interface LLMClient {
  readonly provider: LLMProviderName;
  generate(request: LLMGenerateRequest): Promise<LLMGenerateResult>;
}
