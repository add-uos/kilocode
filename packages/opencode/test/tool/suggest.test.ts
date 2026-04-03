import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test"
import { Session } from "../../src/session"
import { Suggestion } from "../../src/suggestion"
import { SuggestTool } from "../../src/tool/suggest"

const ctx = {
  sessionID: "ses_test",
  messageID: "msg_assistant",
  callID: "call_suggest",
  agent: "code",
  abort: AbortSignal.any([]),
  messages: [
    {
      info: {
        id: "msg_user",
        role: "user",
        sessionID: "ses_test",
        time: { created: 1 },
        agent: "code",
        model: { providerID: "openai", modelID: "gpt-4" },
      },
      parts: [],
    },
  ],
  metadata: () => {},
  ask: async () => {},
}

describe("tool.suggest", () => {
  let show: ReturnType<typeof spyOn>
  let updateMessage: ReturnType<typeof spyOn>
  let updatePart: ReturnType<typeof spyOn>

  beforeEach(() => {
    show = spyOn(Suggestion, "show")
    updateMessage = spyOn(Session, "updateMessage").mockResolvedValue({} as never)
    updatePart = spyOn(Session, "updatePart").mockResolvedValue({} as never)
  })

  afterEach(() => {
    show.mockRestore()
    updateMessage.mockRestore()
    updatePart.mockRestore()
  })

  test("returns dismissal result when suggestion is dismissed", async () => {
    const tool = await SuggestTool.init()
    show.mockRejectedValueOnce(new Suggestion.DismissedError())

    const result = await tool.execute(
      {
        suggest: "Run review?",
        actions: [{ label: "Start", prompt: "/local-review-uncommitted" }],
      },
      ctx as any,
    )

    expect(result.title).toBe("Suggestion dismissed")
    expect(result.output).toBe("User dismissed the suggestion.")
    expect(result.metadata.dismissed).toBe(true)
  })

  test("returns accepted action metadata when suggestion is accepted", async () => {
    const tool = await SuggestTool.init()
    show.mockResolvedValueOnce({
      label: "Start review",
      description: "Run a local review now",
      prompt: "/local-review-uncommitted",
    })

    const result = await tool.execute(
      {
        suggest: "Run review?",
        actions: [{ label: "Start review", prompt: "/local-review-uncommitted" }],
      },
      ctx as any,
    )

    expect(result.title).toBe("User accepted: Start review")
    expect(result.output).toContain("Continue with that request now")
    expect(result.metadata.dismissed).toBe(false)
    expect(updateMessage).toHaveBeenCalledTimes(1)
    expect(updatePart).toHaveBeenCalledTimes(1)
    expect(result.metadata.accepted).toEqual({
      label: "Start review",
      description: "Run a local review now",
      prompt: "/local-review-uncommitted",
    })
  })
})
