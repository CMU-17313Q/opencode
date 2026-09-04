import { error } from "node:console";
import { isRecord } from "./record"

type ConfigIssue = { message: string; path: string[] }

export function cliErrorMessage(input: unknown): string | undefined {

  var error_msg: string | undefined = undefined; 

  if (input instanceof Error && isRecord(input.cause) && "body" in input.cause) {
    const formatted = cliErrorMessage(input.cause.body)
    if (formatted && error_msg === undefined) error_msg = formatted
    
  } else if (tagged(input, "CliError") ||
             tagged(input, "AccountServiceError") ||
             tagged(input, "AccountTransportError")) {
    if (tagged(input, "CliError") && typeof input.exitCode === "number") {
      process.exitCode = input.exitCode
    }
    error_msg = field(input, "message") ?? ""
  }

  if (error_msg !== undefined) {
    return error_msg
  }

  const model = configData(input, "ProviderModelNotFoundError")
  const provider = configData(input, "ProviderInitError")
  const json = configData(input, "ConfigJsonError")
  const directory = configData(input, "ConfigDirectoryTypoError")
  const frontmatter = configData(input, "ConfigFrontmatterError")
  const invalid = configData(input, "ConfigInvalidError")
  
  if (model) {
    const suggestions = Array.isArray(model.suggestions)
      ? model.suggestions.filter((item): item is string => typeof item === "string")
      : []
    error_msg = [
      `Model not found: ${field(model, "providerID")}/${field(model, "modelID")}`,
      ...(suggestions.length ? ["Did you mean: " + suggestions.join(", ")] : []),
      "Try: `opencode models` to list available models",
      "Or check your config (opencode.json) provider/model names",
    ].join("\n")
  } else if (provider) {
    error_msg = `Failed to initialize provider "${field(provider, "providerID")}". Check credentials and configuration.`
  } else if (json) {
    const message = field(json, "message")
    error_msg = `Config file at ${field(json, "path")} is not valid JSON(C)` + (message ? `: ${message}` : "")
  } else if (directory) {
    error_msg = `Directory "${field(directory, "dir")}" in ${field(directory, "path")} is not valid. Rename the directory to "${field(directory, "suggestion")}" or remove it. This is a common typo.`
  } else if (frontmatter) {
    error_msg = field(frontmatter, "message") ?? ""
  } else if (invalid) {
    const path = field(invalid, "path")
    const message = field(invalid, "message")
    const issues = Array.isArray(invalid.issues)
      ? invalid.issues.filter((issue): issue is ConfigIssue => {
          return (
            isRecord(issue) &&
            typeof issue.message === "string" &&
            Array.isArray(issue.path) &&
            issue.path.every((item) => typeof item === "string")
          )
        })
      : []
    error_msg = [
      `Configuration is invalid${path && path !== "config" ? ` at ${path}` : ""}` + (message ? `: ${message}` : ""),
      ...issues.map((issue) => "↳ " + issue.message + " " + issue.path.join(".")),
    ].join("\n")
  }
  else if (tagged(input, "UICancelledError") || named(input, "UICancelledError")) error_msg = ""
  else if (isRecord(input) && named(input, "MCPFailed")) {
    const name = isRecord(input.data) ? field(input.data, "name") : undefined
    error_msg = `MCP server "${name}" failed. Note, opencode does not support MCP authentication yet.`
  }
  return error_msg
}

function tagged(input: unknown, tag: string): input is Record<string, unknown> {
  return isRecord(input) && input._tag === tag
}

function named(input: unknown, name: string) {
  return isRecord(input) && (input.name === name || input._tag === name)
}

function configData(input: unknown, tag: string) {
  if (!isRecord(input)) return undefined
  if (input.name === tag && isRecord(input.data)) return input.data
  if (input._tag === tag) return input
  return undefined
}

function field(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "string" ? input[key] : undefined
}

export function errorFormat(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`
  }

  if (typeof error === "object" && error !== null) {
    try {
      const json = JSON.stringify(error, null, 2)
      // Plain objects whose own properties are all non-enumerable (or empty)
      // serialize to "{}", which prints as a useless bare `{}` on stderr.
      // Fall back to a custom toString first, then to ctor name + own prop names.
      if (json === "{}") {
        const str = String(error)
        if (str && str !== "[object Object]") return str
        const ctor = error.constructor?.name
        const prefix = ctor && ctor !== "Object" ? ctor : "Error"
        const names = Object.getOwnPropertyNames(error)
        return names.length === 0 ? `${prefix} (no message)` : `${prefix} { ${names.join(", ")} }`
      }
      return json
    } catch {
      return "Unexpected error (unserializable)"
    }
  }

  return String(error)
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message) return error.message
    if (error.name) return error.name
  }

  if (isRecord(error) && typeof error.message === "string" && error.message) {
    return error.message
  }

  if (isRecord(error) && isRecord(error.data) && typeof error.data.message === "string" && error.data.message) {
    return error.data.message
  }

  const text = String(error)
  if (text && text !== "[object Object]") return text

  const formatted = errorFormat(error)
  if (formatted) return formatted
  return "unknown error"
}

export function errorData(error: unknown) {
  if (error instanceof Error) {
    return {
      type: error.name,
      message: errorMessage(error),
      stack: error.stack,
      cause: error.cause === undefined ? undefined : errorFormat(error.cause),
      formatted: errorFormat(error),
    }
  }

  if (!isRecord(error)) {
    return {
      type: typeof error,
      message: errorMessage(error),
      formatted: errorFormat(error),
    }
  }

  const data = Object.getOwnPropertyNames(error).reduce<Record<string, unknown>>((acc, key) => {
    const value = error[key]
    if (value === undefined) return acc
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      acc[key] = value
      return acc
    }
    // oxlint-disable-next-line no-base-to-string -- intentional coercion of arbitrary error properties
    acc[key] = value instanceof Error ? value.message : String(value)
    return acc
  }, {})

  if (typeof data.message !== "string") data.message = errorMessage(error)
  if (typeof data.type !== "string") data.type = error.constructor?.name
  data.formatted = errorFormat(error)
  return data
}
