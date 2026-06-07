import type {
  LLMClient,
  LLMGenerateRequest,
  LLMGenerateResult,
  LLMMessage,
  LLMProviderName,
} from "../types";

type BaseClientConfig = {
  provider: LLMProviderName;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
};

type OpenAICompatibleChoice = {
  finish_reason?: string | null;
  message?: {
    content?: string | null | Array<{ type?: string; text?: string }>;
    reasoning_content?: string | null;
  };
};

type OpenAICompatibleMessage = NonNullable<OpenAICompatibleChoice["message"]>;

type OpenAICompatibleResponse = {
  model?: string;
  choices?: OpenAICompatibleChoice[];
};

export class BaseOpenAICompatibleClient implements LLMClient {
  readonly provider: LLMProviderName;

  protected readonly baseUrl: string;

  protected readonly apiKey?: string;

  protected readonly defaultModel: string;

  private static readonly DEFAULT_TIMEOUT_MS = 120_000;

  private static readonly DEFAULT_LMSTUDIO_TIMEOUT_MS = 420_000;

  constructor(config: BaseClientConfig) {
    this.provider = config.provider;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? "";
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResult> {
    const model = request.model ?? this.defaultModel;
    const traceId = request.traceId ?? `llm-${Date.now()}`;
    const envTimeoutMs = Number.parseInt(import.meta.env.VITE_LLM_TIMEOUT_MS ?? "", 10);
    const providerDefaultTimeoutMs =
      this.provider === "lmstudio"
        ? BaseOpenAICompatibleClient.DEFAULT_LMSTUDIO_TIMEOUT_MS
        : BaseOpenAICompatibleClient.DEFAULT_TIMEOUT_MS;
    const timeoutMs =
      request.timeoutMs ??
      (Number.isFinite(envTimeoutMs)
        ? envTimeoutMs
        : providerDefaultTimeoutMs);
    const endpoint = `${this.baseUrl}/chat/completions`;
    const requestUrl = import.meta.env.DEV ? "/__llm/chat/completions" : endpoint;
    const startedAt = Date.now();
    const lmStudioReasoningEffort =
      request.reasoningEffort ??
      this.resolveReasoningEffort(import.meta.env.VITE_LMSTUDIO_REASONING_EFFORT);

    if (!model) {
      throw new Error(`No model configured for provider '${this.provider}'.`);
    }

    const controller = new AbortController();
    const timeoutHandle = window.setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let response: Response;

    try {
      response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-provider": this.provider,
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: request.messages.map((message) => this.toWireMessage(message)),
          temperature: request.temperature,
          max_tokens: this.provider === "lmstudio" ? request.maxTokens : undefined,
          max_completion_tokens: this.provider === "openai" ? request.maxTokens : undefined,
          reasoning_effort:
            this.provider === "lmstudio" ? lmStudioReasoningEffort : request.reasoningEffort,
          reasoning:
            this.provider === "lmstudio" && lmStudioReasoningEffort
              ? { effort: lmStudioReasoningEffort }
              : undefined,
          response_format: request.jsonMode ? { type: "json_object" } : undefined,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(
          `LLM request timed out (${this.provider}) after ${Math.round(timeoutMs / 1000)} seconds. traceId=${traceId}, endpoint=${endpoint}`,
        );
      }

      const elapsedMs = Date.now() - startedAt;
      const name = error instanceof Error ? error.name : "UnknownError";
      const message = error instanceof Error ? error.message : String(error);
      const isNetworkFetchError =
        error instanceof TypeError && /failed to fetch|networkerror/i.test(message);

      if (isNetworkFetchError) {
        throw new Error(
          [
            `LLM network request failed before a response was received.`,
            `provider=${this.provider}`,
            `traceId=${traceId}`,
            `endpoint=${endpoint}`,
            `requestUrl=${requestUrl}`,
            `model=${model}`,
            `timeoutMs=${timeoutMs}`,
            `elapsedMs=${elapsedMs}`,
            `browserOnline=${navigator.onLine}`,
            `errorName=${name}`,
            `errorMessage=${message}`,
            `Possible causes: model server not reachable, wrong endpoint/port, CORS block, HTTPS/HTTP mixed-content mismatch, or local firewall interference.`,
          ].join("\n"),
        );
      }

      throw new Error(
        [
          `LLM request failed before a valid response payload was parsed.`,
          `provider=${this.provider}`,
          `traceId=${traceId}`,
          `endpoint=${endpoint}`,
          `requestUrl=${requestUrl}`,
          `model=${model}`,
          `timeoutMs=${timeoutMs}`,
          `elapsedMs=${elapsedMs}`,
          `errorName=${name}`,
          `errorMessage=${message}`,
        ].join("\n"),
      );
    } finally {
      window.clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LLM request failed (${this.provider}) with status ${response.status}. traceId=${traceId}, endpoint=${endpoint}, requestUrl=${requestUrl}, model=${model}\n${errorText}`,
      );
    }

    const payload = (await response.json()) as OpenAICompatibleResponse;
    const choice = payload.choices?.[0];
    const message = choice?.message;
    const content = this.extractContent(message?.content);
    const hasReasoningOnly = !content.trim() && Boolean(message?.reasoning_content?.trim());

    if (hasReasoningOnly) {
      throw new Error(
        [
          `LLM response contained only reasoning output and no assistant content.`,
          `provider=${this.provider}`,
          `traceId=${traceId}`,
          `model=${payload.model ?? model}`,
          `finishReason=${choice?.finish_reason ?? "unknown"}`,
          `Hint: use a non-thinking model, or set VITE_LMSTUDIO_REASONING_EFFORT=none in your environment.`,
        ].join("\n"),
      );
    }

    return {
      provider: this.provider,
      model: payload.model ?? model,
      content,
      finishReason: choice?.finish_reason ?? null,
      raw: payload,
    };
  }

  private toWireMessage(message: LLMMessage) {
    return {
      role: message.role,
      content: message.content,
    };
  }

  private extractContent(content: OpenAICompatibleMessage["content"]): string {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("");
    }

    return "";
  }

  private resolveReasoningEffort(raw?: string): "none" | "low" | "medium" | "high" | undefined {
    if (this.provider !== "lmstudio") {
      return undefined;
    }

    const normalized = (raw ?? "none").trim().toLowerCase();
    if (
      normalized === "none" ||
      normalized === "low" ||
      normalized === "medium" ||
      normalized === "high"
    ) {
      return normalized;
    }

    return "none";
  }
}
