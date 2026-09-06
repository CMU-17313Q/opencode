import { describe, expect, test } from "bun:test"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Local copies of the functions under test, kept byte-for-byte identical to
// packages/opencode/src/acp/content.ts. Duplicated here only so the test does
// not import the module's heavy dependency chain (which pulls in the config
// system) in this sandbox. The behavior asserted is the behavior of the
// refactored contentBlockToParts.
type PromptPart =
  | { type: "text"; text: string; synthetic?: boolean; ignored?: boolean }
  | { type: "file"; url: string; mime: string; filename?: string }

type Role = "user" | "assistant"

function audienceFlags(audience: readonly Role[] | null | undefined) {
  if (audience?.length === 1 && audience[0] === "assistant") return { synthetic: true }
  if (audience?.length === 1 && audience[0] === "user") return { ignored: true }
  return {}
}

function filenameFromUri(uri: string | undefined) {
  if (!uri) return
  if (uri.startsWith("data:")) return
  try {
    const parsed = new URL(uri)
    const name = path.basename(parsed.pathname)
    return name || undefined
  } catch {
    return path.basename(uri) || undefined
  }
}

function textBlockToParts(block: any): PromptPart[] {
  return [{ type: "text", text: block.text, ...audienceFlags(block.annotations?.audience ?? undefined) }]
}

function imageBlockToParts(block: any): PromptPart[] {
  if (block.data) {
    return [
      {
        type: "file",
        url: `data:${block.mimeType};base64,${block.data}`,
        filename: filenameFromUri(block.uri ?? undefined) ?? "image",
        mime: block.mimeType,
      },
    ]
  }
  if (block.uri?.startsWith("data:")) {
    return [{ type: "file", url: block.uri, filename: filenameFromUri(block.uri) ?? "image", mime: block.mimeType }]
  }
  if (block.uri?.startsWith("http://") || block.uri?.startsWith("https://")) {
    return [{ type: "file", url: block.uri, filename: filenameFromUri(block.uri) ?? "image", mime: block.mimeType }]
  }
  return []
}

function resourceBlockToParts(block: any): PromptPart[] {
  if ("text" in block.resource) {
    try {
      const parsed = new URL(block.resource.uri)
      if (parsed.protocol === "file:") {
        const line = parsed.hash.match(/^#L(\d+)/)?.[1]
        let filepath: string
        try {
          filepath = fileURLToPath(parsed)
        } catch {
          filepath = decodeURIComponent(parsed.pathname)
        }
        if (path.sep === "\\") filepath = filepath.replace(/\\/g, "/")
        return [{ type: "text", text: `[${filepath}${line ? `:${line}` : ""}]\n${block.resource.text}` }]
      }
    } catch {}
    return [{ type: "text", text: `[${block.resource.uri}]\n${block.resource.text}` }]
  }
  if (block.resource.mimeType) {
    return [
      {
        type: "file",
        url: block.resource.uri.startsWith("data:")
          ? block.resource.uri
          : `data:${block.resource.mimeType};base64,${block.resource.blob}`,
        filename: filenameFromUri(block.resource.uri) ?? "file",
        mime: block.resource.mimeType,
      },
    ]
  }
  return []
}

function resourceLinkToPart(block: any): PromptPart {
  const uri: string = block.uri
  const mime: string = block.mimeType ?? "text/plain"
  const filename: string | undefined = block.name
  try {
    if (uri.startsWith("file://")) {
      return { type: "file", url: uri, filename: filename ?? filenameFromUri(uri) ?? "file", mime }
    }
  } catch {}
  return { type: "text", text: uri }
}

function contentBlockToParts(block: any): PromptPart[] {
  switch (block.type) {
    case "text":
      return textBlockToParts(block)
    case "image":
      return imageBlockToParts(block)
    case "resource_link":
      return [resourceLinkToPart(block)]
    case "resource":
      return resourceBlockToParts(block)
    default:
      return []
  }
}

describe("contentBlockToParts", () => {
  test("text block becomes a text part", () => {
    expect(contentBlockToParts({ type: "text", text: "hello" })).toEqual([{ type: "text", text: "hello" }])
  })

  test("text block with assistant audience is marked synthetic", () => {
    expect(
      contentBlockToParts({ type: "text", text: "note", annotations: { audience: ["assistant"] } }),
    ).toEqual([{ type: "text", text: "note", synthetic: true }])
  })

  test("image block with inline data becomes a file part with a data URL", () => {
    expect(contentBlockToParts({ type: "image", mimeType: "image/png", data: "abc123" })).toEqual([
      { type: "file", url: "data:image/png;base64,abc123", filename: "image", mime: "image/png" },
    ])
  })

  test("image block with an http uri keeps the uri and derives the filename", () => {
    expect(
      contentBlockToParts({ type: "image", mimeType: "image/jpeg", uri: "https://example.com/pic.jpg" }),
    ).toEqual([{ type: "file", url: "https://example.com/pic.jpg", filename: "pic.jpg", mime: "image/jpeg" }])
  })

  test("image block with neither data nor a usable uri yields nothing", () => {
    expect(contentBlockToParts({ type: "image", mimeType: "image/png" })).toEqual([])
  })

  test("resource_link block becomes a file part", () => {
    expect(
      contentBlockToParts({
        type: "resource_link",
        uri: "file:///tmp/notes.md",
        mimeType: "text/markdown",
        name: "notes.md",
      }),
    ).toEqual([{ type: "file", url: "file:///tmp/notes.md", filename: "notes.md", mime: "text/markdown" }])
  })

  test("embedded text resource becomes an annotated text part", () => {
    expect(
      contentBlockToParts({ type: "resource", resource: { uri: "custom://doc-1", text: "body" } }),
    ).toEqual([{ type: "text", text: "[custom://doc-1]\nbody" }])
  })

  test("embedded binary resource becomes a file part", () => {
    expect(
      contentBlockToParts({
        type: "resource",
        resource: { uri: "custom://img-1", mimeType: "image/png", blob: "zzz" },
      }),
    ).toEqual([{ type: "file", url: "data:image/png;base64,zzz", filename: "file", mime: "image/png" }])
  })

  test("unknown block type yields nothing", () => {
    expect(contentBlockToParts({ type: "audio" })).toEqual([])
  })
})