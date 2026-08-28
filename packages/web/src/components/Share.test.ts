import { describe, expect, test } from "bun:test"
import { getStatusText } from "./Share"

const messages = {
  status_connected_waiting: "Connected",
  status_connecting: "Connecting",
  status_disconnected: "Disconnected",
  status_reconnecting: "Reconnecting",
  status_error: "Error",
  status_unknown: "Unknown",
}

describe("getStatusText", () => {
  test("returns the correct message for connection statuses", () => {
    expect(getStatusText(["connected"], messages)).toBe("Connected")
    expect(getStatusText(["connecting"], messages)).toBe("Connecting")
    expect(getStatusText(["disconnected"], messages)).toBe("Disconnected")
    expect(getStatusText(["reconnecting"], messages)).toBe("Reconnecting")
  })

  test("uses a supplied error message", () => {
    expect(getStatusText(["error", "Custom error"], messages)).toBe("Custom error")
  })

  test("falls back to the default error message", () => {
    expect(getStatusText(["error"], messages)).toBe("Error")
  })
})