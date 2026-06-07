/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_PROVIDER?: "lmstudio" | "openai";
  readonly VITE_LLM_TIMEOUT_MS?: string;
  readonly VITE_LLM_MAX_TOKENS?: string;
  readonly VITE_LMSTUDIO_BASE_URL?: string;
  readonly VITE_LMSTUDIO_MODEL?: string;
  readonly VITE_LMSTUDIO_REASONING_EFFORT?: "none" | "low" | "medium" | "high";
  readonly VITE_OPENAI_BASE_URL?: string;
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
