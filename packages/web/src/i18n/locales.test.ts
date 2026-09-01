import { describe, expect, test } from "bun:test"
import { matchLocale } from "./locales"

describe("matchLocale", () => {
  test("returns null for blank or malformed input", () => {
    expect(matchLocale("")).toBeNull()
    expect(matchLocale("%E0%A4%A")).toBeNull()
  })

  test("matches exact locale aliases", () => {
    expect(matchLocale("en")).toBe("root")
    expect(matchLocale("br")).toBe("pt-br")
    expect(matchLocale("pt-br")).toBe("pt-br")
  })

  test("matches simplified Chinese locales", () => {
    expect(matchLocale("zh")).toBe("zh-cn")
    expect(matchLocale("zh-CN")).toBe("zh-cn")
  })

  test("matches traditional Chinese locales", () => {
    expect(matchLocale("zh-Hant")).toBe("zh-tw")
    expect(matchLocale("zh-TW")).toBe("zh-tw")
    expect(matchLocale("zh-HK")).toBe("zh-tw")
  })

  test("matches Portuguese regional locales", () => {
    expect(matchLocale("pt-PT")).toBe("pt-br")
  })

  test("matches Norwegian locales", () => {
    expect(matchLocale("no-NO")).toBe("nb")
    expect(matchLocale("nb-NO")).toBe("nb")
    expect(matchLocale("nn-NO")).toBe("nb")
  })

  test("matches supported regional locales", () => {
    expect(matchLocale("fr-CA")).toBe("fr")
  })

  test("returns null for unsupported locales", () => {
    expect(matchLocale("xx-YY")).toBeNull()
  })
})