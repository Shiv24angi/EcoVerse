# EcoVerse Architecture Guide

## Overview

This document provides a high-level overview of the EcoVerse codebase to help contributors quickly understand the project structure and navigate the repository efficiently.

---

## Frontend Directory

### `/app`

The `app` directory contains the main application routing, pages, layouts, and views.

Responsibilities include:

- Application routing
- Page rendering
- Layout management
- Navigation flow
- Feature-specific pages

This directory serves as the primary entry point for the Next.js application.

### `/components`

The `components` directory contains reusable UI components used throughout the application.

Examples include:

- Navigation bars
- Buttons and form controls
- Custom input fields
- Scanner interface components
- Shared UI elements

Using reusable components helps maintain consistency and reduces code duplication.

---

## Backend & Database Layer

### `/models`

The `models` directory contains MongoDB schema and model definitions used by the application.

Examples include:

- `User.ts`
- Future product-related models

These models define how data is structured and stored within MongoDB.

### `/lib`

The `lib` directory stores shared utilities, helper functions, and configuration files used throughout the project.

Examples include:

- MongoDB connection helpers
- Firebase configuration
- Carbon footprint calculations
- Packaging analysis utilities
- Reward system logic
- General helper functions

Keeping shared logic in one place improves maintainability and reusability.

---

## Sync & Build Outputs

### `/firebase-functions-sync-ts`

This directory is used for Firebase synchronization workflows and related build outputs.

**Important Notes**

- May contain compiled JavaScript (`.js`) files
- May contain source map (`.js.map`) files
- Generated during build or synchronization processes

⚠️ **Do NOT edit compiled output files directly.**

Always modify the original source files whenever changes are required.

### `/linkFBtoMDB`

This directory contains scripts used to synchronize Firebase and MongoDB data.

Examples include:

- User synchronization scripts
- Firestore migration utilities
- Database synchronization helpers

**Important Notes**

- Some files may be generated or compiled outputs
- Do not directly edit compiled `.js` or `.js.map` files
- Update the original source files whenever applicable

⚠️ **Do NOT edit compiled output files directly.**

---

## Tech Stack Reference

EcoVerse is built using:

- **Next.js** – Application framework and routing
- **TypeScript** – Type-safe development
- **Tailwind CSS** – Utility-first styling framework
- **MongoDB** – Database layer
- **Firebase Auth** – User authentication and identity management

---

## How to Contribute (Step by Step Guide)

### Standard Git Workflow

1. Fork this repository to your GitHub profile.

2. Clone your forked repository to your local system.

3. Create a new feature branch:

   ```bash
   git checkout -b docs/architecture-guide
   ```

4. Add the required documentation file.

5. Commit your work with a meaningful commit message:

   ```bash
   git commit -m "docs: add central codebase architecture guide"
   ```

6. Push your branch to your fork.

7. Open a Pull Request (PR) against the main repository.

### GitHub Browser Workflow (No Git/Terminal Needed)

1. Fork this repository to your GitHub profile.
2. Open your fork on GitHub.
3. Click **Add file** → **Create new file**.
4. Name the file `ARCHITECTURE.md`.
5. Paste your documentation into the editor.
6. Commit the changes.
7. Create a new branch and open a Pull Request.

---

## Notes for Contributors

- Follow the existing project structure when adding new features.
- Reuse components and utilities whenever possible.
- Write documentation in clear, beginner-friendly language.
- Prefer using backticks when referencing folder paths and file names.
- Do not modify, delete, or refactor existing code unless the issue specifically requires it.
- Do not edit generated build outputs directly.
- Keep documentation updated when introducing major architectural changes.

---

This guide serves as a starting point for contributors and should be updated as the project evolves.
