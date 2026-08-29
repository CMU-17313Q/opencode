import { describe, expect, test } from "bun:test"
import { fitOklch, oklchToRgb } from "./color"

describe("fitOklch", () => {
  test("returns an already in-gamut color unchanged", () => {
    const input = { l: 0.5, c: 0, h: 30 }
    const result = fitOklch(input)

    expect(result).toEqual({ l: 0.5, c: 0, h: 30 })
  })

  test("reduces chroma until an out-of-gamut color fits inside sRGB", () => {
    const input = { l: 0.5, c: 1, h: 30 }
    const result = fitOklch(input)

    // The fix should never increase chroma, and the result must actually render in-gamut.
    expect(result.c).toBeLessThanOrEqual(input.c)

    const { r, g, b } = oklchToRgb(result)
    for (const channel of [r, g, b]) {
      expect(channel).toBeGreaterThanOrEqual(0)
      expect(channel).toBeLessThanOrEqual(1)
    }
  })
})