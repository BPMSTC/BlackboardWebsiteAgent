import type { BuilderFormState } from "../types/builder";

export const disciplines = [
  "Programming",
  "Networking",
  "Nursing",
  "Business",
  "Communications",
  "Mathematics",
  "Science",
  "History",
  "Other",
];

export const studentLevels = [
  "Freshman / sophomore college",
  "First-year college",
  "Second-year college",
  "Introductory adult learner",
  "Custom",
];

export const interactionTypes = [
  { id: "step_through", label: "Step-through" },
  { id: "toggle_comparison", label: "Toggle comparison" },
  { id: "interactive_diagram", label: "Interactive diagram" },
  { id: "slider_demo", label: "Slider/demo" },
  { id: "code_demo", label: "Code demo" },
  { id: "reveal_explanation", label: "Reveal explanation" },
];

export const defaultFormState: BuilderFormState = {
  lessonRequest: {
    topic: "",
    discipline: "Programming",
    courseName: "",
    studentLevel: "Freshman / sophomore college",
  },
  contentRequirements: {
    requiredConcepts: "",
    requiredExactWording: "",
    optionalConcepts: "",
    doNotInclude: "",
    priorKnowledge: "",
    commonStudentStruggles: "",
    instructorNotes: "",
  },
  scope: {
    pageCountPreference: "agent_recommends",
    customPageCount: "",
    contentLength: "standard",
    largeTopicWorkflow: "outline_first",
  },
  sources: {
    researchMode: "web_research",
    pastedSourceText: "",
    preferredSources: "",
    sourcesToAvoid: "",
    includeForMoreInformation: true,
  },
  style: {
    template: "clean_academic",
    frameworkPreference: "plain_css",
    tone: "friendly",
    colorPreference: "Default high contrast",
  },
  media: {
    imageInstructions: "",
    generateImages: "agent_decides",
    findWebImages: "agent_decides",
    youtubeUrl: "",
    youtubePlacement: "agent_decides",
  },
  interactivity: {
    preference: "agent_decides",
    allowedTypes: ["step_through", "toggle_comparison", "interactive_diagram", "reveal_explanation"],
    notes: "",
  },
  githubAssets: {
    repo: "",
    branch: "main",
    baseFolder: "",
    courseFolder: "",
    lessonFolderSlug: "",
    overwriteExistingAssets: false,
    assetUrlBase: "",
  },
  output: {
    includeMetadataComments: true,
    includeForMoreInformation: true,
    alsoGenerateDownloadableHtml: false,
  },
};
