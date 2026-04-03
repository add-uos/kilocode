/**
 * Suggestion handlers — extracted from KiloProvider.
 *
 * Manages suggestion accept and dismiss flows plus recovery after SSE reconnects.
 * No vscode dependency.
 */

import type { KiloClient, SuggestionRequest } from "@kilocode/sdk/v2/client"
import { recoveryDirs } from "./permission-handler"

export type RecoverableSuggestion = SuggestionRequest

export interface SuggestionContext {
  readonly client: KiloClient | null
  readonly currentSessionId: string | undefined
  readonly trackedSessionIds: Set<string>
  readonly sessionDirectories: ReadonlyMap<string, string>
  postMessage(msg: unknown): void
  getWorkspaceDirectory(sessionId?: string): string
}

export function recoverableSuggestions(items: RecoverableSuggestion[], tracked: Set<string>, seen: Set<string>) {
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return tracked.has(item.sessionID)
  })
}

export async function handleSuggestionAccept(ctx: SuggestionContext, requestID: string, index: number): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "suggestionError", requestID })
    return
  }

  try {
    await ctx.client.suggestion.accept(
      { requestID, index, directory: ctx.getWorkspaceDirectory(ctx.currentSessionId) },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to accept suggestion:", error)
    ctx.postMessage({ type: "suggestionError", requestID })
  }
}

export async function handleSuggestionDismiss(ctx: SuggestionContext, requestID: string): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "suggestionError", requestID })
    return
  }

  try {
    await ctx.client.suggestion.dismiss(
      { requestID, directory: ctx.getWorkspaceDirectory(ctx.currentSessionId) },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to dismiss suggestion:", error)
    ctx.postMessage({ type: "suggestionError", requestID })
  }
}

export async function fetchAndSendPendingSuggestions(ctx: SuggestionContext): Promise<void> {
  if (!ctx.client) return
  try {
    const dirs = recoveryDirs(ctx.getWorkspaceDirectory(), ctx.sessionDirectories)

    const seen = new Set<string>()
    for (const dir of dirs) {
      const { data } = await ctx.client.suggestion.list({ directory: dir })
      if (!data) continue
      for (const suggestion of recoverableSuggestions(data, ctx.trackedSessionIds, seen)) {
        ctx.postMessage({
          type: "suggestionRequest",
          suggestion,
        })
      }
    }
  } catch (error) {
    console.error("[Kilo New] KiloProvider: Failed to fetch pending suggestions:", error)
  }
}
