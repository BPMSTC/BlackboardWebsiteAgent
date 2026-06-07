import { Check, Clipboard, Download, FileCode2, PanelRightOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { defaultFormState, disciplines, interactionTypes, studentLevels } from "../data/builderOptions";
import type { BuilderFormState } from "../types/builder";
import { logDebug, logInfo, logWarn } from "../utils/devLogger";
import { buildBuilderOutput } from "../utils/builderOutput";

type CopyTarget = "html" | "intake";

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
  const [activeOutput, setActiveOutput] = useState<"html" | "intake">("html");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const output = useMemo(() => buildBuilderOutput(form), [form]);

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
          <p className="hero-copy">
            Build structured instructional HTML pages faculty can copy into Blackboard.
            Start with a topic, tune the teaching requirements, then preview the page
            outline, validation checks, and full HTML output.
          </p>
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
        </section>
      </main>
    </div>
  );
}
