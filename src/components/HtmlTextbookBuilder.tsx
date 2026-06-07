import { Check, Clipboard, Download, FileCode2, PanelRightOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { defaultFormState, disciplines, interactionTypes, studentLevels } from "../data/builderOptions";
import { runPrompt } from "../llm";
import type { BuilderFormState } from "../types/builder";
import { logDebug, logInfo, logWarn } from "../utils/devLogger";
import { buildBuilderOutput } from "../utils/builderOutput";
import { validateLlmDraftAgainstIntake } from "../utils/llmDraftValidation";

type CopyTarget = "html" | "intake";

type LLMRequestDiagnostics = {
  traceId: string;
  provider: string;
  endpoint: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
  promptChars: number;
  startedAt: string;
  completedAt?: string;
  elapsedMs?: number;
  status?: "running" | "done" | "failed";
  finishReason?: string | null;
  error?: string;
  browserOnline?: boolean;
  validationPassed?: boolean;
  validationViolations?: string[];
  retryAttempted?: boolean;
  retrySucceeded?: boolean;
  retryError?: string;
};

type BuilderPreset = {
  id: "typescript_loops" | "nursing_triage" | "networking_subnetting";
  label: string;
  description: string;
  form: BuilderFormState;
};

const builderPresets: BuilderPreset[] = [
  {
    id: "typescript_loops",
    label: "Test 1: TypeScript Loops",
    description: "Programming lesson with interactive mode and web research.",
    form: {
      ...defaultFormState,
      lessonRequest: {
        ...defaultFormState.lessonRequest,
        topic: "TypeScript loops",
        discipline: "Programming",
        courseName: "Software Development Fundamentals",
        studentLevel: "Freshman / sophomore college",
        tutorialDepthLevel: 1,
        tutorialMode: "B",
      },
      contentRequirements: {
        ...defaultFormState.contentRequirements,
        requiredConcepts: "for loop\nwhile loop\ndo...while loop\nfor...of loop\nloop safety and stopping conditions",
        doNotInclude: "Quizzes\nKnowledge checks\nAssessment prompts",
        priorKnowledge: "Students understand variables, booleans, and simple conditionals.",
        commonStudentStruggles: "Off-by-one errors and accidental infinite loops.",
        instructorNotes: "Keep examples tied to classroom coding labs and Blackboard assignments.",
      },
      scope: {
        ...defaultFormState.scope,
        pageCountPreference: "force_one_page",
        contentLength: "standard",
      },
      sources: {
        ...defaultFormState.sources,
        researchMode: "web_research",
        preferredSources: "TypeScript docs\nMDN Web Docs",
      },
      style: {
        ...defaultFormState.style,
        template: "interactive_tutorial",
        frameworkPreference: "plain_css",
        tone: "friendly",
        colorPreference: "Navy and amber high contrast",
      },
      media: {
        ...defaultFormState.media,
        imageInstructions: "Include a simple flowchart that shows loop start, condition, repeat, and stop.",
        generateImages: "agent_decides",
        findWebImages: "agent_decides",
      },
      interactivity: {
        ...defaultFormState.interactivity,
        preference: "requested",
        allowedTypes: ["step_through", "interactive_diagram", "code_demo", "reveal_explanation"],
        notes: "Use one interactive code walkthrough that traces loop iterations.",
      },
      githubAssets: {
        ...defaultFormState.githubAssets,
        lessonFolderSlug: "programming/typescript-loops",
      },
      output: {
        ...defaultFormState.output,
        alsoGenerateDownloadableHtml: true,
      },
    },
  },
  {
    id: "nursing_triage",
    label: "Test 2: Nursing Triage",
    description: "Provided-material mode with low interactivity and visual guide style.",
    form: {
      ...defaultFormState,
      lessonRequest: {
        ...defaultFormState.lessonRequest,
        topic: "Emergency room triage prioritization",
        discipline: "Nursing",
        courseName: "Nursing Assessment and Prioritization",
        studentLevel: "Second-year college",
        tutorialDepthLevel: 2,
        tutorialMode: "A",
      },
      contentRequirements: {
        ...defaultFormState.contentRequirements,
        requiredConcepts: "Triage levels\nChief complaint\nVital sign red flags\nEscalation workflow",
        requiredExactWording: "Patient safety and escalation must be emphasized in every scenario.",
        doNotInclude: "Medication dosage instruction\nLicensure exam prep language",
        priorKnowledge: "Students completed intro patient assessment and charting labs.",
        commonStudentStruggles: "Students over-prioritize pain score without considering airway and perfusion.",
      },
      scope: {
        ...defaultFormState.scope,
        pageCountPreference: "custom",
        customPageCount: "2",
        contentLength: "detailed",
      },
      sources: {
        ...defaultFormState.sources,
        researchMode: "provided_material_only",
        pastedSourceText: "Use hospital policy summary, simulation notes, and instructor-approved triage rubric.",
        includeForMoreInformation: false,
      },
      style: {
        ...defaultFormState.style,
        template: "visual_guide",
        frameworkPreference: "plain_css",
        tone: "professional",
        colorPreference: "Clinical blue and slate high contrast",
      },
      media: {
        ...defaultFormState.media,
        imageInstructions: "Use static infographic style icons for triage flow and urgency levels.",
        generateImages: "no",
        findWebImages: "no",
      },
      interactivity: {
        ...defaultFormState.interactivity,
        preference: "none",
        allowedTypes: [],
        notes: "No interactive widgets for this policy-focused version.",
      },
      output: {
        ...defaultFormState.output,
        includeForMoreInformation: false,
      },
    },
  },
  {
    id: "networking_subnetting",
    label: "Test 3: Networking Subnetting",
    description: "Mixed-source mode with detailed breakdown and requested interactivity.",
    form: {
      ...defaultFormState,
      lessonRequest: {
        ...defaultFormState.lessonRequest,
        topic: "IPv4 subnetting with CIDR",
        discipline: "Networking",
        courseName: "Networking and Infrastructure Basics",
        studentLevel: "First-year college",
        tutorialDepthLevel: 2,
        tutorialMode: "C",
      },
      contentRequirements: {
        ...defaultFormState.contentRequirements,
        requiredConcepts: "CIDR notation\nSubnet mask conversion\nHost count calculation\nNetwork and broadcast addresses",
        optionalConcepts: "VLSM intro\nCommon enterprise subnet patterns",
        doNotInclude: "Certification exam dumps\nAssessment prompts",
        priorKnowledge: "Students can convert binary and decimal numbers.",
        commonStudentStruggles: "Bit borrowing and host-range mistakes.",
      },
      scope: {
        ...defaultFormState.scope,
        pageCountPreference: "custom",
        customPageCount: "3",
        contentLength: "detailed",
        largeTopicWorkflow: "outline_first",
      },
      sources: {
        ...defaultFormState.sources,
        researchMode: "web_plus_provided_material",
        pastedSourceText: "Include classroom worksheet examples and the instructor subnetting cheatsheet.",
        preferredSources: "Cisco documentation\nCloudflare learning docs",
        sourcesToAvoid: "Forum threads without citations",
      },
      style: {
        ...defaultFormState.style,
        template: "visual_guide",
        frameworkPreference: "plain_css",
        tone: "conversational",
        colorPreference: "Dark teal and orange with high contrast",
      },
      media: {
        ...defaultFormState.media,
        imageInstructions: "Include a subnetting table visual and a binary place-value chart.",
        generateImages: "yes",
        findWebImages: "yes",
      },
      interactivity: {
        ...defaultFormState.interactivity,
        preference: "requested",
        allowedTypes: ["step_through", "slider_demo", "toggle_comparison", "reveal_explanation"],
        notes: "Add a slider that changes CIDR and updates host count examples.",
      },
      githubAssets: {
        ...defaultFormState.githubAssets,
        lessonFolderSlug: "networking/ipv4-subnetting-cidr",
      },
      output: {
        ...defaultFormState.output,
        alsoGenerateDownloadableHtml: true,
      },
    },
  },
];

function updateNested<T extends keyof BuilderFormState, K extends keyof BuilderFormState[T]>(
  state: BuilderFormState,
  group: T,
  key: K,
  value: BuilderFormState[T][K],
) {
  return {
    ...state,
    [group]: {
      ...state[group],
      [key]: value,
    },
  };
}

function FieldGroup({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="advanced-panel" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="advanced-panel-content">{children}</div>
    </details>
  );
}

export function HtmlTextbookBuilder() {
  const [form, setForm] = useState<BuilderFormState>(defaultFormState);
  const [activePresetId, setActivePresetId] = useState<BuilderPreset["id"] | null>(null);
  const [activeOutput, setActiveOutput] = useState<"html" | "intake">("html");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [llmResult, setLlmResult] = useState<string>("");
  const [llmStatus, setLlmStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [llmElapsedSeconds, setLlmElapsedSeconds] = useState(0);
  const [llmDiagnostics, setLlmDiagnostics] = useState<LLMRequestDiagnostics | null>(null);
  const output = useMemo(() => buildBuilderOutput(form), [form]);

  useEffect(() => {
    if (llmStatus !== "running") {
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setLlmElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [llmStatus]);

  useEffect(() => {
    logInfo("builder.initialized", {
      defaultDiscipline: form.lessonRequest.discipline,
      defaultTemplate: form.style.template,
    });
  }, []);

  function setField<T extends keyof BuilderFormState, K extends keyof BuilderFormState[T]>(
    group: T,
    key: K,
    value: BuilderFormState[T][K],
  ) {
    logDebug("builder.field.updated", {
      group,
      key,
      value,
    });
    setForm((current) => updateNested(current, group, key, value));
    setCopyStatus("idle");
  }

  function toggleInteraction(typeId: string) {
    const current = form.interactivity.allowedTypes;
    const next = current.includes(typeId)
      ? current.filter((item) => item !== typeId)
      : [...current, typeId];
    logDebug("builder.interaction.toggled", {
      typeId,
      enabled: !current.includes(typeId),
    });
    setField("interactivity", "allowedTypes", next);
  }

  function applyPreset(preset: BuilderPreset) {
    setForm(preset.form);
    setActivePresetId(preset.id);
    setCopyStatus("idle");
    setActiveOutput("html");
    setLlmResult("");
    setLlmStatus("idle");
    setLlmDiagnostics(null);
    logInfo("builder.preset.applied", {
      presetId: preset.id,
      presetLabel: preset.label,
      topic: preset.form.lessonRequest.topic,
      discipline: preset.form.lessonRequest.discipline,
    });
  }

  async function copyOutput(target: CopyTarget) {
    const text = target === "html" ? output.renderedHtml : output.intakeJson;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      logInfo("builder.output.copied", {
        target,
        characters: text.length,
      });
    } catch {
      setCopyStatus("failed");
      logWarn("builder.output.copy_failed", {
        target,
      });
    }
  }

  function downloadHtml() {
    const fileName = `${form.lessonRequest.topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "blackboard-lesson"}.html`;
    const blob = new Blob([output.renderedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    logInfo("builder.output.downloaded", {
      fileName,
      characters: output.renderedHtml.length,
    });
  }

  async function generateWithLlm() {
    const traceId = `llm-${Date.now()}`;
    const provider = import.meta.env.VITE_LLM_PROVIDER ?? "lmstudio";
    const timeoutMs = Number.parseInt(import.meta.env.VITE_LLM_TIMEOUT_MS ?? "", 10) || 420_000;
    const configuredMaxTokens = Number.parseInt(import.meta.env.VITE_LLM_MAX_TOKENS ?? "", 10) || 900;
    const suggestedByPages = output.pageCount > 1 ? output.pageCount * 350 : 600;
    const maxTokens = Math.max(configuredMaxTokens, suggestedByPages);
    const selectedModel =
      provider === "openai"
        ? import.meta.env.VITE_OPENAI_MODEL ?? "(not set)"
        : import.meta.env.VITE_LMSTUDIO_MODEL ?? "(not set)";
    const endpoint =
      provider === "openai"
        ? `${import.meta.env.VITE_OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`
        : `${import.meta.env.VITE_LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234/v1"}/chat/completions`;
    const startedAtMs = Date.now();

    setLlmStatus("running");
    setLlmElapsedSeconds(0);
    setLlmResult("");
    setLlmDiagnostics({
      traceId,
      provider,
      endpoint,
      model: selectedModel,
      timeoutMs,
      maxTokens,
      promptChars: output.generationPrompt.length,
      startedAt: new Date(startedAtMs).toISOString(),
      status: "running",
      browserOnline: navigator.onLine,
    });

    logInfo("builder.llm.generate_started", {
      traceId,
      provider,
      endpoint,
      timeoutMs,
      maxTokens,
      promptChars: output.generationPrompt.length,
      browserOnline: navigator.onLine,
    });

    try {
      const response = await runPrompt(output.generationPrompt, {
        model: provider === "openai" ? import.meta.env.VITE_OPENAI_MODEL : import.meta.env.VITE_LMSTUDIO_MODEL,
        temperature: 0.4,
        timeoutMs,
        maxTokens,
        traceId,
      });

      let finalResponse = response;
      let validation = validateLlmDraftAgainstIntake(output.intakeJson, response.content);
      let retryAttempted = false;
      let retrySucceeded = false;
      let retryError: string | undefined;

      if (!validation.isValid) {
        retryAttempted = true;
        logWarn("builder.llm.validation_failed", {
          traceId,
          violations: validation.violations,
        });

        try {
          const retryResponse = await runPrompt(validation.correctivePrompt, {
            model:
              provider === "openai" ? import.meta.env.VITE_OPENAI_MODEL : import.meta.env.VITE_LMSTUDIO_MODEL,
            temperature: 0.2,
            timeoutMs,
            maxTokens,
            traceId: `${traceId}-retry1`,
          });

          const mergedRetryContent =
            validation.retryStrategy === "append_missing_sections"
              ? [response.content.trim(), retryResponse.content.trim()].filter(Boolean).join("\n\n")
              : retryResponse.content;

          finalResponse = {
            ...retryResponse,
            content: mergedRetryContent,
          };

          const retryValidation = validateLlmDraftAgainstIntake(output.intakeJson, finalResponse.content);
          if (retryValidation.isValid) {
            validation = retryValidation;
            retrySucceeded = true;
          } else {
            validation = retryValidation;
          }
        } catch (error) {
          retryError = error instanceof Error ? error.message : "Unknown retry failure";
          logWarn("builder.llm.retry_failed", {
            traceId,
            retryError,
          });
        }
      }

      const completedAtMs = Date.now();
      const elapsedMs = completedAtMs - startedAtMs;

      setLlmResult(finalResponse.content || "(Model returned no content)");
      setLlmStatus("done");
      setLlmDiagnostics((current) =>
        current
          ? {
              ...current,
              completedAt: new Date(completedAtMs).toISOString(),
              elapsedMs,
              status: "done",
              finishReason: finalResponse.finishReason,
              model: finalResponse.model,
              validationPassed: validation.isValid,
              validationViolations: validation.violations,
              retryAttempted,
              retrySucceeded,
              retryError,
            }
          : current,
      );
      logInfo("builder.llm.generate_succeeded", {
        traceId,
        provider: finalResponse.provider,
        model: finalResponse.model,
        finishReason: finalResponse.finishReason,
        elapsedMs,
        validationPassed: validation.isValid,
        retryAttempted,
        retrySucceeded,
      });
    } catch (error) {
      const completedAtMs = Date.now();
      const elapsedMs = completedAtMs - startedAtMs;
      const message = error instanceof Error ? error.message : "Unknown LLM error";
      setLlmResult(message);
      setLlmStatus("failed");
      setLlmDiagnostics((current) =>
        current
          ? {
              ...current,
              completedAt: new Date(completedAtMs).toISOString(),
              elapsedMs,
              status: "failed",
              error: message,
              browserOnline: navigator.onLine,
            }
          : current,
      );
      logWarn("builder.llm.generate_failed", {
        traceId,
        provider,
        endpoint,
        timeoutMs,
        maxTokens,
        elapsedMs,
        browserOnline: navigator.onLine,
        message,
      });
    }
  }

  function selectOutput(target: "html" | "intake") {
    setActiveOutput(target);
    logDebug("builder.output.tab_selected", {
      target,
    });
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-content">
          <p className="eyebrow">Blackboard-ready builder</p>
          <h1>HTML Textbook Page Builder</h1>
          <p className="model-indicator" aria-label="Active LLM provider and model">
            <span className="model-indicator-badge">
              {(import.meta.env.VITE_LLM_PROVIDER ?? "lmstudio").toUpperCase()}
            </span>
            {import.meta.env.VITE_LLM_PROVIDER === "openai"
              ? (import.meta.env.VITE_OPENAI_MODEL ?? "(model not set)")
              : (import.meta.env.VITE_LMSTUDIO_MODEL ?? "(model not set)")}
          </p>
          <p className="hero-copy">
            Build structured instructional HTML pages faculty can copy into Blackboard.
            Start with a topic, tune the teaching requirements, then preview the page
            outline, validation checks, and full HTML output.
          </p>
          <div className="preset-bar" role="group" aria-label="Quick test case presets">
            {builderPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-button ${activePresetId === preset.id ? "is-active" : ""}`}
                onClick={() => applyPreset(preset)}
                title={preset.description}
              >
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="workspace">
        <section className="builder-card intake-card" aria-labelledby="quick-create-heading">
          <div className="section-heading compact">
            <p className="eyebrow">Quick create</p>
            <h2 id="quick-create-heading">Lesson intake</h2>
            <p>These fields are enough to create a sane first draft. Advanced controls are below.</p>
          </div>

          <div className="form-grid">
            <div className="field-row wide">
              <label htmlFor="topic">Lesson topic</label>
              <input
                id="topic"
                value={form.lessonRequest.topic}
                onChange={(event) => setField("lessonRequest", "topic", event.target.value)}
                placeholder="CSS Grid layout basics"
              />
            </div>

            <div className="field-row">
              <label htmlFor="course-name">Course name</label>
              <input
                id="course-name"
                value={form.lessonRequest.courseName}
                onChange={(event) => setField("lessonRequest", "courseName", event.target.value)}
                placeholder="Web Design 1"
              />
            </div>

            <div className="field-row">
              <label htmlFor="discipline">Course / discipline</label>
              <select
                id="discipline"
                value={form.lessonRequest.discipline}
                onChange={(event) => setField("lessonRequest", "discipline", event.target.value)}
              >
                {disciplines.map((discipline) => (
                  <option key={discipline}>{discipline}</option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <label htmlFor="student-level">Student level</label>
              <select
                id="student-level"
                value={form.lessonRequest.studentLevel}
                onChange={(event) => setField("lessonRequest", "studentLevel", event.target.value)}
              >
                {studentLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <label htmlFor="style-template">Style template</label>
              <select
                id="style-template"
                value={form.style.template}
                onChange={(event) =>
                  setField("style", "template", event.target.value as BuilderFormState["style"]["template"])
                }
              >
                <option value="clean_academic">Clean Academic</option>
                <option value="visual_guide">Visual Guide</option>
                <option value="interactive_tutorial">Interactive Tutorial</option>
              </select>
            </div>
          </div>

          <div className="scope-banner" aria-live="polite">
            <strong>{output.recommendedScope}</strong>
            <span>
              Target output: full HTML document, embedded CSS/JS, no Blackboard navigation,
              no quizzes.
            </span>
          </div>
        </section>

        <section className="builder-card" aria-labelledby="advanced-heading">
          <div className="section-heading compact">
            <p className="eyebrow">Advanced options</p>
            <h2 id="advanced-heading">Generation controls</h2>
          </div>

          <FieldGroup title="Content requirements" defaultOpen>
            <div className="form-grid">
              <div className="field-row">
                <label htmlFor="required-concepts">Required concepts</label>
                <textarea
                  id="required-concepts"
                  value={form.contentRequirements.requiredConcepts}
                  onChange={(event) =>
                    setField("contentRequirements", "requiredConcepts", event.target.value)
                  }
                  placeholder="Grid container&#10;Grid tracks&#10;Gap"
                />
              </div>
              <div className="field-row">
                <label htmlFor="do-not-include">Do not include</label>
                <textarea
                  id="do-not-include"
                  value={form.contentRequirements.doNotInclude}
                  onChange={(event) => setField("contentRequirements", "doNotInclude", event.target.value)}
                  placeholder="Quizzes&#10;Advanced subgrid details"
                />
              </div>
              <div className="field-row">
                <label htmlFor="prior-knowledge">Student prior knowledge</label>
                <textarea
                  id="prior-knowledge"
                  value={form.contentRequirements.priorKnowledge}
                  onChange={(event) =>
                    setField("contentRequirements", "priorKnowledge", event.target.value)
                  }
                  placeholder="Students know basic HTML and CSS selectors."
                />
              </div>
              <div className="field-row">
                <label htmlFor="student-struggles">Common student struggles</label>
                <textarea
                  id="student-struggles"
                  value={form.contentRequirements.commonStudentStruggles}
                  onChange={(event) =>
                    setField("contentRequirements", "commonStudentStruggles", event.target.value)
                  }
                  placeholder="Students confuse rows, columns, and grid areas."
                />
              </div>
            </div>
          </FieldGroup>

          <FieldGroup title="Scope, sources, and style">
            <div className="form-grid">
              <div className="field-row">
                <label htmlFor="page-count">Page count preference</label>
                <select
                  id="page-count"
                  value={form.scope.pageCountPreference}
                  onChange={(event) =>
                    setField(
                      "scope",
                      "pageCountPreference",
                      event.target.value as BuilderFormState["scope"]["pageCountPreference"],
                    )
                  }
                >
                  <option value="agent_recommends">Agent recommends</option>
                  <option value="force_one_page">Force one page</option>
                  <option value="custom">Custom number</option>
                </select>
              </div>
              <div className="field-row">
                <label htmlFor="custom-page-count">Custom page count</label>
                <input
                  id="custom-page-count"
                  inputMode="numeric"
                  value={form.scope.customPageCount}
                  onChange={(event) => setField("scope", "customPageCount", event.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="field-row">
                <label htmlFor="research-mode">Research mode</label>
                <select
                  id="research-mode"
                  value={form.sources.researchMode}
                  onChange={(event) =>
                    setField("sources", "researchMode", event.target.value as BuilderFormState["sources"]["researchMode"])
                  }
                >
                  <option value="web_research">Web research</option>
                  <option value="provided_material_only">Provided material only</option>
                  <option value="web_plus_provided_material">Web + provided material</option>
                </select>
              </div>
              <div className="field-row">
                <label htmlFor="framework">Framework preference</label>
                <select
                  id="framework"
                  value={form.style.frameworkPreference}
                  onChange={(event) =>
                    setField(
                      "style",
                      "frameworkPreference",
                      event.target.value as BuilderFormState["style"]["frameworkPreference"],
                    )
                  }
                >
                  <option value="agent_decides">Agent decides</option>
                  <option value="plain_css">Plain CSS</option>
                  <option value="bootstrap">Bootstrap</option>
                  <option value="tailwind">Tailwind</option>
                </select>
              </div>
            </div>
          </FieldGroup>

          <FieldGroup title="Media, interactivity, and assets">
            <div className="form-grid">
              <div className="field-row">
                <label htmlFor="image-instructions">Image instructions</label>
                <textarea
                  id="image-instructions"
                  value={form.media.imageInstructions}
                  onChange={(event) => setField("media", "imageInstructions", event.target.value)}
                  placeholder="Use a simple inline diagram unless an uploaded image is provided."
                />
              </div>
              <div className="field-row">
                <label htmlFor="youtube-url">YouTube URL</label>
                <input
                  id="youtube-url"
                  value={form.media.youtubeUrl}
                  onChange={(event) => setField("media", "youtubeUrl", event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <fieldset className="check-field">
                <legend>Allowed interaction types</legend>
                {interactionTypes.map((type) => (
                  <label key={type.id}>
                    <input
                      type="checkbox"
                      checked={form.interactivity.allowedTypes.includes(type.id)}
                      onChange={() => toggleInteraction(type.id)}
                    />
                    {type.label}
                  </label>
                ))}
              </fieldset>
              <div className="field-row">
                <label htmlFor="github-folder">GitHub asset folder</label>
                <input
                  id="github-folder"
                  value={form.githubAssets.lessonFolderSlug}
                  onChange={(event) => setField("githubAssets", "lessonFolderSlug", event.target.value)}
                  placeholder="web-design/css-grid-basics/assets"
                />
              </div>
            </div>
          </FieldGroup>
        </section>

        <section className="builder-card preview-card" aria-labelledby="canvas-heading">
          <div className="preview-column">
            <div className="section-heading compact">
              <p className="eyebrow">Canvas model</p>
              <h2 id="canvas-heading">Lesson outline</h2>
              <p>Rendered HTML is output. This structured outline is the source of truth.</p>
            </div>
            <ol className="section-list">
              {output.sections.map((section) => (
                <li key={section.sectionId}>
                  <span>{section.sectionType.replace(/_/g, " ")}</span>
                  <strong>{section.title}</strong>
                  <p>{section.purpose}</p>
                  {section.locked ? <em>Locked</em> : null}
                </li>
              ))}
            </ol>
          </div>

          <div className="preview-column">
            <div className="section-heading compact">
              <p className="eyebrow">Validation</p>
              <h2>Render checks</h2>
              <p>Quiet checks that catch obvious Blackboard-fit and accessibility problems.</p>
            </div>
            <ul className="validation-list">
              {output.validation.map((item) => (
                <li key={item.id} className={item.passed ? "pass" : "fail"}>
                  <Check aria-hidden="true" />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="builder-card output-card" aria-labelledby="output-heading">
          <div className="output-header">
            <div className="section-heading compact">
              <p className="eyebrow">Output</p>
              <h2 id="output-heading">Blackboard HTML document</h2>
              <p>Copy the rendered HTML into Blackboard's content editor, or inspect the intake JSON.</p>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => selectOutput("html")}>
                <FileCode2 aria-hidden="true" />
                HTML
              </button>
              <button type="button" className="secondary-button" onClick={() => selectOutput("intake")}>
                <PanelRightOpen aria-hidden="true" />
                Intake JSON
              </button>
              <button type="button" className="secondary-button" onClick={generateWithLlm} disabled={llmStatus === "running"}>
                {llmStatus === "running" ? "Generating..." : "Generate with LLM"}
              </button>
              <button type="button" className="copy-button" onClick={() => copyOutput(activeOutput)}>
                <Clipboard aria-hidden="true" />
                {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy output"}
              </button>
              <button type="button" className="secondary-button" onClick={downloadHtml}>
                <Download aria-hidden="true" />
                Download HTML
              </button>
            </div>
          </div>
          <pre aria-label={activeOutput === "html" ? "Generated Blackboard HTML" : "Generated intake JSON"}>
            {activeOutput === "html" ? output.renderedHtml : output.intakeJson}
          </pre>
          <div className="section-heading compact">
            <p className="eyebrow">LLM result</p>
            <h2>Model-generated lesson draft</h2>
            <p>
              {llmStatus === "idle" && "Click Generate with LLM to submit the prompt to your configured provider."}
              {llmStatus === "running" && `Waiting for model response... ${llmElapsedSeconds}s elapsed.`}
              {llmStatus === "done" && "Latest response from your configured model provider."}
              {llmStatus === "failed" && "Model request failed (including timeout). Review the response below."}
            </p>
          </div>
          {llmStatus === "running" ? (
            <div className="llm-wait-banner" role="status" aria-live="polite">
              <span className="llm-spinner" aria-hidden="true" />
              <strong>Generating with model...</strong>
              <span>{llmElapsedSeconds}s elapsed</span>
            </div>
          ) : null}
          <pre aria-label="LLM generated response">{llmResult || "No model response yet."}</pre>
          <div className="section-heading compact">
            <p className="eyebrow">Diagnostics</p>
            <h2>LLM request trace</h2>
            <p>Use this request trace to debug network, endpoint, and timeout failures quickly.</p>
          </div>
          <pre aria-label="LLM diagnostics JSON">
            {llmDiagnostics ? JSON.stringify(llmDiagnostics, null, 2) : "No diagnostics captured yet."}
          </pre>
        </section>
      </main>
    </div>
  );
}
