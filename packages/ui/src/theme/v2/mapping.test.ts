import { describe, expect, test } from "bun:test"
import { mapV2Semantics, mergeV2Tokens } from "./mapping"

const light = mapV2Semantics(false)
const dark = mapV2Semantics(true)

describe("mapV2Semantics", () => {
  test("selects the light map when isDark is false", () => {
    expect(light["v2-background-bg-base"]).toBe("var(--v2-grey-100)")
  })

  test("selects the dark map when isDark is true", () => {
    expect(dark["v2-background-bg-base"]).toBe("var(--v2-grey-1000)")
  })

  test("light and dark define exactly the same tokens", () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort())
  })

  test("resolves paired values independently per theme", () => {
    // Tokens whose two halves differ: guards against one theme
    // being derived from the other's column.
    expect(light["v2-text-text-accent"]).toBe("var(--v2-blue-600)")
    expect(dark["v2-text-text-accent"]).toBe("var(--v2-blue-400)")
    expect(light["v2-border-border-muted"]).toBe("var(--v2-alpha-dark-8)")
    expect(dark["v2-border-border-muted"]).toBe("var(--v2-alpha-light-8)")
  })

  test("preserves tokens that are intentionally identical across themes", () => {
    expect(light["v2-background-bg-layer-03"]).toBe(dark["v2-background-bg-layer-03"])
    expect(light["v2-elevation-elements"]).toBe(dark["v2-elevation-elements"])
  })

  test("includes literal (non-var) values verbatim", () => {
    expect(light["v2-overlay-simple-tab-scrim"]).toBe("#fafafa00")
    expect(dark["v2-overlay-simple-tab-scrim"]).toBe("#08080800")
    expect(light["v2-agent-plan-border"]).toBe("rgba(200, 61, 139, 0.20)")
  })

  test("merges agent and avatar token layers into both themes", () => {
    expect(light["v2-agent-writer-solid"]).toBe("var(--v2-purple-700)")
    expect(dark["v2-agent-writer-solid"]).toBe("var(--v2-purple-400)")
    expect(light["v2-avatar-bg-orange"]).toBe("#ee7330ff")
    expect(dark["v2-avatar-bg-orange"]).toBe("#723d22ff")
  })

  test("preserves long composite shadow values", () => {
    expect(light["v2-elevation-raised"]).toBe(
      "0px 2px 4px 0px var(--v2-alpha-dark-4), 0px 1px 2px -1px var(--v2-alpha-dark-8), 0px 0px 0px 0.5px var(--v2-alpha-dark-12), 0px 0px 0px 0px var(--v2-alpha-dark-0)",
    )
  })

  test("defines every token as a non-empty string", () => {
    for (const [token, value] of Object.entries({ ...light, ...dark })) {
      expect(typeof value, token).toBe("string")
      expect(value.length, token).toBeGreaterThan(0)
    }
  })
})

describe("mergeV2Tokens", () => {
  test("applies later layers over earlier ones", () => {
    const merged = mergeV2Tokens(light, { "v2-background-bg-base": "#000000ff" })
    expect(merged["v2-background-bg-base"]).toBe("#000000ff")
    expect(merged["v2-text-text-accent"]).toBe(light["v2-text-text-accent"])
  })
})