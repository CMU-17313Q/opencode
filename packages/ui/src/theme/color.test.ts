import { describe, expect, test } from "bun:test"
import { fitOklch, oklchToRgb } from "./color"

describe("fitOklch", () => {
  test("keeps an in-gamut color unchanged", () => {
    const color = { l: 0.5, c: 0, h: 0 }

    expect(fitOklch(color)).toEqual(color)
  })

  test("reduces an out-of-gamut color until its RGB values are in gamut", () => {
    const result = fitOklch({ l: 0.5, c: 0.5, h: 0 })
    const rgb = oklchToRgb(result)

    expect(result.c).toBeLessThan(0.5)
    expect(Math.min(rgb.r, rgb.g, rgb.b)).toBeGreaterThanOrEqual(0)
    expect(Math.max(rgb.r, rgb.g, rgb.b)).toBeLessThanOrEqual(1)
  })
})