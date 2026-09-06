import { describe, expect, test } from "bun:test"
import { matchLocale } from "../../src/i18n/locales"

describe("matchLocale", () => {
  test("returns null for empty or unparseable input", () => {
    expect(matchLocale("")).toBe(null)
    expect(matchLocale("   ")).toBe(null)
  })

  test("matches simplified Chinese by default", () => {
    expect(matchLocale("zh")).toBe("zh-cn")
    expect(matchLocale("zh-CN")).toBe("zh-cn")
  })

  test("matches traditional Chinese for hant/tw/hk/mo variants", () => {
    expect(matchLocale("zh-hant")).toBe("zh-tw")
    expect(matchLocale("zh-TW")).toBe("zh-tw")
    expect(matchLocale("zh-HK")).toBe("zh-tw")
    expect(matchLocale("zh-MO")).toBe("zh-tw")
  })

  test("resolves known locale aliases directly", () => {
    expect(matchLocale("en")).toBe("root")
    expect(matchLocale("br")).toBe("pt-br")
    expect(matchLocale("nn")).toBe("nb")
  })

  test("matches Portuguese variants via prefix", () => {
    expect(matchLocale("pt-PT")).toBe("pt-br")
  })

  test("matches Norwegian variants via prefix", () => {
    expect(matchLocale("no-NO")).toBe("nb")
    expect(matchLocale("nb-NO")).toBe("nb")
  })

  test("falls back to prefix matching against the starts table", () => {
    expect(matchLocale("ko-KR")).toBe("ko")
    expect(matchLocale("de-AT")).toBe("de")
  })

  test("returns null when nothing matches", () => {
    expect(matchLocale("xx-YY")).toBe(null)
  })
})