import { describe, expect, test } from "bun:test"
import { setVersion } from "./upgrade-opentui"

describe("setVersion", () => {
  test("passes through catalog: references unchanged", () => {
    expect(setVersion("catalog:", "dep", "1.2.3", false)).toBe("catalog:")
    expect(setVersion("catalog:", "peer", "1.2.3", false)).toBe("catalog:")
  })

  test("passes through workspace: references unchanged", () => {
    expect(setVersion("workspace:*", "dep", "1.2.3", false)).toBe("workspace:*")
    expect(setVersion("workspace:^", "peer", "1.2.3", false)).toBe("workspace:^")
  })

  test("returns the bare version when snapshot is set, regardless of prefix", () => {
    expect(setVersion("^1.0.0", "dep", "1.2.3", true)).toBe("1.2.3")
    expect(setVersion("~1.0.0", "peer", "1.2.3", true)).toBe("1.2.3")
    expect(setVersion(">=1.0.0", "dep", "1.2.3", true)).toBe("1.2.3")
  })

  test("always prefixes peer dependencies with >=", () => {
    expect(setVersion("1.0.0", "peer", "1.2.3", false)).toBe(">=1.2.3")
    expect(setVersion("^1.0.0", "peer", "1.2.3", false)).toBe(">=1.2.3")
    expect(setVersion("~1.0.0", "peer", "1.2.3", false)).toBe(">=1.2.3")
  })

  test("preserves a >= prefix for dep versions", () => {
    expect(setVersion(">=1.0.0", "dep", "1.2.3", false)).toBe(">=1.2.3")
  })

  test("preserves a ^ prefix for dep versions", () => {
    expect(setVersion("^1.0.0", "dep", "1.2.3", false)).toBe("^1.2.3")
  })

  test("preserves a ~ prefix for dep versions", () => {
    expect(setVersion("~1.0.0", "dep", "1.2.3", false)).toBe("~1.2.3")
  })

  test("uses the bare version when the dep has no recognized prefix", () => {
    expect(setVersion("1.0.0", "dep", "1.2.3", false)).toBe("1.2.3")
  })
})