import { describe, expect, test } from "bun:test"
import { flattenToolArgs } from "./part-utils"

describe("flattenToolArgs", () => {
  test("flattens nested objects and arrays (docstring example)", () => {
    expect(flattenToolArgs({ a: { b: { c: 1 } }, d: [{ e: 2 }, 3] })).toEqual([
      ["a.b.c", 1],
      ["d[0].e", 2],
      ["d[1]", 3],
    ])
  })

  test("keeps primitives and null as leaf values", () => {
    expect(flattenToolArgs({ x: 1, y: "hello", z: null, w: true })).toEqual([
      ["x", 1],
      ["y", "hello"],
      ["z", null],
      ["w", true],
    ])
  })

  test("returns an empty array for non-object input", () => {
    expect(flattenToolArgs(42)).toEqual([])
    expect(flattenToolArgs("str")).toEqual([])
    expect(flattenToolArgs(null)).toEqual([])
    expect(flattenToolArgs(undefined)).toEqual([])
  })

  test("handles empty objects and empty arrays", () => {
    expect(flattenToolArgs({})).toEqual([])
    expect(flattenToolArgs({ items: [] })).toEqual([])
  })

  test("indexes array elements with bracket paths", () => {
    expect(flattenToolArgs({ tags: ["a", "b"] })).toEqual([
      ["tags[0]", "a"],
      ["tags[1]", "b"],
    ])
  })
})
