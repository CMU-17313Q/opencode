import { describe, expect, test } from "bun:test"
import { isAllowedCorsOrigin, isAllowedRequestOrigin } from "../src/cors"

describe("isAllowedCorsOrigin", () => {
  test("allows requests without an origin", () => {
    expect(isAllowedCorsOrigin(undefined)).toBe(true)
  })

  test("allows built-in local and application origins", () => {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:4096",
      "oc://renderer",
      "tauri://localhost",
      "http://tauri.localhost",
      "https://tauri.localhost",
    ]

    for (const origin of allowedOrigins) {
      expect(isAllowedCorsOrigin(origin)).toBe(true)
    }
  })

  test("allows official OpenCode origins", () => {
    expect(isAllowedCorsOrigin("https://opencode.ai")).toBe(true)
    expect(isAllowedCorsOrigin("https://docs.opencode.ai")).toBe(true)
  })

  test("allows origins provided through configuration", () => {
    const options = { cors: ["https://allowed.example.com"] }

    expect(isAllowedCorsOrigin("https://allowed.example.com", options)).toBe(true)
  })
  test("rejects origins that are not allowed", () => {
    expect(isAllowedCorsOrigin("https://example.com")).toBe(false)
    expect(isAllowedCorsOrigin("https://opencode.ai.example.com")).toBe(false)
  })
})

describe("isAllowedRequestOrigin", () => {
  test("allows requests without an origin", () => {
    expect(isAllowedRequestOrigin(undefined, undefined)).toBe(true)
  })

  test("allows requests from the same host", () => {
    expect(isAllowedRequestOrigin("https://example.com", "example.com")).toBe(true)
  })

  test("falls back to CORS validation for a different or invalid host", () => {
    const options = { cors: ["https://allowed.example.com"] }

    expect(isAllowedRequestOrigin("https://allowed.example.com", "different.example.com", options)).toBe(true)
    expect(isAllowedRequestOrigin("not-a-valid-url", "example.com")).toBe(false)
  })
})