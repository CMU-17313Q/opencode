const PROVIDER_ID = /^[a-z0-9][a-z0-9-_]*$/
const OPENAI_COMPATIBLE = "@ai-sdk/openai-compatible"

type Translator = (key: string, vars?: Record<string, string | number | boolean>) => string

export type ModelErr = {
  id?: string
  name?: string
}

export type HeaderErr = {
  key?: string
  value?: string
}

export type ModelRow = {
  row: string
  id: string
  name: string
  err: ModelErr
}

export type HeaderRow = {
  row: string
  key: string
  value: string
  err: HeaderErr
}

export type FormState = {
  providerID: string
  name: string
  baseURL: string
  apiKey: string
  models: ModelRow[]
  headers: HeaderRow[]
  err: {
    providerID?: string
    name?: string
    baseURL?: string
  }
}

type ValidateArgs = {
  form: FormState
  t: Translator
  disabledProviders: string[]
  existingProviderIDs: Set<string>
}

export function validateCustomProvider(input: ValidateArgs) {
  const base = validateBase(input)
  const modelsValidation = validateModels(input.form.models, input.t)
  const headersValidation = validateHeaders(input.form.headers, input.t)
  
  const baseValid = !base.err.providerID
                 && !base.err.name
                 && !base.err.baseURL
  const ok = baseValid
    && modelsValidation.modelsValid
    && headersValidation.headersValid
  if (!ok) return {
    err: base.err,
    models: modelsValidation.models,
    headers: headersValidation.headers,
  }

  return {
    err: base.err,
    models: modelsValidation.models,
    headers: headersValidation.headers,
    result: {
      providerID: base.providerID,
      name: base.name,
      key: base.key,
      config: {
        npm: OPENAI_COMPATIBLE,
        name: base.name,
        ...(base.env ? { env: [base.env] } : {}),
        options: {
          baseURL: base.baseURL,
          ...(
            Object.keys(headersValidation.headerConfig).length
              ? { headers: headersValidation.headerConfig }
              : {}
          ),
        },
        models: modelsValidation.modelConfig,
      },
    },
  }
}

function validateBase(input: ValidateArgs) {
  const providerID = input.form.providerID.trim()
  const name = input.form.name.trim()
  const baseURL = input.form.baseURL.trim()
  const apiKey = input.form.apiKey.trim()

  const env = apiKey.match(/^\{env:([^}]+)\}$/)?.[1]?.trim()
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
    : input.existingProviderIDs.has(providerID) && !disabled
      ? input.t("provider.custom.error.providerID.exists")
      : undefined

  return {
    err: {
      providerID: idError ?? existsError,
      name: nameError,
      baseURL: urlError,
    },
    providerID,
    name,
    baseURL,
    key,
    env,
  }
}

function validateModels(rows: ModelRow[], t: Translator) {
  const seenModels = new Set<string>()

  const models = rows.map((m) => {
    const id = m.id.trim()
    const idError = !id
      ? t("provider.custom.error.required")
      : seenModels.has(id)
        ? t("provider.custom.error.duplicate")
        : undefined
    if (!idError) seenModels.add(id)
    const nameError = !m.name.trim()
      ? t("provider.custom.error.required")
      : undefined
    return { id: idError, name: nameError }
  })
  const modelsValid = models.every((m) => !m.id && !m.name)
  const modelConfig = Object.fromEntries(rows.map((m) => [m.id.trim(), { name: m.name.trim() }]))

  return { models, modelsValid, modelConfig }
}

function validateHeaders(rows: HeaderRow[], t: Translator) {
  const seenHeaders = new Set<string>()
  const headers = rows.map((h) => {
    const key = h.key.trim()
    const value = h.value.trim()
    if (!key && !value) return {}
    const keyError = !key
      ? t("provider.custom.error.required")
      : seenHeaders.has(key.toLowerCase())
        ? t("provider.custom.error.duplicate")
        : undefined
    if (!keyError) seenHeaders.add(key.toLowerCase())
    const valueError = !value ? t("provider.custom.error.required") : undefined
    return { key: keyError, value: valueError }
  })
  const headersValid = headers.every((h) => !h.key && !h.value)

  const headerConfig = Object.fromEntries(
    rows
      .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
      .filter((h) => !!h.key && !!h.value)
      .map((h) => [h.key, h.value]),
  )

  return { headers, headersValid, headerConfig }
}

let row = 0

const nextRow = () => `row-${row++}`

export const modelRow = (): ModelRow => ({ row: nextRow(), id: "", name: "", err: {} })
export const headerRow = (): HeaderRow => ({ row: nextRow(), key: "", value: "", err: {} })
