import { Button } from "@kilocode/kilo-ui/button"
import { Icon } from "@kilocode/kilo-ui/icon"
import { IconButton } from "@kilocode/kilo-ui/icon-button"
import type { Component } from "solid-js"
import { For } from "solid-js"
import { useLanguage } from "../../context/language"
import { useSession } from "../../context/session"
import type { SuggestionRequest } from "../../types/messages"

export const SuggestBar: Component<{ request: SuggestionRequest }> = (props) => {
  const session = useSession()
  const language = useLanguage()

  const accept = (index: number) => {
    if (session.respondingSuggestions().has(props.request.id)) return
    session.acceptSuggestion(props.request.id, index)
  }

  const dismiss = () => {
    if (session.respondingSuggestions().has(props.request.id)) return
    session.dismissSuggestion(props.request.id)
  }

  return (
    <div data-component="suggest-bar">
      <div data-slot="suggest-bar-copy">
        <span data-slot="suggest-bar-icon">
          <Icon name="brain" size="small" />
        </span>
        <span data-slot="suggest-bar-text">{props.request.text}</span>
      </div>
      <div data-slot="suggest-bar-actions">
        <For each={props.request.actions}>
          {(action, index) => (
            <Button
              variant={index() === 0 ? "secondary" : "ghost"}
              size="small"
              disabled={session.respondingSuggestions().has(props.request.id)}
              onClick={() => accept(index())}
            >
              {action.label}
            </Button>
          )}
        </For>
        <IconButton
          icon="close"
          variant="ghost"
          size="small"
          disabled={session.respondingSuggestions().has(props.request.id)}
          label={language.t("common.dismiss")}
          onClick={dismiss}
        />
      </div>
    </div>
  )
}
