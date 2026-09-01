import { describe, expect, test } from "bun:test"
import { shouldDropBlock } from "./tooltip-v2-utils"
describe("shouldDropBlock", () => {
  test("drops the block when tooltip is not expanded, hovered, or focused", () => {
    expect(shouldDropBlock(false, false, false)).toBe(true)
  })

  test("keeps the block while expanded", () => {
    expect(shouldDropBlock(true, false, false)).toBe(false)
  })

  test("keeps the block while hovered", () => {
    expect(shouldDropBlock(false, true, false)).toBe(false)
  })

  test("keeps the block while focus is inside", () => {
    expect(shouldDropBlock(false, false, true)).toBe(false)
  })
})