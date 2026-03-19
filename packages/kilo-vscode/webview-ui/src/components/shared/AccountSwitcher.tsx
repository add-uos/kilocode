/**
 * AccountSwitcher component
 * Compact popover for switching between personal and organization accounts
 * in the prompt input hint bar. Visible only when the user is logged in
 * and belongs to at least one organization.
 */

import { Component, createSignal, createMemo, createEffect, For, Show } from "solid-js"
import { Popover } from "@kilocode/kilo-ui/popover"
import { Button } from "@kilocode/kilo-ui/button"
import { useServer } from "../../context/server"
import { useVSCode } from "../../context/vscode"
import { useLanguage } from "../../context/language"

const PERSONAL = "personal"

/* Inline SVG icon: single person silhouette (16x16) */
const PersonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5 7a5 5 0 0 0-10 0h10Z" />
  </svg>
)

/* Inline SVG icon: building / team (16x16) */
const TeamIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M3 1h10v14H3V1Zm2 2v2h2V3H5Zm4 0v2h2V3H9ZM5 7v2h2V7H5Zm4 0v2h2V7H9Zm-2 4v4h2v-4H7Z" />
  </svg>
)

export const AccountSwitcher: Component = () => {
  const server = useServer()
  const vscode = useVSCode()
  const language = useLanguage()
  const [open, setOpen] = createSignal(false)
  const [focused, setFocused] = createSignal(-1)
  const [switching, setSwitching] = createSignal(false)
  let listRef: HTMLDivElement | undefined

  const profile = () => server.profileData()
  const orgs = () => profile()?.profile.organizations ?? []
  const visible = () => !!profile() && orgs().length > 0
  const current = () => profile()?.currentOrgId ?? PERSONAL

  // Reset switching state when profile updates (org switch completed)
  createEffect(() => {
    profile()
    setSwitching(false)
  })

  const label = createMemo(() => {
    const id = current()
    if (id === PERSONAL) return language.t("profile.personalAccount")
    const org = orgs().find((o) => o.id === id)
    return org?.name ?? language.t("profile.personalAccount")
  })

  const items = createMemo(() => [
    { id: PERSONAL, name: language.t("profile.personalAccount"), role: "" },
    ...orgs().map((o) => ({ id: o.id, name: o.name, role: o.role })),
  ])

  function pick(id: string) {
    if (id === current()) {
      setOpen(false)
      return
    }
    setSwitching(true)
    vscode.postMessage({
      type: "setOrganization",
      organizationId: id === PERSONAL ? null : id,
    })
    setOpen(false)
  }

  function focusItem(idx: number) {
    const nodes = listRef?.querySelectorAll<HTMLElement>("[role=option]")
    if (!nodes) return
    const clamped = Math.max(0, Math.min(idx, nodes.length - 1))
    setFocused(clamped)
    nodes[clamped]?.focus()
  }

  function onOpen(val: boolean) {
    setOpen(val)
    if (val) {
      const idx = items().findIndex((i) => i.id === current())
      requestAnimationFrame(() => focusItem(idx >= 0 ? idx : 0))
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const len = items().length
    const cur = focused()
    if (e.key === "ArrowDown") {
      e.preventDefault()
      focusItem((cur + 1) % len)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      focusItem((cur - 1 + len) % len)
    } else if (e.key === "Home") {
      e.preventDefault()
      focusItem(0)
    } else if (e.key === "End") {
      e.preventDefault()
      focusItem(len - 1)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (cur >= 0) pick(items()[cur].id)
    }
  }

  return (
    <Show when={visible()}>
      <Popover
        placement="top-start"
        fitViewport
        open={open()}
        onOpenChange={onOpen}
        triggerAs={Button}
        triggerProps={{ variant: "ghost", size: "small", disabled: switching() }}
        trigger={
          <>
            <Show when={current() !== PERSONAL} fallback={<PersonIcon />}>
              <TeamIcon />
            </Show>
            <span class="account-switcher-label">{label()}</span>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ "flex-shrink": "0" }}>
              <path d="M8 4l4 5H4l4-5z" />
            </svg>
          </>
        }
      >
        <div class="account-switcher-list" role="listbox" ref={listRef} onKeyDown={onKeyDown}>
          <For each={items()}>
            {(item, i) => (
              <div
                class={`account-switcher-item${item.id === current() ? " selected" : ""}`}
                role="option"
                aria-selected={item.id === current()}
                tabindex={focused() === i() ? 0 : -1}
                onClick={() => pick(item.id)}
                onFocus={() => setFocused(i())}
              >
                <Show when={item.id === PERSONAL} fallback={<TeamIcon />}>
                  <PersonIcon />
                </Show>
                <div class="account-switcher-item-text">
                  <span class="account-switcher-item-name">{item.name}</span>
                  <Show when={item.role}>
                    <span class="account-switcher-item-role">{item.role}</span>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Popover>
    </Show>
  )
}
