export const errorConstructors = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
  "EvalError",
  "URIError",
])

export const valueConstructors = new Set(["Date", "RegExp", "Map", "Set", "URL", "URLSearchParams"])

export const compoundOperators = new Set(["+=", "-=", "*=", "/=", "%=", "**=", "&=", "|=", "^=", "<<=", ">>=", ">>>="])

const ErrorBrand: unique symbol = Symbol("codemode.error")

export const createErrorValue = (name: string, message: string): SafeObject => {
  const value = Object.assign(Object.create(null) as SafeObject, { name, message })
  Object.defineProperty(value, ErrorBrand, { value: name })
  return value
}

export const errorBrandName = (value: unknown): string | undefined =>
  value !== null && typeof value === "object"
    ? ((value as Record<PropertyKey, unknown>)[ErrorBrand] as string | undefined)
    : undefined

export const boundedData = (value: unknown, label: string): unknown => copyIn(value, label, true)

type SandboxStringFormatter = readonly [
  ctor: new (...args: never[]) => unknown,
  format: (value: never) => string,
]

const sandboxStringFormatters: readonly SandboxStringFormatter[] = [
  [SandboxDate, (value: SandboxDate) => (Number.isFinite(value.time) ? new Date(value.time).toISOString() : "Invalid Date")],
  [SandboxRegExp, (value: SandboxRegExp) => `/${value.regex.source}/${value.regex.flags}`],
  [SandboxMap, () => "[object Map]"],
  [SandboxSet, () => "[object Set]"],
  [SandboxURL, (value: SandboxURL) => value.url.href],
  [SandboxURLSearchParams, (value: SandboxURLSearchParams) => value.params.toString()],
]

const coerceArrayToString = (value: unknown[]): string =>
  value.map((item) => (item === null || item === undefined ? "" : coerceToString(item))).join(",")

export const coerceToString = (value: unknown): string => {
  if (value === null) return "null"
  if (value === undefined) return "undefined"

  const formatter = sandboxStringFormatters.find(([ctor]) => value instanceof ctor)
  if (formatter) return formatter[1](value as never)

  if (typeof value === "object") {
    return Array.isArray(value) ? coerceArrayToString(value) : "[object Object]"
  }

  return String(value)
}

export const coerceToNumber = (value: unknown): number => {
  if (value instanceof SandboxDate) return value.time
  if (isSandboxValue(value)) return Number.NaN
  return value !== null && typeof value === "object" && !Array.isArray(value) ? Number.NaN : Number(value)
}

const sandboxCoercions: Record<string, (raw: unknown) => unknown> = {
  Number: (raw) => coerceToNumber(raw),
  String: (raw) => coerceToString(raw),
  parseInt: (raw) => parseInt(coerceToString(raw)),
}

const valueCoercions: Record<string, (value: unknown) => unknown> = {
  Number: (value) => coerceToNumber(value),
  Boolean: (value) => Boolean(value),
  parseFloat: (value) => parseFloat(coerceToString(value)),
}

function coerceParseInt(value: unknown, args: Array<unknown>, node: AstNode): number {
  const radix = args[1]
  if (radix !== undefined && typeof radix !== "number") {
    throw new InterpreterRuntimeError("parseInt expects a numeric radix.", node)
  }
  return parseInt(coerceToString(value), radix as number | undefined)
}

export const invokeCoercion = (ref: CoercionFunction, args: Array<unknown>, node: AstNode): unknown => {
  const raw = args[0]

  if (isSandboxValue(raw)) {
    if (ref.name === "Boolean") return true
    return sandboxCoercions[ref.name]?.(raw) ?? parseFloat(coerceToString(raw))
  }

  const value = boundedData(raw, `${ref.name} input`)
  if (ref.name === "parseInt") return coerceParseInt(value, args, node)
  return valueCoercions[ref.name]?.(value) ?? coerceToString(value)
}
import { type AstNode, CoercionFunction, InterpreterRuntimeError } from "../interpreter/model.js"
import { copyIn, type SafeObject } from "../tool-runtime.js"
import {
  isSandboxValue,
  SandboxDate,
  SandboxMap,
  SandboxRegExp,
  SandboxSet,
  SandboxURL,
  SandboxURLSearchParams,
} from "../values.js"
