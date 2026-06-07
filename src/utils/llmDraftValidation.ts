type IntakeContract = {
  generationPrompt?: string;
  lessonRequest?: {
    topic?: string;
  };
  contentRequirements?: {
    requiredConcepts?: string[];
    requiredExactWording?: string;
    doNotInclude?: string[];
  };
  sources?: {
    includeForMoreInformation?: boolean;
  };
  interactivity?: {
    preference?: "none" | "agent_decides" | "requested";
  };
  output?: {
    includeForMoreInformation?: boolean;
  };
};

export type LlmDraftValidationResult = {
  isValid: boolean;
  violations: string[];
  correctivePrompt: string;
  retryStrategy: "replace_full" | "append_missing_sections";
  missingSections: string[];
};

function parseIntakeContract(intakeJson: string): IntakeContract | null {
  try {
    return JSON.parse(intakeJson) as IntakeContract;
  } catch {
    return null;
  }
}

function includesText(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function buildCorrectivePrompt(
  intake: IntakeContract | null,
  originalDraft: string,
  violations: string[],
  retryStrategy: "replace_full" | "append_missing_sections",
  missingSections: string[],
): string {
  const originalPrompt = intake?.generationPrompt?.trim() || "No original prompt captured.";
  const violationLines = violations.length
    ? violations.map((line) => `- ${line}`).join("\n")
    : "- No violations listed.";

  if (retryStrategy === "append_missing_sections") {
    const sectionLines = missingSections.length
      ? missingSections.map((section) => `- ${section}`).join("\n")
      : "- Missing required section";

    return [
      "Provide ONLY the missing section content listed below.",
      "Do NOT rewrite or repeat existing sections.",
      "Keep output concise and directly usable as an append-only patch.",
      "",
      "Original generation prompt:",
      originalPrompt,
      "",
      "Missing sections to append:",
      sectionLines,
      "",
      "Detected violations:",
      violationLines,
      "",
      "Existing draft (context only, do not repeat):",
      originalDraft,
    ].join("\n");
  }

  return [
    "Revise the draft so it fully satisfies all requirements.",
    "Keep the same topic and audience, but fix every violation listed below.",
    "Output only the revised lesson draft content.",
    "",
    "Original generation prompt:",
    originalPrompt,
    "",
    "Detected violations:",
    violationLines,
    "",
    "Original draft to revise:",
    originalDraft,
  ].join("\n");
}

export function validateLlmDraftAgainstIntake(
  intakeJson: string,
  draftContent: string,
): LlmDraftValidationResult {
  const intake = parseIntakeContract(intakeJson);
  const draft = draftContent.trim();
  const draftLower = draft.toLowerCase();
  const violations: string[] = [];
  const missingSections: string[] = [];

  if (!draft) {
    violations.push("Draft content is empty.");
  }

  const requiredConcepts = intake?.contentRequirements?.requiredConcepts ?? [];
  for (const concept of requiredConcepts) {
    if (concept.trim() && !includesText(draft, concept)) {
      violations.push(`Missing required concept: ${concept}`);
    }
  }

  const exactWording = intake?.contentRequirements?.requiredExactWording?.trim();
  if (exactWording && !includesText(draft, exactWording)) {
    violations.push(`Missing required exact wording: ${exactWording}`);
  }

  const forbiddenItems = intake?.contentRequirements?.doNotInclude ?? [];
  for (const forbidden of forbiddenItems) {
    if (forbidden.trim() && includesText(draft, forbidden)) {
      violations.push(`Contains forbidden content: ${forbidden}`);
    }
  }

  if (/quiz|knowledge check|self-check|assessment prompt|test question/i.test(draft)) {
    violations.push("Contains assessment-like language that should be excluded.");
  }

  const includeForMoreInfo =
    intake?.output?.includeForMoreInformation ?? intake?.sources?.includeForMoreInformation ?? true;

  if (!includeForMoreInfo && includesText(draftLower, "for more information")) {
    violations.push("Includes 'For More Information' section even though it is disabled.");
  }

  if (includeForMoreInfo && !includesText(draftLower, "for more information")) {
    violations.push("Missing 'For More Information' section when it is required.");
    missingSections.push("For More Information");
  }

  if (intake?.interactivity?.preference === "none") {
    if (/interactive|try this|click|slider|toggle/i.test(draft)) {
      violations.push("Includes interactive activity language even though interactivity is disabled.");
    }
  }

  const topic = intake?.lessonRequest?.topic?.trim();
  if (topic && !includesText(draft, topic)) {
    violations.push(`Draft does not clearly reference the requested topic: ${topic}`);
  }

  const retryStrategy: "replace_full" | "append_missing_sections" =
    missingSections.length > 0 && violations.length === missingSections.length
      ? "append_missing_sections"
      : "replace_full";

  return {
    isValid: violations.length === 0,
    violations,
    correctivePrompt: buildCorrectivePrompt(
      intake,
      draftContent,
      violations,
      retryStrategy,
      missingSections,
    ),
    retryStrategy,
    missingSections,
  };
}
