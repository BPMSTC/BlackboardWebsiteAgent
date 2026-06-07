import { BaseOpenAICompatibleClient } from "./BaseOpenAICompatibleClient";

type LMStudioClientConfig = {
  baseUrl?: string;
  model?: string;
};

export class LMStudioClient extends BaseOpenAICompatibleClient {
  constructor(config: LMStudioClientConfig = {}) {
    super({
      provider: "lmstudio",
      baseUrl: config.baseUrl ?? import.meta.env.VITE_LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234/v1",
      defaultModel: config.model ?? import.meta.env.VITE_LMSTUDIO_MODEL,
    });
  }
}
