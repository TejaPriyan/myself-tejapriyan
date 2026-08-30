# Contributing to Glass-Tech Sanctuary

First off, thanks for taking the time to contribute! 🎉

The project is a single-person passion project, so a little structure goes a long way. Please follow the guidelines below.

## Code of Conduct

By participating, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Report unacceptable behavior to the maintainer via GitHub.

## How Can I Contribute?

### 🐛 Reporting Bugs

1. **Search first** — check [open issues](https://github.com/TejaPriyan/myself-tejapriyan/issues) to make sure the bug hasn't already been reported.
2. Open a new issue and include:
   - A clear, descriptive title.
   - Steps to reproduce (what you did, what happened, what you expected).
   - Environment details: OS, Node.js version, browser.
   - Any relevant console/server errors.

### 💡 Suggesting Features

Open an issue with:

- A clear description of the feature and the problem it solves.
- Rough sketches, wireframes, or mockups are always welcome.
- Explain how it fits the sanctuary's zones (Medical / Engineer / Games / Ami AI / Board).

### 🔧 Pull Requests

1. Fork the repo and create your branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes. Keep them focused — one logical change per PR.
3. Test your changes:

   ```bash
   npm install
   npm start
   # open http://localhost:3000
   ```

   - Ensure the server starts with **no** API keys configured (local fallback works).
   - Ensure the page loads without console errors.
4. Update the README if you change public behavior, environment variables, or endpoints.
5. Commit with a clear message:

   ```bash
   git commit -m "feat: add <what> to <zone>"
   ```

6. Push and open the PR. Reference the issue it closes (e.g. `Closes #12`).

## Style Guide

- **Frontend**: vanilla JS + CSS (glassmorphism design tokens live in `:root` of `index.html`). Avoid heavy frameworks.
- **Backend**: keep `server.js` organized; new routes are grouped by feature with a comment header.
- **Variables**: any new secret goes through `process.env`, is documented in `.env.example` and the README table, and is never hard-coded.
- **3D assets**: keep `.glb` files reasonably sized; prefer decimated/optimized models.

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes:

| Prefix   | Use |
|----------|-----|
| `feat:`  | New feature |
| `fix:`   | Bug fix |
| `docs:`  | Documentation only |
| `style:` | Formatting, no code change |
| `refactor:` | Code change that fixes neither a bug nor adds a feature |
| `perf:`  | Performance improvement |
| `chore:` | Tooling, deps, config |

## Questions?

Open a discussion or an issue — happy to help. 😊
