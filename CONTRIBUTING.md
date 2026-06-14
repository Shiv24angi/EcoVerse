# 🤝 Contributing to EcoVerse

Thank you for your interest in contributing to EcoVerse! 🌱

We welcome contributors of all experience levels. Whether you're fixing bugs, improving documentation, enhancing the UI, or building new sustainability-focused features, your contributions are valued.

---

# 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Project Overview](#-project-overview)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Contribution Workflow](#-contribution-workflow)
- [Branch Naming Conventions](#-branch-naming-conventions)
- [Commit Message Guidelines](#-commit-message-guidelines)
- [Coding Standards](#-coding-standards)
- [Pull Request Process](#-pull-request-process)
- [Reporting Bugs](#-reporting-bugs)
- [Requesting Features](#-requesting-features)
- [Need Help?](#-need-help)

---

# 🙌 Code of Conduct

Please help us maintain a respectful, welcoming, and collaborative environment.

Be kind, constructive, and professional when interacting with fellow contributors and maintainers.

---

# 🌍 Project Overview

EcoVerse is a sustainability-focused platform that helps users track and improve environmentally conscious habits through analytics, rewards, and educational features.

Contributions are welcome across:

| Area             | Examples                                           |
| ---------------- | -------------------------------------------------- |
| 🐛 Bug Fixes     | Authentication, scanning, dashboard issues         |
| ✨ Features      | Sustainability metrics, rewards, analytics         |
| 🎨 UI/UX         | Accessibility, responsiveness, design improvements |
| 📖 Documentation | README, setup guides, contribution docs            |
| 🧪 Testing       | Unit tests, integration tests                      |

---

# 🏗️ Project Architecture

EcoVerse uses the following technology stack:

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Authentication:** Firebase Authentication
- **Database:** MongoDB + Mongoose
- **Scanning:** @zxing/browser
- **Cloud Functions:** Firebase Functions

---

# 🚀 Getting Started

## 1. Fork the Repository

Click the **Fork** button on GitHub to create your own copy of the repository.

---

## 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/EcoVerse.git

cd EcoVerse
```

Add the original repository as upstream:

```bash
git remote add upstream https://github.com/Shiv24angi/EcoVerse.git
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure the required variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

MONGODB_URI=your_mongodb_connection_string
```

---

## 5. Run the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🔄 Contribution Workflow

## Step 1 - Find or Create an Issue

- Browse existing issues.
- Comment on the issue you'd like to work on.
- Wait for assignment (if required by maintainers).

If your idea is new, create an issue for discussion before implementing it.

---

## Step 2 - Create a Branch

Create a dedicated branch for your changes:

```bash
git checkout -b feat/your-feature-name
```

or

```bash
git checkout -b fix/your-bug-fix
```

---

## Step 3 - Make Your Changes

Guidelines:

- Follow existing code patterns.
- Keep changes focused and scoped.
- Test locally before submitting.

---

## Step 4 - Commit and Push

```bash
git add .

git commit -m "feat: add sustainability badges"

git push origin feat/your-feature-name
```

---

## Step 5 - Open a Pull Request

- Open a PR against the main repository.
- Provide a clear description of your changes.
- Link the related issue.

Example:

```text
Closes #12
```

- Include screenshots for UI changes when applicable.

---

# 🌿 Branch Naming Conventions

Use descriptive branch names:

| Type          | Example                          |
| ------------- | -------------------------------- |
| Feature       | `feat/add-dashboard-metrics`     |
| Bug Fix       | `fix/login-redirect`             |
| Documentation | `docs/update-contributing-guide` |
| Maintenance   | `chore/dependency-updates`       |

---

# 📝 Commit Message Guidelines

We follow Conventional Commits.

| Prefix    | Purpose                 |
| --------- | ----------------------- |
| feat:     | New feature             |
| fix:      | Bug fix                 |
| docs:     | Documentation changes   |
| style:    | Styling/UI updates      |
| refactor: | Code improvements       |
| test:     | Testing-related changes |
| chore:    | Maintenance tasks       |

Examples:

```text
feat: add sustainability rewards system

fix: resolve login redirect issue

docs: update setup instructions
```

---

# 🎨 Coding Standards

## TypeScript

- Use proper interfaces and types.
- Avoid using `any` whenever possible.

## Components

- Keep components modular and reusable.
- Follow the existing project structure.

## Styling

- Use Tailwind CSS utility classes.
- Avoid inline styles unless necessary.

## Code Quality

Before submitting:

- Remove unused imports.
- Remove debugging statements.
- Ensure no linting or build errors exist.
- Add comments where the code is not self-explanatory.

---

# 🔀 Pull Request Process

Before submitting a PR:

- Ensure the application runs locally.
- Keep PRs focused on a single feature or fix.
- Write a clear title and description.
- Link the issue being resolved.
- Address review feedback promptly.

---

# 🐛 Reporting Bugs

When opening a bug report, include:

- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

---

# ✨ Requesting Features

When suggesting a feature, include:

- Feature description
- Motivation and use case
- Potential implementation ideas (optional)

---

# 💬 Need Help?

If you get stuck:

- Open a GitHub Discussion
- Ask in the community Discord
- Reach out through GitHub Issues

We are happy to help contributors learn and grow.

---

# 🌱 Happy Contributing!

Thank you for helping improve EcoVerse and supporting sustainable technology initiatives. 🚀
