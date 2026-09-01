import { describe, it, expect } from "bun:test"
import { writeRgb } from "../../src/component/bg-pulse-render"

describe("writeRgb", () => {
  it("writes r, g, b, and a into the buffer at the given offset", () => {
    const buffer = new Uint16Array(4)
    writeRgb(buffer, 0, { r: 10, g: 20, b: 30, a: 200 })
    expect(buffer[0]).toBe(10)
    expect(buffer[1]).toBe(20)
    expect(buffer[2]).toBe(30)
    expect(buffer[3]).toBe(200)
  })

  it("defaults alpha to 255 when not provided", () => {
    const buffer = new Uint16Array(4)
    writeRgb(buffer, 0, { r: 1, g: 2, b: 3 })
    expect(buffer[3]).toBe(255)
  })

  it("writes at a non-zero offset without disturbing preceding values", () => {
    const buffer = new Uint16Array(8)
    buffer[0] = 999
    writeRgb(buffer, 4, { r: 5, g: 6, b: 7, a: 8 })
    expect(buffer[0]).toBe(999)
    expect(buffer[4]).toBe(5)
    expect(buffer[5]).toBe(6)
    expect(buffer[6]).toBe(7)
    expect(buffer[7]).toBe(8)
  })
})
