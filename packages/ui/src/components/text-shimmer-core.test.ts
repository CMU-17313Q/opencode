import { describe, expect, test } from "bun:test"
import { buildTextShimmerStyle } from "./text-shimmer-core"
import { TextShimmerConfig } from "./text-shimmer"
import { TextShimmerV2Config } from "../v2/components/text-shimmer-v2"

describe("buildTextShimmerStyle", () => {
  test("swap/index vars are mapped", () => {
    expect(buildTextShimmerStyle("--text-shimmer-swap",
      "--text-shimmer-index", 220, 5)).toEqual({
        "--text-shimmer-swap": "220ms",
        "--text-shimmer-index": "5",
    })
  })
  test("swap/index vars are mapped for v2", () => {
    expect(buildTextShimmerStyle("--_swap", "--_index", 220, 0)).toEqual({
        "--_swap": "220ms",
        "--_index": "0",
    })
  })
  test("helper keys match config", () => {
    expect(Object.keys(buildTextShimmerStyle(TextShimmerConfig.swapVar,
      TextShimmerConfig.indexVar, 220, 1))).toEqual(
        [TextShimmerConfig.swapVar, TextShimmerConfig.indexVar]
    )
    expect(Object.keys(buildTextShimmerStyle(TextShimmerV2Config.swapVar,
      TextShimmerV2Config.indexVar, 220, 1))).toEqual(
        [TextShimmerV2Config.swapVar, TextShimmerV2Config.indexVar]
    )
  })
})

describe("Configurations of shimmers", () => {
  test("original selectors of v1 is kept", () => {
    expect(TextShimmerConfig).toEqual({
      component: "text-shimmer",
      charSlot: "text-shimmer-char",
      baseSlot: "text-shimmer-char-base",
      shimmerSlot: "text-shimmer-char-shimmer",
      swapVar: "--text-shimmer-swap",
      indexVar: "--text-shimmer-index",
    })
  })
  test("original selectos of v2 is kept", () => {
    expect(TextShimmerV2Config).toEqual({
      component: "text-shimmer-v2",
      charSlot: "text-shimmer-v2-char",
      baseSlot: "text-shimmer-v2-base",
      shimmerSlot: "text-shimmer-v2-shimmer",
      swapVar: "--_swap",
      indexVar: "--_index",
    })
  })
  test("v1 & v2 are different", () => {
    expect(TextShimmerConfig.component).not.toBe(TextShimmerV2Config.component)
    expect(TextShimmerConfig.charSlot).not.toBe(TextShimmerV2Config.charSlot)
  })
})
