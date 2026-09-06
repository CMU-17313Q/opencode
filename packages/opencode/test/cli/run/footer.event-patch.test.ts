import { describe, expect, test } from "bun:test"
import { eventPatch } from "@/cli/cmd/run/footer"
import type { FooterEvent, FooterPatch } from "@/cli/cmd/run/types"

describe("run footer eventPatch", () => {
  test("maps queue events to a queue patch", () => {
    expect(eventPatch({ type: "queue", queue: 3 })).toEqual({ queue: 3 })
  })

  test("maps first events to a first patch", () => {
    expect(eventPatch({ type: "first", first: true })).toEqual({ first: true })
    expect(eventPatch({ type: "first", first: false })).toEqual({ first: false })
  })

  test("maps model events to a model patch", () => {
    expect(eventPatch({ type: "model", model: "anthropic/claude" })).toEqual({
      model: "anthropic/claude",
    })
  })

  test("turn.send resets interrupt/exit and enters running", () => {
    expect(eventPatch({ type: "turn.send", queue: 2 })).toEqual({
      phase: "running",
      status: "sending prompt",
      queue: 2,
      interrupt: 0,
      exit: 0,
    })
  })

  test("turn.wait reports waiting while running", () => {
    expect(eventPatch({ type: "turn.wait" })).toEqual({
      phase: "running",
      status: "waiting for assistant",
    })
  })

  test("turn.idle clears status and returns to idle", () => {
    expect(eventPatch({ type: "turn.idle", queue: 0 })).toEqual({
      phase: "idle",
      status: "",
      queue: 0,
    })
  })

  test("stream.patch passes the embedded patch through unchanged", () => {
    const patch: FooterPatch = { usage: "42%", exit: 1 }
    expect(eventPatch({ type: "stream.patch", patch })).toBe(patch)
  })

  test("returns undefined for events it does not patch", () => {
    const unhandled: FooterEvent[] = [
      { type: "turn.duration", duration: "1s" },
      { type: "models", providers: [] },
      { type: "variants", variants: [], current: undefined },
      { type: "queued.prompts", prompts: [] },
      { type: "catalog", agents: [], resources: [] },
    ]
    for (const event of unhandled) {
      expect(eventPatch(event)).toBeUndefined()
    }
  })
})
