import { BaseOpenAICompatibleClient } from "./BaseOpenAICompatibleClient";

type OpenAIClientConfig = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

export class OpenAIClient extends BaseOpenAICompatibleClient {
  constructor(config: OpenAIClientConfig = {}) {
    const apiKey = config.apiKey ?? import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAI API key is missing. Set VITE_OPENAI_API_KEY before using the OpenAI client.",
      );
    }

    super({
      provider: "openai",
      baseUrl: config.baseUrl ?? import.meta.env.VITE_OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey,
      defaultModel: config.model ?? import.meta.env.VITE_OPENAI_MODEL,
    });
  }
}
