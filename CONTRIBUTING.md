# Contributing to mideplanos

Thank you for your interest in contributing! mideplanos is a free, browser-based tool for measuring distances and areas in construction plans, images, and PDFs. All processing happens client-side — no data is sent to any server.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [How to Contribute](#how-to-contribute)
- [Code Style](#code-style)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Local Setup

```bash
git clone https://github.com/your-org/mideplanos.git
cd mideplanos
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mideplanos/
├── app/                  # Next.js App Router pages and layouts
│   ├── herramienta/      # Main measurement tool page
│   ├── layout.tsx
│   └── page.tsx          # Landing page
├── components/           # Reusable React components
│   ├── MeasurementCanvas.tsx
│   ├── Toolbar.tsx
│   ├── FileUpload.tsx
│   └── ...
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## Development Workflow

1. **Fork** the repository and create your branch from `main`.
2. **Install dependencies** with `npm install`.
3. **Start the dev server** with `npm run dev`.
4. **Make your changes**, keeping commits small and focused.
5. **Run linting** before pushing: `npm run lint`.
6. **Open a pull request** with a clear description of your changes.

## How to Contribute

### Good First Issues

Look for issues labeled `good first issue` — these are well-scoped tasks that don't require deep knowledge of the codebase.

### Areas Where Help Is Welcome

- **Accessibility**: improving keyboard navigation and screen reader support
- **Performance**: optimizing canvas rendering for large images or PDFs
- **PDF support**: edge cases with multi-page or complex PDFs
- **Localization**: translations for languages other than Spanish and English
- **Tests**: adding unit or integration tests
- **Documentation**: improving inline comments or the README

### Privacy Constraint

This project is intentionally client-side only. **Do not introduce any feature that sends user files or measurement data to an external server.** This is a core design principle.

## Code Style

- **TypeScript**: all new code must be typed. Avoid `any`.
- **Tailwind CSS 4**: use utility classes. Avoid inline styles unless strictly necessary.
- **Components**: keep components focused and single-purpose. Extract logic into hooks when it grows complex.
- **Naming**: use clear, descriptive names. Prefer full words over abbreviations.
- **Comments**: only add comments for non-obvious logic. Don't narrate what the code does.

Linting is enforced via ESLint. Run `npm run lint` to check your code before submitting.

## Submitting a Pull Request

1. Open your PR against the `main` branch.
2. Fill in the PR description: what changed, why, and how to test it.
3. Link to any related issue (e.g. `Closes #42`).
4. Keep the diff focused — one concern per PR.
5. Be responsive to review feedback.

## Reporting Bugs

Open an issue and include:

- A clear description of the problem.
- Steps to reproduce it.
- The file type and browser you were using (file contents are never needed — a description of the file is enough).
- Screenshots or a screen recording if relevant.

## Feature Requests

Open an issue describing:

- The problem you're trying to solve.
- Your proposed solution.
- Any alternatives you considered.

---

All contributions are welcome. Thanks for helping make mideplanos better!
