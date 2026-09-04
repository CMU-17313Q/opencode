import { describe, expect, test } from "bun:test"
import { cliErrorMessage, errorData, errorFormat, errorMessage } from "../../src/util/error"

describe("util.error", () => {
  test("formats native Error instances", () => {
    const err = new Error("boom")
    expect(errorMessage(err)).toBe("boom")
    expect(errorFormat(err)).toContain("boom")

    const data = errorData(err)
    expect(data.type).toBe("Error")
    expect(data.message).toBe("boom")
    expect(String(data.formatted)).toContain("boom")
  })

  test("extracts message from record-like values", () => {
    const err = { message: "bad input", code: "E_BAD" }
    expect(errorMessage(err)).toBe("bad input")

    const data = errorData(err)
    expect(data.message).toBe("bad input")
    expect(data.code).toBe("E_BAD")
  })

  test("never returns bare {} for opaque object errors", () => {
    expect(errorFormat({})).not.toBe("{}")
    expect(errorFormat({})).toContain("no message")

    class OpaqueError {}
    const opaque = new OpaqueError()
    Object.defineProperty(opaque, "secret", { value: "hidden", enumerable: false })
    expect(errorFormat(opaque)).not.toBe("{}")
    expect(errorFormat(opaque)).toContain("OpaqueError")
  })

  test("handles opaque throwables with custom toString", () => {
    const err = {
      toString() {
        return "ResolveMessage: Cannot resolve module"
      },
    }

    expect(errorMessage(err)).toBe("ResolveMessage: Cannot resolve module")

    const data = errorData(err)
    expect(data.message).toBe("ResolveMessage: Cannot resolve module")
    expect(String(data.formatted)).toContain("ResolveMessage")
  })

  // Test cliErrorMessage
  // written by AI

  test("formats native Error instances with a matching cause.body", () => {
    const err = new Error("wrapper")
    ;(err as any).cause = { body: { _tag: "CliError", message: "inner failure", exitCode: 1 } }
    expect(cliErrorMessage(err)).toBe("inner failure")
  })

  test("returns undefined for Errors without a usable cause", () => {
    expect(cliErrorMessage(new Error("plain"))).toBeUndefined()

    const stringCause = new Error("wrapper")
    ;(stringCause as any).cause = "just a string"
    expect(cliErrorMessage(stringCause)).toBeUndefined()

    const noBody = new Error("wrapper")
    ;(noBody as any).cause = { something: "else" }
    expect(cliErrorMessage(noBody)).toBeUndefined()
  })

  test("propagates empty-string results from cause.body", () => {
    const err = new Error("wrapper")
    ;(err as any).cause = { body: { _tag: "UICancelledError" } }
    expect(cliErrorMessage(err)).toBeUndefined()
  })

  test("extracts message from tagged errors and sets exitCode for CliError", () => {
    const prev = process.exitCode
    try {
      const err = { _tag: "CliError", message: "boom", exitCode: 42 }
      expect(cliErrorMessage(err)).toBe("boom")
      expect(process.exitCode).toBe(42)

      const zero = { _tag: "CliError", message: "ok-ish", exitCode: 0 }
      cliErrorMessage(zero)
      expect(process.exitCode).toBe(0)
    } finally {
      process.exitCode = prev
    }
  })

  test("falls back to empty string when tagged error has no message field", () => {
    expect(cliErrorMessage({ _tag: "AccountServiceError" })).toBe("")
  })

  test("formats model-not-found errors from name+data envelopes", () => {
    const err = {
      name: "ProviderModelNotFoundError",
      data: {
        providerID: "anthropic",
        modelID: "cluade-4",
        suggestions: ["claude-4", "claude-4-sonnet", 42, null],
      },
    }
    expect(cliErrorMessage(err)).toBe(
      [
        "Model not found: anthropic/cluade-4",
        "Did you mean: claude-4, claude-4-sonnet",
        "Try: `opencode models` to list available models",
        "Or check your config (opencode.json) provider/model names",
      ].join("\n"),
    )
  })

  test("also supports the _tag shape for config errors", () => {
    const err = {
      _tag: "ProviderInitError",
      providerID: "openai",
    }
    expect(cliErrorMessage(err)).toBe(
      'Failed to initialize provider "openai". Check credentials and configuration.',
    )
  })

  test("omits suggestion line when suggestions are missing or malformed", () => {
    const err = {
      name: "ProviderModelNotFoundError",
      data: { providerID: "openai", modelID: "gpt-x", suggestions: "not-an-array" },
    }
    const result = cliErrorMessage(err)!
    expect(result).toContain("Model not found: openai/gpt-x")
    expect(result).not.toContain("Did you mean")
  })

  test("formats config json errors, with and without parse detail", () => {
    const bare = { name: "ConfigJsonError", data: { path: "/home/user/.config/opencode.json" } }
    expect(cliErrorMessage(bare)).toBe(
      "Config file at /home/user/.config/opencode.json is not valid JSON(C)",
    )

    const detailed = { name: "ConfigJsonError", data: { path: "opencode.json", message: "Unexpected token }" } }
    expect(cliErrorMessage(detailed)).toBe(
      "Config file at opencode.json is not valid JSON(C): Unexpected token }",
    )
  })

  test("formats directory typo errors", () => {
    const err = {
      name: "ConfigDirectoryTypoError",
      data: { dir: "cmmands", path: "/project/.opencode", suggestion: "commands" },
    }
    expect(cliErrorMessage(err)).toBe(
      'Directory "cmmands" in /project/.opencode is not valid. Rename the directory to "commands" or remove it. This is a common typo.',
    )
  })

  test("formats frontmatter errors from their message field", () => {
    expect(cliErrorMessage({ name: "ConfigFrontmatterError", data: { message: "missing title" } })).toBe("missing title")
    expect(cliErrorMessage({ name: "ConfigFrontmatterError" })).toBeUndefined()
  })

  test("formats invalid-config errors with path, message, and filtered issues", () => {
    const err = {
      name: "ConfigInvalidError",
      data: {
        path: "agents",
        message: "validation failed",
        issues: [
          { message: "missing field", path: ["agent", "model"] },
          { message: 123, path: ["x"] },
          { message: "bad path", path: "not-array" },
          "not-a-record",
        ],
      },
    }
    expect(cliErrorMessage(err)).toBe(
      ["Configuration is invalid at agents: validation failed", "↳ missing field agent.model"].join("\n"),
    )
  })

  test("uses generic header and omits 'at' when path is 'config'", () => {
    const err = { name: "ConfigInvalidError", data: { path: "config", message: "broken" } }
    const result = cliErrorMessage(err)!
    expect(result.startsWith("Configuration is invalid: broken")).toBe(true)
    expect(result).not.toContain(" at ")
  })

  test("formats UICancelledError as an empty string, via _tag or name", () => {
    expect(cliErrorMessage({ _tag: "UICancelledError" })).toBe("")
    expect(cliErrorMessage({ name: "UICancelledError" })).toBe("")
  })

  test("formats MCP failures with the server name", () => {
    const err = { name: "MCPFailed", data: { name: "my-server" } }
    expect(cliErrorMessage(err)).toBe(
      'MCP server "my-server" failed. Note, opencode does not support MCP authentication yet.',
    )
  })

  test("handles MCP failures with missing or malformed data", () => {
    expect(cliErrorMessage({ name: "MCPFailed" })).toContain('MCP server "undefined" failed')
    expect(cliErrorMessage({ _tag: "MCPFailed", data: "not-a-record" })).toContain('MCP server "undefined" failed')
  })

  test("returns undefined for unrecognized inputs", () => {
    expect(cliErrorMessage(undefined)).toBeUndefined()
    expect(cliErrorMessage(null)).toBeUndefined()
    expect(cliErrorMessage(42)).toBeUndefined()
    expect(cliErrorMessage("plain string")).toBeUndefined()
    expect(cliErrorMessage({ name: "SomeUnknownError", message: "hi" })).toBeUndefined()
  })
})
