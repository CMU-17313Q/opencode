import { describe, expect, test } from "bun:test"
import { ToolRuntime } from "../src/tool-runtime.js"
import {
  SandboxDate,
  SandboxMap,
  SandboxRegExp,
  SandboxSet,
  SandboxURL,
  SandboxURLSearchParams,
} from "../src/values.js"

// copyIn walks a value against the plain-data contract in two modes. These tests pin both modes
// directly (the rest of the suite reaches copyIn only indirectly, through CodeMode.execute), so
// the value-type dispatch tables stay covered:
//
// - Boundary (preserveSandboxValues false): sandbox/host value types serialize exactly as
//   JSON.stringify would - Date/URL become strings, everything else becomes {}.
// - Intra-sandbox checkpoint (preserveSandboxValues true): sandbox instances pass through as
//   leaves, and host instances are defensively wrapped into their sandbox counterparts.
const copyIn = (value: unknown, preserve = false) => ToolRuntime.copyIn(value, "val", preserve)

describe("copyIn - data leaves", () => {
  test("passes primitives through unchanged in both modes", () => {
    for (const preserve of [false, true]) {
      expect(copyIn({ s: "a", n: 1, b: true, z: null, u: undefined }, preserve)).toEqual({
        s: "a",
        n: 1,
        b: true,
        z: null,
        u: undefined,
      })
    }
  })

  // NaN/Infinity survive as in-sandbox intermediates so defensive guards can run; copyOut, not
  // copyIn, is what normalizes them to null on the way out.
  test("keeps non-finite numbers as-is", () => {
    const copied = copyIn({ a: NaN, b: Infinity, c: -Infinity }) as Record<string, number>
    expect(Number.isNaN(copied.a)).toBe(true)
    expect(copied.b).toBe(Infinity)
    expect(copied.c).toBe(-Infinity)
  })

  test("copies nested arrays and plain objects onto null-prototype objects", () => {
    const copied = copyIn({ a: [1, { b: [2, 3] }] })
    expect(copied).toEqual({ a: [1, { b: [2, 3] }] })
    expect(Object.getPrototypeOf(copied)).toBeNull()
  })
})

describe("copyIn - boundary serialization", () => {
  test("serializes Date and URL types to strings", () => {
    expect(copyIn(new Date(1700000000000))).toBe("2023-11-14T22:13:20.000Z")
    expect(copyIn(new SandboxDate(1700000000000))).toBe("2023-11-14T22:13:20.000Z")
    expect(copyIn(new URL("https://ex.com/p?q=1"))).toBe("https://ex.com/p?q=1")
    expect(copyIn(new SandboxURL(new URL("https://ex.com/")))).toBe("https://ex.com/")
  })

  test("serializes non-finite Dates to null", () => {
    expect(copyIn(new Date(NaN))).toBeNull()
    expect(copyIn(new SandboxDate(NaN))).toBeNull()
  })

  test("serializes types with no JSON form to an empty object", () => {
    const values = [
      /ab+c/gi,
      new Map([["k", 1]]),
      new Set([1]),
      new URLSearchParams("a=1"),
      new SandboxRegExp("x+", "g"),
      new SandboxMap(),
      new SandboxSet(),
      new SandboxURLSearchParams(new URLSearchParams("a=1")),
    ]
    for (const value of values) expect(copyIn(value)).toEqual({})
  })
})

describe("copyIn - intra-sandbox checkpoint", () => {
  test("passes sandbox value instances through by identity", () => {
    const values = [
      new SandboxDate(1700000000000),
      new SandboxRegExp("x+", "g"),
      new SandboxMap(),
      new SandboxSet(),
      new SandboxURL(new URL("https://ex.com/")),
      new SandboxURLSearchParams(new URLSearchParams("a=1")),
    ]
    for (const value of values) expect(copyIn(value, true)).toBe(value)
  })

  test("wraps a host Date and RegExp into sandbox counterparts", () => {
    const date = copyIn(new Date(1700000000000), true) as SandboxDate
    expect(date).toBeInstanceOf(SandboxDate)
    expect(date.time).toBe(1700000000000)

    const regexp = copyIn(/ab+c/gi, true) as SandboxRegExp
    expect(regexp).toBeInstanceOf(SandboxRegExp)
    expect(regexp.regex.source).toBe("ab+c")
    expect(regexp.regex.flags).toBe("gi")
  })

  test("wraps a host Map and copies its keys and values", () => {
    const wrapped = copyIn(
      new Map<unknown, unknown>([
        ["k", 1],
        ["j", { n: 2 }],
      ]),
      true,
    ) as SandboxMap
    expect(wrapped).toBeInstanceOf(SandboxMap)
    expect(wrapped.map.get("k")).toBe(1)
    expect(wrapped.map.get("j")).toEqual({ n: 2 })
  })

  test("wraps a host Set and copies its members", () => {
    const wrapped = copyIn(new Set([1, "two", { n: 3 }]), true) as SandboxSet
    expect(wrapped).toBeInstanceOf(SandboxSet)
    expect([...wrapped.set]).toEqual([1, "two", { n: 3 }])
  })

  test("wraps host URL and URLSearchParams", () => {
    const url = copyIn(new URL("https://ex.com/p?q=1"), true) as SandboxURL
    expect(url).toBeInstanceOf(SandboxURL)
    expect(url.url.href).toBe("https://ex.com/p?q=1")

    const params = copyIn(new URLSearchParams("a=1&b=2"), true) as SandboxURLSearchParams
    expect(params).toBeInstanceOf(SandboxURLSearchParams)
    expect(params.params.get("b")).toBe("2")
  })

  test("wraps host containers nested inside plain data", () => {
    const copied = copyIn({ m: new Map([["k", new Map([["n", 1]])]]) }, true) as { m: SandboxMap }
    const outer = copied.m
    expect(outer).toBeInstanceOf(SandboxMap)
    const inner = outer.map.get("k") as SandboxMap
    expect(inner).toBeInstanceOf(SandboxMap)
    expect(inner.map.get("n")).toBe(1)
  })
})

describe("copyIn - contract violations", () => {
  const rejects = (value: unknown, message: string, preserve = false) =>
    expect(() => copyIn(value, preserve)).toThrow(message)

  test("rejects circular values in both modes", () => {
    for (const preserve of [false, true]) {
      const circular: Record<string, unknown> = { x: 1 }
      circular.self = circular
      rejects(circular, "val contains a circular value.", preserve)
    }
  })

  test("rejects values deeper than the depth limit", () => {
    let deep: unknown = 1
    for (let i = 0; i < 40; i++) deep = { a: deep }
    rejects(deep, "val exceeds the maximum value depth of 32.")
  })

  test("accepts values just inside the depth limit", () => {
    let deep: unknown = 1
    for (let i = 0; i < 31; i++) deep = { a: deep }
    expect(() => copyIn(deep)).not.toThrow()
  })

  test("rejects blocked property names", () => {
    rejects(JSON.parse('{"__proto__":{"x":1}}'), "val contains blocked property '__proto__'.")
    rejects({ constructor: 1 }, "val contains blocked property 'constructor'.")
  })

  test("rejects non-plain objects", () => {
    class Custom {
      a = 1
    }
    rejects(new Custom(), "val must contain plain objects only.")
  })

  test("rejects non-data leaves", () => {
    rejects({ f: () => 1 }, "val must contain data only.")
    rejects({ s: Symbol("x") }, "val must contain data only.")
    rejects({ b: BigInt(5) }, "val must contain data only.")
  })
})
