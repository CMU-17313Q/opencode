import { describe, expect, test } from "bun:test"
import { createFrames } from "../../src/ui/spinner"

describe("ui.spinner", () => {
  test("creates the expected bidirectional scanner frames", () => {
    expect(createFrames({ width: 4, holdStart: 2, holdEnd: 2 })).toEqual([
      "⬥···",
      "◆⬥··",
      "⬩◆⬥·",
      "⬪⬩◆⬥",
      "⬪⬩◆⬥",
      "⬪⬪⬩◆",
      "··⬥◆",
      "·⬥◆⬩",
      "⬥◆⬩⬪",
      "⬥◆⬩⬪",
      "◆⬩⬪⬪",
    ])
  })
})
