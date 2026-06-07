# Blackboard HTML Textbook Page Builder

This is a frontend prototype for building Blackboard-ready instructional HTML pages. Faculty enter lesson requirements, tune scope/source/style/media options, inspect a structured lesson outline, review validation checks, and copy or download a full HTML document for Blackboard's content editor.

The current version is intentionally frontend-only. It does not call an LLM API yet; it renders a deterministic starter document from local form state so the workflow can be tested before generation logic gets more expensive and dramatic.

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- Vitest and React Testing Library

## Run Locally

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Current Product Surface

- Quick Create lesson intake
- Advanced panels for content, scope, sources, style, media, interactivity, and assets
- Scope recommendation for single-page vs multi-page generation
- Structured lesson/canvas outline
- Render validation checklist
- Full HTML document preview
- Intake JSON preview
- Copy output and download HTML actions

## Not In Version 1

- Real LLM generation
- Web research execution
- GitHub asset upload
- Saved profiles
- Section-level AI revision
- Blackboard API integration
- Assessments, quizzes, or knowledge checks

## LLM Provider Layer (Foundation)

The project now includes a shared LLM service layer so app features can call either:

- Local models through LM Studio (OpenAI-compatible local endpoint)
- Cloud models through OpenAI

Core files:

- `src/llm/types.ts` - shared request/response/provider contracts
- `src/llm/providers/BaseOpenAICompatibleClient.ts` - reusable OpenAI-compatible HTTP client
- `src/llm/providers/LMStudioClient.ts` - LM Studio provider adapter
- `src/llm/providers/OpenAIClient.ts` - OpenAI provider adapter
- `src/llm/LLMService.ts` - common provider-selection facade

Environment variables:

- `VITE_LLM_PROVIDER=lmstudio|openai`
- `VITE_LLM_TIMEOUT_MS=420000` (recommended for slower local models)
- `VITE_LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1`
- `VITE_LMSTUDIO_MODEL=<local-model-id>`
- `VITE_LMSTUDIO_REASONING_EFFORT=none|low|medium|high` (default is `none`)
- `VITE_OPENAI_BASE_URL=https://api.openai.com/v1`
- `VITE_OPENAI_MODEL=<openai-model-id>`
- `VITE_OPENAI_API_KEY=<api-key>`

Example usage:

```ts
import { runPrompt } from "./llm";

const result = await runPrompt("Explain HTTP caching at Level 1", {
	provider: "lmstudio",
	model: "qwen2.5-7b-instruct",
});

console.log(result.content);
```

Note: this is the provider foundation. Feature code still needs to wire this service into the tutorial generation workflow.
