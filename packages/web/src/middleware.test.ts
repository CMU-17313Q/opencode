import { describe, expect, mock, test } from "bun:test"

mock.module("astro:middleware", () => ({
  defineMiddleware: (middleware: unknown) => middleware,
}))

const { onRequest } = await import("./middleware")
const origin = "https://example.com"
const noop = () => "next"

function context(path: string, headers: Record<string, string> = {}) {
  const url = new URL(origin + path)
  return { url, request: new Request(url, { headers }) }
}

async function expectRedirect(path: string, expectedPath: string, headers: Record<string, string> = {}) {
  const res = await onRequest(context(path, headers), noop)

  expect(res).toBeInstanceOf(Response)
  expect(res.status).toBe(302)
  expect(res.headers.get("location")).toBe(origin + expectedPath)

  return res
}

describe("web middleware", () => {
  test("leaves non-docs routes alone", async () => {
    expect(await onRequest(context("/about"), noop)).toBe("next")
  })

  test("redirects a locale-prefixed docs url to canonical", async () => {
    const res = await expectRedirect("/docs/en/getting-started", "/docs/getting-started")
    expect(res.headers.get("set-cookie")).toContain("oc_locale=en")
  })

  test("docs root: locale cookie wins over accept-language", async () => {
    await expectRedirect("/docs", "/docs/de/", {
      cookie: "oc_locale=de",
      "accept-language": "fr-FR",
    })
  })

  test("falls back to accept-language, highest q first", async () => {
    await expectRedirect("/docs/", "/docs/fr/", {
      "accept-language": "es;q=0.4, fr-FR;q=0.9, en;q=0.8",
    })
  })
})
