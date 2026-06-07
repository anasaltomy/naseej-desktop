# Copilot Instructions for Naseej POS Desktop

## Project Summary

**Naseej POS** is a standalone, offline-first desktop point-of-sale system for retail stores, built with Electron, React (TypeScript), SQLite, and Tailwind CSS. The architecture separates the Electron main process (Node.js, hardware, SQLite) from the renderer (React UI), communicating via a secure IPC bridge. The system is optimized for reliability, speed, and local data integrity, supporting barcode scanners, receipt printers, and cash drawers.

---

## Available Skills

| Skill                       | Trigger Conditions                                                                                      | File                                                        |
|-----------------------------|--------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| Electron                    | Any task involving Electron, desktop app features, IPC, packaging, or main/renderer process separation | .agents/skills/electron/SKILL.md                            |
| SQLite Database Expert      | Any database operation, SQL, migrations, FTS, or secure data handling                                  | .agents/skills/sqlite-database-expert/SKILL.md              |
| UI/UX Pro Max               | Any UI/UX, design, layout, accessibility, or user experience task                                      | .agents/skills/ui-ux-pro-max/SKILL.md                       |
| Vercel React Best Practices | Any React/Next.js code, performance, data fetching, or bundle optimization                             | .agents/skills/vercel-react-best-practices/SKILL.md         |

---

## Before You Code

> **Before writing code for any file-type task (docx, pdf, pptx, xlsx, frontend), you MUST read the corresponding SKILL.md first.**

---

## Project Conventions

- **TypeScript strict mode**: No `any` types; interfaces for all data models.
- **File naming**: `kebab-case` for components, `snake_case` for utilities.
- **Directory structure**: Organize by feature (e.g., `features/checkout/`).
- **React**: Functional components only; hooks for state/effects.
- **Styling**: Tailwind CSS utility classes; minimal custom CSS.
- **IPC**: Use constants from `src/shared/constants.ts` for channel names.
- **Database**: Always use parameterized queries; never concatenate user input.
- **Commits**: Conventional Commits format (`feat:`, `fix:`, etc.).
- **Hardware**: All device access via IPC bridge, never directly from renderer.
- **Accessibility**: Follow WCAG and platform guidelines for all UI.
- **Testing**: TDD-first for database; use in-memory SQLite for tests.

---

## Task Routing

| Task Type / Trigger Phrase                  | Skill to Use                | Example Trigger Phrases                                  |
|---------------------------------------------|-----------------------------|---------------------------------------------------------|
| Desktop app, Electron, IPC, packaging       | Electron                    | "Add tray icon", "IPC handler", "package for Windows"   |
| Database, SQL, migrations, FTS, security    | SQLite Database Expert      | "Add table", "secure query", "full-text search"         |
| UI/UX, design, layout, accessibility        | UI/UX Pro Max               | "Redesign login", "improve accessibility", "dark mode"  |
| React/Next.js, performance, data fetching   | Vercel React Best Practices | "Optimize React", "fix bundle size", "improve SSR"      |
| File generation (docx, pdf, pptx, xlsx)     | (corresponding skill)       | "Generate PDF", "Export to Excel", "Create PowerPoint"  |

---

## When in Doubt

> If a task involves generating or reading a file, **check the skills list before proceeding**.

---

**End of file.**
