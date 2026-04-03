// kilocode_change - new file
import { Flag } from "@/flag/flag"
import { Identifier } from "@/id/id"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Suggestion } from "@/suggestion"
import z from "zod"
import DESCRIPTION from "./suggest.txt"
import { Tool } from "./tool"

const Params = z.object({
  suggest: z.string().describe("Short suggestion text shown to the user"),
  actions: z.array(Suggestion.Action).min(1).max(2).describe("Available actions the user can take"),
})

type Meta = {
  accepted?: Suggestion.Action
  dismissed: boolean
}

async function inject(input: { sessionID: string; user: MessageV2.User; agent: string; text: string }) {
  const msg: MessageV2.User = {
    id: Identifier.ascending("message"),
    sessionID: input.sessionID,
    role: "user",
    time: {
      created: Date.now(),
    },
    agent: input.agent,
    model: input.user.model,
    variant: input.user.variant,
    editorContext: input.user.editorContext,
  }
  await Session.updateMessage(msg)
  await Session.updatePart({
    id: Identifier.ascending("part"),
    messageID: msg.id,
    sessionID: input.sessionID,
    type: "text",
    text: input.text,
    synthetic: true,
  } satisfies MessageV2.TextPart)
}

export const SuggestTool = Tool.define<typeof Params, Meta>("suggest", {
  description: DESCRIPTION,
  parameters: Params,
  async execute(params, ctx) {
    const user = ctx.messages
      .slice()
      .reverse()
      .find((msg) => msg.info.role === "user")?.info
    if (!user || user.role !== "user") {
      throw new Error("No user message found for suggestion context")
    }

    const promise = Suggestion.show({
      sessionID: ctx.sessionID,
      text: params.suggest,
      actions: params.actions,
      blocking: Flag.KILO_CLIENT !== "vscode",
      tool: ctx.callID ? { messageID: ctx.messageID, callID: ctx.callID } : undefined,
    })

    const listener = () =>
      Suggestion.list().then((items: Suggestion.Request[]) => {
        const match = items.find((item: Suggestion.Request) => item.sessionID === ctx.sessionID)
        if (match) return Suggestion.dismiss(match.id)
      })
    ctx.abort.addEventListener("abort", listener, { once: true })

    const action = await promise
      .catch((error) => {
        if (error instanceof Suggestion.DismissedError) return undefined
        throw error
      })
      .finally(() => {
        ctx.abort.removeEventListener("abort", listener)
      })

    if (!action) {
      const metadata: Meta = {
        accepted: undefined,
        dismissed: true,
      }
      return {
        title: "Suggestion dismissed",
        output: "User dismissed the suggestion.",
        metadata,
      }
    }

    await inject({
      sessionID: ctx.sessionID,
      user,
      agent: ctx.agent,
      text: action.prompt,
    })

    const metadata: Meta = {
      accepted: action,
      dismissed: false,
    }

    return {
      title: `User accepted: ${action.label}`,
      output: `User accepted the suggestion "${action.label}". The accepted action prompt is: ${JSON.stringify(action.prompt)}. It has also been injected as a synthetic user message. Continue with that request now.`,
      metadata,
    }
  },
})
