import { Context } from "effect"

const opencodeOrigin = /^https:\/\/([a-z0-9-]+\.)*opencode\.ai$/
const allowedOriginPrefixes = ["http://localhost:", "http://127.0.0.1:", "oc://renderer"]

const allowedOrigins = new Set(["tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"])

export type CorsOptions = { readonly cors?: ReadonlyArray<string> }

export const CorsConfig = Context.Reference<CorsOptions | undefined>("@opencode/ServerCorsConfig", {
  defaultValue: () => undefined,
})

function isBuiltInAllowedOrigin(input: string) {
  if (allowedOriginPrefixes.some((prefix) => input.startsWith(prefix))) return true
  if (allowedOrigins.has(input)) return true
  return opencodeOrigin.test(input)
}

export function isAllowedCorsOrigin(input: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  if (isBuiltInAllowedOrigin(input)) return true
  return opts?.cors?.includes(input) ?? false
}

export function isAllowedRequestOrigin(input: string | undefined, host: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  if (host && sameHost(input, host)) return true
  return isAllowedCorsOrigin(input, opts)
}

function sameHost(origin: string, host: string) {
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
