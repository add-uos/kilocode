# Plan: Suggest tool — command dispatch + review-specific prompts

## Goal

When the main agent suggests a code review, it should use the existing `/local-review` or `/local-review-uncommitted` commands. The agent system prompt needs instructions on when/how to call the suggest tool for review, and how to pick between the two commands.

## Problem

1. **Command dispatch doesn't work**: The current `inject()` creates a synthetic user message with the slash command text, but the server never parses slash prefixes — that's client-side only. The synthetic message gets stored in the DB but the current turn's LLM never sees it (it's outside the active `streamText()` call).

2. **Calling `SessionPrompt.command()` from inside a tool deadlocks**: The prompt loop waits for the tool to finish; the tool would wait for the loop to yield.

3. **System prompt guidance is generic**: `soul.txt` says "suggest a code review" but doesn't mention the specific commands or when to use each.

## Solution

### 1. `packages/opencode/src/tool/suggest.ts` — Resolve commands, return as tool output

Replace `inject()` with a new approach:

- **For slash-command actions** (prompt starts with `/`): parse the command name, call `Command.get(name)`, resolve its template via `await command.template` (which runs git diff, builds file lists, etc.), and return the resolved template as the tool output. The LLM sees the full review prompt in the tool output and executes the review within the current turn.

- **For plain-text actions**: return the action prompt text directly as tool output. The LLM acts on it within the current turn.

- **Remove `inject()` entirely** — it's no longer needed since we return everything as tool output.

Changes:

- Remove the `inject()` function
- Remove the `Session`, `MessageV2`, `Identifier` imports (no longer needed for message creation)
- Add `Command` import
- In the `execute` function's accept branch:
  - If `action.prompt` starts with `/`, parse command name, resolve template, return as output
  - Otherwise, return the plain prompt text as output
- Remove the user-message lookup (`ctx.messages` scan for last user) since we no longer need it for inject

### 2. `packages/opencode/src/kilocode/soul.txt` — Specific review guidance

Replace the current `## Suggestions` section (lines 16-22) with:

```
## Suggestions

- Use the `question` tool only when you need an actual answer from the user.
- If the `suggest` tool is available, use it for lightweight next-step nudges that the user can accept or dismiss.
- When you have completed implementation work and you are at least 90% confident the task is done, use `suggest` to offer a code review of uncommitted changes.
- Only suggest review when the user's request appears fully addressed. Do not suggest it after every edit or partial implementation turn.
- Keep suggestion text concise, use at most 1-2 actions, and make each accepted action prompt self-contained.
- When suggesting a code review, use the `/local-review-uncommitted` command if there are uncommitted changes in the working tree (the typical case after you've just finished editing files). Use `/local-review` if the work has been committed to a feature branch and the user wants a branch-level review.
- Do NOT suggest review if the user explicitly asked you not to, or if you already suggested review for the same body of work in this session.
```

### 3. `packages/opencode/src/tool/suggest.txt` — Add review use-case guidance

Add a section after the existing guidelines:

```
Code review suggestions:
- When suggesting review after implementation, use `/local-review-uncommitted` as the action prompt
  if changes are uncommitted (the common case after editing files). Use `/local-review` if changes
  have been committed to a feature branch.
- The action prompt for review should be the bare command (e.g. `/local-review-uncommitted`), not
  a description — the command resolves into a full structured review prompt automatically.
- Only suggest review once per implementation task. If the user dismisses, do not re-suggest.
```

### 4. `packages/opencode/src/session/processor.ts` — No changes needed

The dismiss handling (`blocked = shouldBreak` when `dismissed === true`) stays as-is. For accepted actions, the tool returns normally with output, and the LLM continues within the same turn to process the review.

### 5. Tests

- Update `packages/opencode/test/tool/suggest.test.ts`:
  - Remove `Session.updateMessage` / `Session.updatePart` spy expectations
  - Add test for slash-command resolution (mock `Command.get()` to return a command with a resolved template)
  - Add test for plain-text action prompt (returns prompt as output)

## Files changed

| File                                          | Action | Description                                                       |
| --------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `packages/opencode/src/tool/suggest.ts`       | Modify | Remove inject(), resolve command templates, return as tool output |
| `packages/opencode/src/kilocode/soul.txt`     | Modify | Add specific review command guidance to Suggestions section       |
| `packages/opencode/src/tool/suggest.txt`      | Modify | Add code review suggestion guidelines                             |
| `packages/opencode/test/tool/suggest.test.ts` | Modify | Update tests for new behavior                                     |
