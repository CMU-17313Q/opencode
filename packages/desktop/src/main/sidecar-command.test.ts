import { describe, expect, test } from "bun:test"
import { parseCommand } from "./sidecar-command"


describe("parseCommand", () => {
  const valid = {
    type: "start",
    hostname: "127.0.0.1",
    port: 4096,
    password: "secret",
    userDataPath: "/tmp/data",
  }

  test("parses a valid start command", () => {
    expect(parseCommand(valid)).toEqual(valid)
  })

  test("parses a stop command", () => {
    expect(parseCommand({ type: "stop" })).toEqual({ type: "stop" })
  })

  test("ignores extra fields on a start command", () => {
    expect(parseCommand({ ...valid, extra: "nope" })).toEqual(valid)
  })

  test("rejects non-object values", () => {
    expect(parseCommand(undefined)).toBeUndefined()
    expect(parseCommand(null)).toBeUndefined()
    expect(parseCommand("start")).toBeUndefined()
    expect(parseCommand(42)).toBeUndefined()
  })

  test("rejects unknown command types", () => {
    expect(parseCommand({ type: "restart" })).toBeUndefined()
    expect(parseCommand({})).toBeUndefined()
  })

  test("rejects a start command with a missing field", () => {
    for (const key of ["hostname", "port", "password", "userDataPath"]) {
      const { [key]: _, ...partial } = valid as Record<string, unknown>
      expect(parseCommand(partial)).toBeUndefined()
    }
  })

  test("rejects a start command with wrong field types", () => {
    expect(parseCommand({ ...valid, port: "4096" })).toBeUndefined()
    expect(parseCommand({ ...valid, hostname: 123 })).toBeUndefined()
    expect(parseCommand({ ...valid, password: null })).toBeUndefined()
    expect(parseCommand({ ...valid, userDataPath: [] })).toBeUndefined()
  })
})