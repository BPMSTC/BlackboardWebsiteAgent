import type { BuilderFormState, BuilderOutput, LessonSection, ValidationItem } from "../types/builder";

function listFromText(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function titleOrFallback(topic: string) {
  return topic.trim() || "Untitled Blackboard Lesson";
}

function recommendPageCount(form: BuilderFormState) {
  const conceptCount = listFromText(form.contentRequirements.requiredConcepts).length;
  const topicWords = form.lessonRequest.topic.trim().split(/\s+/).filter(Boolean).length;

  if (form.scope.pageCountPreference === "force_one_page") {
    return 1;
  }

  if (form.scope.pageCountPreference === "custom") {
    const parsed = Number.parseInt(form.scope.customPageCount, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  if (conceptCount >= 7 || topicWords >= 9) {
    return 3;
  }

  if (conceptCount >= 4 || form.scope.contentLength === "detailed") {
    return 2;
  }

  return 1;
}

function buildSections(form: BuilderFormState, pageCount: number): LessonSection[] {
  const topic = titleOrFallback(form.lessonRequest.topic);
  const baseSections: LessonSection[] = [
    {
      sectionId: "section_intro",
      sectionType: "introduction",
      title: `Why ${topic} matters`,
      purpose: "Frame the lesson and connect it to the course.",
      locked: false,
    },
    {
      sectionId: "section_concepts",
      sectionType: "concept_explanation",
      title: "Core concepts",
      purpose: "Explain the required concepts in student-friendly language.",
      locked: false,
    },
    {
      sectionId: "section_example",
      sectionType: form.lessonRequest.discipline === "Programming" ? "code_walkthrough" : "worked_example",
      title: "Worked example",
      purpose: "Show the concept in a concrete course-relevant situation.",
      locked: false,
    },
    {
      sectionId: "section_visual",
      sectionType: "visual_explanation",
      title: "Visual explanation",
      purpose: "Provide a diagram or structured visual that supports understanding.",
      locked: false,
    },
    {
      sectionId: "section_more_info",
      sectionType: "more_information",
      title: "For More Information",
      purpose: "List reputable sources and follow-up reading.",
      locked: true,
    },
  ];

  if (form.style.template === "interactive_tutorial" || form.interactivity.preference === "requested") {
    baseSections.splice(3, 0, {
      sectionId: "section_interactive",
      sectionType: "interactive_demo",
      title: "Interactive exploration",
      purpose: "Let students explore the idea without turning it into a quiz.",
      locked: false,
    });
  }

  if (pageCount > 1) {
    baseSections.unshift({
      sectionId: "section_series_overview",
      sectionType: "summary",
      title: "Series overview",
      purpose: "Show the page sequence before generating the full series.",
      locked: false,
    });
  }

  return baseSections;
}

function buildIntakeObject(form: BuilderFormState, pageCount: number) {
  return {
    lessonRequest: {
      ...form.lessonRequest,
      topic: form.lessonRequest.topic.trim(),
      courseName: form.lessonRequest.courseName.trim(),
    },
    contentRequirements: {
      requiredConcepts: listFromText(form.contentRequirements.requiredConcepts),
      requiredExactWording: form.contentRequirements.requiredExactWording.trim(),
      optionalConcepts: listFromText(form.contentRequirements.optionalConcepts),
      doNotInclude: listFromText(form.contentRequirements.doNotInclude),
      priorKnowledge: form.contentRequirements.priorKnowledge.trim(),
      commonStudentStruggles: form.contentRequirements.commonStudentStruggles.trim(),
      instructorNotes: form.contentRequirements.instructorNotes.trim(),
    },
    scope: {
      ...form.scope,
      approvedPageCount: pageCount,
    },
    sources: {
      ...form.sources,
      preferredSources: listFromText(form.sources.preferredSources),
      sourcesToAvoid: listFromText(form.sources.sourcesToAvoid),
    },
    style: form.style,
    media: form.media,
    interactivity: form.interactivity,
    githubAssets: form.githubAssets,
    output: {
      format: "full_html_document",
      target: "blackboard_content_editor",
      ...form.output,
    },
  };
}

function renderFrameworkHint(form: BuilderFormState) {
  if (form.style.frameworkPreference === "bootstrap") {
    return '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">';
  }

  if (form.style.frameworkPreference === "tailwind") {
    return '<script src="https://cdn.tailwindcss.com"></script>';
  }

  return "";
}

function renderHtml(form: BuilderFormState, sections: LessonSection[], pageCount: number) {
  const topic = titleOrFallback(form.lessonRequest.topic);
  const lessonSlug = form.githubAssets.lessonFolderSlug.trim() || slugify(topic) || "lesson";
  const concepts = listFromText(form.contentRequirements.requiredConcepts);
  const framework = renderFrameworkHint(form);
  const metadata = form.output.includeMetadataComments
    ? `  <!--
    Lesson: ${escapeHtml(topic)}
    Course: ${escapeHtml(form.lessonRequest.courseName || "Not specified")}
    Discipline: ${escapeHtml(form.lessonRequest.discipline)}
    Student Level: ${escapeHtml(form.lessonRequest.studentLevel)}
    Style: ${escapeHtml(form.style.template)}
    Target: Blackboard content editor
    Page count: ${pageCount}
  -->`
    : "";

  const conceptItems = concepts.length
    ? concepts.map((concept) => `        <li>${escapeHtml(concept)}</li>`).join("\n")
    : "        <li>Define required concepts during generation.</li>";

  const sectionComments = sections
    .map((section) => `      <!-- ${section.sectionId}: ${escapeHtml(section.purpose)} -->`)
    .join("\n");

  const moreInfo = form.output.includeForMoreInformation
    ? `
      <section class="more-info" aria-labelledby="more-info-heading">
        <h2 id="more-info-heading">For More Information</h2>
        <ul>
          <li><a href="https://developer.mozilla.org/" target="_blank" rel="noopener">MDN Web Docs</a> - strong reference material for web topics.</li>
          <li><a href="https://openstax.org/" target="_blank" rel="noopener">OpenStax</a> - open educational resources for college-level courses.</li>
          <li><a href="https://www.loc.gov/" target="_blank" rel="noopener">Library of Congress</a> - reputable historical and primary-source material.</li>
        </ul>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
${metadata}
  <title>${escapeHtml(topic)}</title>
  ${framework}
  <style>
    .mstc-textbook-page { font-family: system-ui, sans-serif; line-height: 1.6; color: #172033; max-width: 960px; margin: 0 auto; padding: 2rem; }
    .skip-link:focus { position: static; width: auto; height: auto; padding: .5rem; background: #fff3bf; }
    .hero { border-bottom: 4px solid #245c73; margin-bottom: 2rem; }
    .callout { border-left: 5px solid #b54d28; background: #fff7ed; padding: 1rem; }
    .visual-box { border: 1px solid #cbd5e1; padding: 1rem; border-radius: .5rem; background: #f8fafc; }
    a { color: #0f5c7a; }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <main id="main-content" class="mstc-textbook-page mstc-${lessonSlug}">
    <header class="hero">
      <h1>${escapeHtml(topic)}</h1>
      <p>${escapeHtml(form.lessonRequest.courseName || form.lessonRequest.discipline)} lesson for ${escapeHtml(form.lessonRequest.studentLevel)} students.</p>
    </header>
${sectionComments}
    <section aria-labelledby="concepts-heading">
      <h2 id="concepts-heading">Core Concepts</h2>
      <ul>
${conceptItems}
      </ul>
    </section>
    <aside class="callout" aria-label="Instructor note">
      <h2>Watch out</h2>
      <p>${escapeHtml(form.contentRequirements.commonStudentStruggles || "Call out the misconception students are most likely to bring into this topic.")}</p>
    </aside>
    <section class="visual-box" aria-labelledby="visual-heading">
      <h2 id="visual-heading">Visual Explanation</h2>
      <svg role="img" viewBox="0 0 640 180" aria-labelledby="svg-title svg-desc">
        <title id="svg-title">${escapeHtml(topic)} learning flow</title>
        <desc id="svg-desc">A simple flow diagram showing a topic moving from prior knowledge to core concepts to application.</desc>
        <rect x="20" y="50" width="160" height="80" rx="10" fill="#dbeafe"></rect>
        <rect x="240" y="50" width="160" height="80" rx="10" fill="#dcfce7"></rect>
        <rect x="460" y="50" width="160" height="80" rx="10" fill="#ffedd5"></rect>
        <text x="100" y="96" text-anchor="middle">Prior Knowledge</text>
        <text x="320" y="96" text-anchor="middle">Core Concepts</text>
        <text x="540" y="96" text-anchor="middle">Application</text>
        <path d="M185 90 H235 M405 90 H455" stroke="#334155" stroke-width="4"></path>
      </svg>
    </section>
    <section aria-label="Did you know?">
      <h2>Did You Know?</h2>
      <p>A strong Blackboard page is not a pasted lecture. It is a structured learning object students can scan, explore, and revisit.</p>
    </section>${moreInfo}
  </main>
  <script>
    // Keep page-specific JavaScript scoped to this lesson.
    console.log("Loaded Blackboard lesson: ${escapeHtml(topic)}");
  </script>
</body>
</html>`;
}

function validateOutput(form: BuilderFormState, renderedHtml: string): ValidationItem[] {
  const topicPresent = form.lessonRequest.topic.trim().length > 0;
  const disciplinePresent = form.lessonRequest.discipline.trim().length > 0;
  const hasSources = renderedHtml.includes("For More Information");
  const hasAltOrSvgText = renderedHtml.includes("<desc id=\"svg-desc\">");
  const noAssessments = !/quiz|knowledge check|self-check|test question/i.test(renderedHtml);
  const hasMetadata = !form.output.includeMetadataComments || renderedHtml.includes("Target: Blackboard content editor");

  return [
    {
      id: "required-basics",
      label: "Required intake basics",
      passed: topicPresent && disciplinePresent,
      detail: topicPresent ? "Topic and discipline are present." : "Lesson topic is still required.",
    },
    {
      id: "full-html",
      label: "Full HTML document",
      passed: renderedHtml.startsWith("<!DOCTYPE html>") && renderedHtml.includes("<html lang=\"en\">"),
      detail: "Renderer outputs a complete copy/paste document.",
    },
    {
      id: "sources",
      label: "For More Information section",
      passed: hasSources,
      detail: hasSources ? "Source section is included." : "Source section is disabled.",
    },
    {
      id: "visual-accessibility",
      label: "Visual accessibility",
      passed: hasAltOrSvgText,
      detail: "Inline SVG includes a screen-reader description.",
    },
    {
      id: "no-assessments",
      label: "No assessment content",
      passed: noAssessments,
      detail: noAssessments ? "No quiz/test wording detected." : "Assessment wording detected.",
    },
    {
      id: "metadata",
      label: "Maintenance metadata",
      passed: hasMetadata,
      detail: hasMetadata ? "Metadata comments match Blackboard maintenance needs." : "Metadata comments are disabled.",
    },
  ];
}

export function buildBuilderOutput(form: BuilderFormState): BuilderOutput {
  const pageCount = recommendPageCount(form);
  const sections = buildSections(form, pageCount);
  const renderedHtml = renderHtml(form, sections, pageCount);
  const intakeObject = buildIntakeObject(form, pageCount);

  return {
    intakeJson: JSON.stringify(intakeObject, null, 2),
    renderedHtml,
    recommendedScope:
      pageCount === 1
        ? "Single Blackboard page recommended."
        : `${pageCount}-page series recommended; outline approval should happen before generation.`,
    pageCount,
    sections,
    validation: validateOutput(form, renderedHtml),
  };
}
