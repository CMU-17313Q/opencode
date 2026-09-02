import { describe, expect, test } from "bun:test"
import type { HexColor, ThemeVariant } from "./types"
import {
  contentTone,
  contrastRatio,
  hueDistance,
  modifiedDiffTone,
  readableTextOn,
  relativeLuminance,
  resolveThemeVariant,
} from "./resolve"

const seeds: ThemeVariant = {
  seeds: {
    neutral: "#808080" as HexColor,
    primary: "#3b7dd8" as HexColor,
    success: "#3d9a57" as HexColor,
    warning: "#d68c27" as HexColor,
    error: "#d13438" as HexColor,
    info: "#0092a8" as HexColor,
    interactive: "#3b7dd8" as HexColor,
    diffAdd: "#3d9a57" as HexColor,
    diffDelete: "#d13438" as HexColor,
  },
}

const palette: ThemeVariant = {
  palette: {
    neutral: "#808080" as HexColor,
    ink: "#1a1a1a" as HexColor,
    primary: "#3b7dd8" as HexColor,
    success: "#3d9a57" as HexColor,
    warning: "#d68c27" as HexColor,
    error: "#d13438" as HexColor,
    info: "#0092a8" as HexColor,
  },
}

describe("relativeLuminance", () => {
  test("white is brighter than black", () => {
    expect(relativeLuminance("#ffffff" as HexColor)).toBeGreaterThan(relativeLuminance("#000000" as HexColor))
  })

  test("stays within the 0..1 range", () => {
    const value = relativeLuminance("#3b7dd8" as HexColor)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(1)
  })
})

describe("contrastRatio", () => {
  test("black on white is the maximum 21:1", () => {
    expect(contrastRatio("#000000" as HexColor, "#ffffff" as HexColor)).toBeCloseTo(21, 1)
  })

  test("a color against itself is 1:1", () => {
    expect(contrastRatio("#3b7dd8" as HexColor, "#3b7dd8" as HexColor)).toBeCloseTo(1, 5)
  })

  test("argument order does not change the ratio", () => {
    const a = "#000000" as HexColor
    const b = "#ffffff" as HexColor
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
  })
})

describe("readableTextOn", () => {
  test("picks black text on a light fill", () => {
    expect(readableTextOn("#ffffff" as HexColor)).toBe("#000000")
  })

  test("picks white text on a dark fill", () => {
    expect(readableTextOn("#000000" as HexColor)).toBe("#ffffff")
  })
})

describe("hueDistance", () => {
  test("identical hues are zero apart", () => {
    expect(hueDistance(120, 120)).toBe(0)
  })

  test("wraps around the 360 degree boundary", () => {
    expect(hueDistance(350, 10)).toBeCloseTo(20, 5)
  })

  test("opposite hues are 180 apart", () => {
    expect(hueDistance(0, 180)).toBeCloseTo(180, 5)
  })

  test("is symmetric", () => {
    expect(hueDistance(30, 200)).toBeCloseTo(hueDistance(200, 30), 5)
  })
})

describe("contentTone", () => {
  test("returns a hex color", () => {
    const scale = Array(12).fill("#3d9a57") as HexColor[]
    expect(contentTone("#3d9a57" as HexColor, scale, false)).toMatch(/^#/)
  })

  test("light and dark modes produce different tones", () => {
    const scale = Array(12).fill("#3d9a57") as HexColor[]
    const light = contentTone("#3d9a57" as HexColor, scale, false)
    const dark = contentTone("#3d9a57" as HexColor, scale, true)
    expect(light).not.toBe(dark)
  })
})

describe("modifiedDiffTone", () => {
  const scale = Array(12).fill("#d68c27") as HexColor[]

  test("non-compact themes use the fixed light fallback", () => {
    const colors = { compact: false, warning: "#d68c27", error: "#d13438" } as never
    expect(modifiedDiffTone(colors, scale, false)).toBe("#FF8C00")
  })

  test("non-compact themes use the fixed dark fallback", () => {
    const colors = { compact: false, warning: "#d68c27", error: "#d13438" } as never
    expect(modifiedDiffTone(colors, scale, true)).toBe("#ffba92")
  })

  test("compact themes fall back when warning and delete hues are close", () => {
    const colors = { compact: true, warning: "#d13438", error: "#d13438" } as never
    expect(modifiedDiffTone(colors, scale, false)).toBe("#FF8C00")
  })
})

describe("resolveThemeVariant", () => {
  test("resolves a seeds-based variant in light mode", () => {
    const tokens = resolveThemeVariant(seeds, false)
    expect(tokens["background-base"]).toBeDefined()
    expect(tokens["text-base"]).toBeDefined()
    expect(tokens["text-stronger"]).toBe(tokens["text-strong"])
  })

  test("resolves a seeds-based variant in dark mode", () => {
    const tokens = resolveThemeVariant(seeds, true)
    expect(tokens["background-base"]).toBeDefined()
    expect(Object.keys(tokens).length).toBeGreaterThan(100)
  })

  test("light and dark variants differ", () => {
    expect(resolveThemeVariant(seeds, false)["background-base"]).not.toBe(
      resolveThemeVariant(seeds, true)["background-base"],
    )
  })

  test("resolves a palette-based variant", () => {
    const tokens = resolveThemeVariant(palette, false)
    expect(tokens["markdown-text"]).toBe(tokens["text-base"])
  })

  test("text tokens on brand surfaces are readable black or white", () => {
    const tokens = resolveThemeVariant(seeds, false)
    expect(["#000000", "#ffffff"]).toContain(tokens["text-on-brand-base"])
  })

  test("overrides replace generated tokens", () => {
    const tokens = resolveThemeVariant({ ...seeds, overrides: { "background-base": "#123456" } }, false)
    expect(tokens["background-base"]).toBe("#123456")
  })
})