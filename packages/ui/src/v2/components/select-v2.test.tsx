import { describe, expect, test } from "bun:test"
import { getSelectedValue } from "./select-v2-utils"

describe("getSelectedValue", () => {
  test("returns null when there is no selection", () => {
    expect(getSelectedValue(null)).toBe(null)
  })

  test("returns the selected value", () => {
    expect(getSelectedValue("apple")).toBe("apple")
  })

  test("returns the first value from an array", () => {
    expect(getSelectedValue(["apple", "banana"])).toBe("apple")
  })

  test("returns null for an empty array", () => {
    expect(getSelectedValue([])).toBe(null)
  })
})
