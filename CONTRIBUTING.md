# Contributing to EcoVerse

Thank you for your interest in contributing to EcoVerse. We welcome contributions from developers of all experience levels. Whether you are fixing bugs, improving documentation, enhancing the user experience, or building new features, your contributions help make the project better for everyone.

## Before You Start

* Check the existing issues before creating a new one.
* Comment on the issue you would like to work on and wait for assignment.
* Create a new issue if the problem or feature has not already been reported.
* Be respectful and follow the project's Code of Conduct.

---

## Development Setup

### 1. Fork the Repository

Fork the repository to your GitHub account.

### 2. Clone Your Fork

Clone your forked repository to your local machine:

```bash
git clone https://github.com/YOUR_USERNAME/EcoVerse.git

cd EcoVerse
```

Add the original repository as an upstream remote:

```bash
git remote add upstream https://github.com/Shiv24angi/EcoVerse.git
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file and add the required environment variables.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

MONGODB_URI=
```

### 5. Start the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Branch Naming Convention

Use descriptive branch names:

```text
feat/add-carbon-analytics
fix/login-redirect
docs/update-readme
chore/update-dependencies
```

---

## Commit Message Convention

This project follows Conventional Commits.

Examples:

```text
feat: add barcode scanning support

fix: resolve leaderboard ranking issue

docs: improve installation guide

refactor: simplify rewards calculation
```

---

## Pull Request Guidelines

Before submitting a pull request:

* Ensure the project builds successfully.
* Test your changes locally.
* Keep pull requests focused on a single feature or fix.
* Update documentation when necessary.
* Remove unused code and debugging statements.

When opening a pull request:

* Provide a clear title and description.
* Link the related issue.

Example:

```text
Closes #123
```

* Include screenshots for UI changes whenever applicable.

---

## Coding Standards

* Use TypeScript whenever possible.
* Follow the existing project structure and coding style.
* Write reusable and maintainable code.
* Use meaningful names for variables, functions, and components.
* Avoid unnecessary comments and dead code.

---

## Reporting Bugs

When reporting a bug, please include:

* Steps to reproduce
* Expected behavior
* Actual behavior
* Screenshots or recordings, if applicable

---

## Suggesting Features

When proposing a feature, describe:

* The problem it solves
* The proposed solution
* Any implementation ideas or references

---

## Contributors

We appreciate every contribution to EcoVerse.

<a href="https://github.com/Shiv24angi/EcoVerse/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Shiv24angi/EcoVerse" alt="Contributors" />
</a>

Thank you for helping build a more sustainable future with EcoVerse.
