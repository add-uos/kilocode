/**
 * Pure data-transform helpers that strip heavy edit-tool metadata from
 * message parts before sending them to the webview via postMessage.
 *
 * No vscode dependency — safe to unit-test in isolation.
 */

/** Strip a filediff down to path + addition/deletion counts. */
function slimEditMeta(meta: unknown): Record<string, unknown> | undefined {
  if (!meta || typeof meta !== "object") return undefined

  const obj = meta as Record<string, unknown>
  const filediff = obj.filediff
  if (!filediff || typeof filediff !== "object") return undefined

  const diff = filediff as Record<string, unknown>
  const file = typeof diff.file === "string" ? diff.file : undefined
  const additions = typeof diff.additions === "number" ? diff.additions : 0
  const deletions = typeof diff.deletions === "number" ? diff.deletions : 0

  const result: Record<string, unknown> = {
    filediff: {
      ...(file ? { file } : {}),
      additions,
      deletions,
    },
  }
  // Preserve diagnostics so post-edit LSP errors still render
  if (obj.diagnostics) result.diagnostics = obj.diagnostics
  return result
}

/** Strip heavy before/after/diff content from apply_patch file entries. */
function slimPatchMeta(meta: unknown): Record<string, unknown> | undefined {
  if (!meta || typeof meta !== "object") return undefined

  const obj = meta as Record<string, unknown>
  const files = obj.files
  if (!Array.isArray(files)) return undefined

  return {
    files: files.map((f) => {
      if (!f || typeof f !== "object") return f
      const entry = f as Record<string, unknown>
      return {
        filePath: entry.filePath,
        relativePath: entry.relativePath,
        type: entry.type,
        additions: entry.additions ?? 0,
        deletions: entry.deletions ?? 0,
        movePath: entry.movePath,
      }
    }),
  }
}

/** Strip heavy metadata from edit / apply_patch tool parts; pass-through for everything else. */
export function slimPart<T>(part: T): T {
  if (!part || typeof part !== "object") return part

  const obj = part as Record<string, unknown>
  if (obj.type !== "tool") return part

  const tool = obj.tool
  if (tool !== "edit" && tool !== "apply_patch") return part

  const state = obj.state
  if (!state || typeof state !== "object") return part

  const next = { ...(state as Record<string, unknown>) }
  const meta = tool === "edit" ? slimEditMeta(next.metadata) : slimPatchMeta(next.metadata)
  if (meta) next.metadata = meta
  else delete next.metadata

  return {
    ...obj,
    state: next,
  } as T
}

/** Slim every part in an array. */
export function slimParts<T>(parts: T[]): T[] {
  return parts.map((part) => slimPart(part))
}
