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
