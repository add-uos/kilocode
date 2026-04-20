import type { ModelEntry } from "./CustomProviderModelCard"

type Translator = (key: string, params?: Record<string, string>) => string

export type HeaderRow = {
  key: string
  value: string
}

export type FormState = {
  providerID: string
  name: string
  baseURL: string
  apiKey: string
  models: ModelEntry[]
  headers: HeaderRow[]
  saving: boolean
}

export type FormErrors = {
  providerID: string | undefined
  name: string | undefined
  baseURL: string | undefined
  models: Array<{ id?: string; name?: string; variants?: Array<{ name?: string }> }>
  headers: Array<{ key?: string; value?: string }>
}

type ValidateArgs = {
  form: FormState
  t: Translator
  editing: boolean
  disabledProviders: string[]
  existingProviderIDs: Set<string>
  /** Preserved env vars from the existing provider config (edit mode only) */
  existingEnv?: string[]
}

type ValidateResult = {
  errors: FormErrors
  result?: {
    providerID: string
    name: string
    key: string | undefined
    config: {
      npm: string
      name: string
      env?: string[]
      options: { baseURL: string; headers?: Record<string, string> }
      models: Record<string, unknown>
    }
  }
}

const PROVIDER_ID = /^[a-z0-9][a-z0-9-_]*$/
const OPENAI_COMPATIBLE = "@ai-sdk/openai-compatible"

export function validateCustomProvider(input: ValidateArgs): ValidateResult {
  const providerID = input.form.providerID.trim()
  const name = input.form.name.trim()
  const baseURL = input.form.baseURL.trim()
  const apiKey = input.form.apiKey.trim()

  const env = apiKey.match(/^\{env:([^}]+)\}$/)?.[1]?.trim()
  // When editing and apiKey is empty, preserve existing env from the original config
  const existingEnv = input.editing && !apiKey ? input.existingEnv : undefined
  const key = apiKey && !env ? apiKey : undefined

  const idError = !providerID
    ? input.t("provider.custom.error.providerID.required")
    : !PROVIDER_ID.test(providerID)
      ? input.t("provider.custom.error.providerID.format")
      : undefined

  const nameError = !name ? input.t("provider.custom.error.name.required") : undefined
  const urlError = !baseURL
    ? input.t("provider.custom.error.baseURL.required")
    : !/^https?:\/\//.test(baseURL)
      ? input.t("provider.custom.error.baseURL.format")
      : undefined

  const disabled = input.disabledProviders.includes(providerID)
  const existsError = idError
    ? undefined
    : input.editing
      ? undefined
      : input.existingProviderIDs.has(providerID) && !disabled
        ? input.t("provider.custom.error.providerID.exists")
        : undefined

  const seenModels = new Set<string>()
  const modelErrors = input.form.models.map((m) => {
    const id = m.id.trim()
    const modelIdError = !id
      ? input.t("provider.custom.error.required")
      : seenModels.has(id)
        ? input.t("provider.custom.error.duplicate")
        : (() => {
            seenModels.add(id)
            return undefined
          })()
    const modelNameError = !m.name.trim() ? input.t("provider.custom.error.required") : undefined
    const seen = new Set<string>()
    const verrs = m.reasoning
      ? m.variants.map((v) => {
          const n = v.name.trim()
          const vErr = !n
            ? input.t("provider.custom.error.required")
            : seen.has(n)
              ? input.t("provider.custom.error.duplicate")
              : (() => {
                  seen.add(n)
                  return undefined
                })()
          return { name: vErr }
        })
      : []
    return { id: modelIdError, name: modelNameError, variants: verrs }
  })
  const modelsValid = modelErrors.every((m) => !m.id && !m.name && m.variants.every((v) => !v.name))
  const models = Object.fromEntries(
    input.form.models.map((m) => {
      const ventries = m.reasoning
        ? m.variants
            .filter((v) => v.name.trim())
            .map((v) => {
              const cfg: Record<string, unknown> = {}
              if (v.enableThinking !== undefined) cfg.enable_thinking = v.enableThinking
              if (v.thinking !== undefined) cfg.thinking = { type: v.thinking }
              if (v.reasoningEffort !== undefined) cfg.reasoningEffort = v.reasoningEffort
              if (v.chatTemplateArgs !== undefined) cfg.chat_template_args = { enable_thinking: v.chatTemplateArgs }
              return [v.name.trim(), cfg]
            })
        : []
      const entry: Record<string, unknown> = { name: m.name.trim() }
      if (m.reasoning) entry.reasoning = true
      if (ventries.length > 0) entry.variants = Object.fromEntries(ventries)
      return [m.id.trim(), entry]
    }),
  )

  const seenHeaders = new Set<string>()
  const headerErrors = input.form.headers.map((h) => {
    const hKey = h.key.trim()
    const value = h.value.trim()

    if (!hKey && !value) return {}
    const keyError = !hKey
      ? input.t("provider.custom.error.required")
      : seenHeaders.has(hKey.toLowerCase())
        ? input.t("provider.custom.error.duplicate")
        : (() => {
            seenHeaders.add(hKey.toLowerCase())
            return undefined
          })()
    const valueError = !value ? input.t("provider.custom.error.required") : undefined
    return { key: keyError, value: valueError }
  })
  const headersValid = headerErrors.every((h) => !h.key && !h.value)
  const headers = Object.fromEntries(
    input.form.headers
      .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
      .filter((h) => !!h.key && !!h.value)
      .map((h) => [h.key, h.value]),
  )

  const errors: FormErrors = {
    providerID: idError ?? existsError,
    name: nameError,
    baseURL: urlError,
    models: modelErrors,
    headers: headerErrors,
  }

  const ok = !idError && !existsError && !nameError && !urlError && modelsValid && headersValid
  if (!ok) return { errors }

  const options = {
    baseURL,
    ...(Object.keys(headers).length ? { headers } : {}),
  }

  return {
    errors,
    result: {
      providerID,
      name,
      key,
      config: {
        npm: OPENAI_COMPATIBLE,
        name,
        ...(env ? { env: [env] } : existingEnv ? { env: existingEnv } : {}),
        options,
        models,
      },
    },
  }
}
