export type ResearchMode = "web_research" | "provided_material_only" | "web_plus_provided_material";
export type PageCountPreference = "agent_recommends" | "force_one_page" | "custom";
export type StyleTemplate = "clean_academic" | "visual_guide" | "interactive_tutorial";
export type FrameworkPreference = "agent_decides" | "plain_css" | "bootstrap" | "tailwind";
export type InteractivityPreference = "none" | "agent_decides" | "requested";
export type AssetDecision = "no" | "yes" | "agent_decides";

export type LessonRequest = {
  topic: string;
  discipline: string;
  courseName: string;
  studentLevel: string;
};

export type BuilderFormState = {
  lessonRequest: LessonRequest;
  contentRequirements: {
    requiredConcepts: string;
    requiredExactWording: string;
    optionalConcepts: string;
    doNotInclude: string;
    priorKnowledge: string;
    commonStudentStruggles: string;
    instructorNotes: string;
  };
  scope: {
    pageCountPreference: PageCountPreference;
    customPageCount: string;
    contentLength: "brief" | "standard" | "detailed";
    largeTopicWorkflow: "outline_first" | "generate_directly";
  };
  sources: {
    researchMode: ResearchMode;
    pastedSourceText: string;
    preferredSources: string;
    sourcesToAvoid: string;
    includeForMoreInformation: boolean;
  };
  style: {
    template: StyleTemplate;
    frameworkPreference: FrameworkPreference;
    tone: "professional" | "friendly" | "conversational" | "formal";
    colorPreference: string;
  };
  media: {
    imageInstructions: string;
    generateImages: AssetDecision;
    findWebImages: AssetDecision;
    youtubeUrl: string;
    youtubePlacement: "agent_decides" | "beginning" | "middle" | "end" | "specific_section";
  };
  interactivity: {
    preference: InteractivityPreference;
    allowedTypes: string[];
    notes: string;
  };
  githubAssets: {
    repo: string;
    branch: string;
    baseFolder: string;
    courseFolder: string;
    lessonFolderSlug: string;
    overwriteExistingAssets: boolean;
    assetUrlBase: string;
  };
  output: {
    includeMetadataComments: boolean;
    includeForMoreInformation: boolean;
    alsoGenerateDownloadableHtml: boolean;
  };
};

export type LessonSection = {
  sectionId: string;
  sectionType: string;
  title: string;
  purpose: string;
  locked: boolean;
};

export type ValidationItem = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type BuilderOutput = {
  intakeJson: string;
  renderedHtml: string;
  recommendedScope: string;
  pageCount: number;
  sections: LessonSection[];
  validation: ValidationItem[];
};
