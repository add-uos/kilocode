# Contributing to Kilo CLI

See [the Documentation for details on contributing](https://kilo.ai/docs/contributing).

## TL;DR

There are lots of ways to contribute to the project:

- **Code Contributions:** Implement new features or fix bugs
- **Documentation:** Improve existing docs or create new guides
- **Bug Reports:** Report issues you encounter
- **Feature Requests:** Suggest new features or improvements
- **Community Support:** Help other users in the community

The Kilo Community is [on Discord](https://kilo.ai/discord).

## Developing Kilo CLI

- **Requirements:** Bun 1.3.10+
- Install dependencies and start the dev server from the repo root:

  ```bash
  bun install
  bun dev
  ```

### Running against a different directory

By default, `bun dev` runs Kilo CLI in the `packages/opencode` directory. To run it against a different directory or repository:

```bash
bun dev <directory>
```

To run Kilo CLI in the root of the repo itself:

```bash
bun dev .
```

### Building a "local" binary

To compile a standalone executable:

```bash
./packages/opencode/script/build.ts --single
```

Then run it with:

```bash
./packages/opencode/dist/@kilocode/cli-<platform>/bin/kilo
```

Replace `<platform>` with your platform (e.g., `darwin-arm64`, `linux-x64`).

### Understanding bun dev vs kilo

During development, `bun dev` is the local equivalent of the built `kilo` command. Both run the same CLI interface:

```bash
# Development (from project root)
bun dev --help           # Show all available commands
bun dev serve            # Start headless API server
bun dev web              # Start server + open web interface

# Production
kilo --help          # Show all available commands
kilo serve           # Start headless API server
kilo web             # Start server + open web interface
```

### Pull Request Expectations

- **Issue First Policy:** All PRs must reference an existing issue.
- **UI Changes:** Include screenshots or videos (before/after).
- **Logic Changes:** Explain how you verified it works.
- **PR Titles:** Follow conventional commit standards (`feat:`, `fix:`, `docs:`, etc.).

### Manual Testing Requirement

All pull requests must be manually tested by the contributor before submission. Automated tests alone are not sufficient — we expect contributors to verify their changes work as intended in a real environment.

**What's required:**

- Manually test your changes end-to-end before opening a PR.
- Include proof of manual testing in your PR description. Acceptable forms of evidence include:
  - Screenshots or screen recordings demonstrating the change in action
  - Terminal/test output showing the feature or fix working correctly
  - A detailed, step-by-step description of what you tested and the results you observed
- For bug fixes, demonstrate that the bug is resolved and that related functionality still works.
- For new features, show the feature working across relevant scenarios, including edge cases where appropriate.

**PRs that do not include evidence of manual testing will most likely not be reviewed or accepted.** This policy helps us maintain quality and ensures that contributors have confidence in their own changes before requesting review from others.

### Issue and PR Lifecycle

To keep our backlog manageable, we automatically close inactive issues and PRs after a period of inactivity. This isn't a judgment on quality — older items tend to lose context over time and we'd rather start fresh if they're still relevant. Feel free to reopen or create a new issue/PR if you're still working on something!

### Style Preferences

- **Functions:** Keep logic within a single function unless breaking it out adds clear reuse.
- **Destructuring:** Avoid unnecessary destructuring.
- **Control flow:** Avoid `else` statements; prefer early returns.
- **Types:** Avoid `any`.
- **Variables:** Prefer `const`.
- **Naming:** Concise single-word identifiers when descriptive.
- **Runtime APIs:** Use Bun helpers (e.g., `Bun.file()`).
