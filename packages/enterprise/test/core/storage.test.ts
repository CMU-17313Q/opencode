import { describe, expect, test } from "bun:test"
import { Storage } from "../../src/core/storage"

// Fake AwsClient: records every fetch, returns queued responses in order.
function makeClient() {
  const calls: { url: string; init?: RequestInit }[] = []
  let queue: Response[] = []
  return {
    calls,
    respond(responses: (Response | (() => Response))[]) {
      queue = responses.map((r) => (typeof r === "function" ? r() : r))
    },
    fetch(url: string, init?: RequestInit): Promise<Response> {
      calls.push({ url, init })
      return Promise.resolve(queue.shift() ?? new Response("unexpected call", { status: 200 }))
    },
  }
}

function xml(keys: string[]) {
  return `<ListBucketResult>` + keys.map((k) => `<Key>${k}</Key>`).join("") + `</ListBucketResult>`
}

const endpoint = "https://s3.us-east-1.amazonaws.com"
const bucket = "test-bucket"

describe("core.storage (mock AwsClient, no bucket)", () => {
  test("read: 200 returns body text", async () => {
    const client = makeClient()
    client.respond([new Response("hello", { status: 200 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    expect(await adapter.read("a/b.json")).toBe("hello")
    expect(client.calls[0].url).toBe(`${endpoint}/${bucket}/a/b.json`)
  })

  test("read: 404 returns undefined", async () => {
    const client = makeClient()
    client.respond([new Response("", { status: 404 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    expect(await adapter.read("a/b.json")).toBeUndefined()
  })

  test("read: 500 throws (assertOk)", async () => {
    const client = makeClient()
    client.respond([new Response("boom", { status: 500 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    await expect(adapter.read("a/b.json")).rejects.toThrow(/500/)
  })

  test("write: PUTs JSON body with content-type, ok on 200", async () => {
    const client = makeClient()
    client.respond([new Response("", { status: 200 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    await adapter.write("a/b.json", '{"x":1}')
    const c = client.calls[0]
    expect(c.init?.method).toBe("PUT")
    expect(c.init?.body).toBe('{"x":1}')
    expect((c.init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  test("write: 500 throws (assertOk)", async () => {
    const client = makeClient()
    client.respond([new Response("boom", { status: 500 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    await expect(adapter.write("a/b.json", "{}")).rejects.toThrow(/500/)
  })

  test("remove: DELETEs, ok on 200", async () => {
    const client = makeClient()
    client.respond([new Response("", { status: 200 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    await adapter.remove("a/b.json")
    expect(client.calls[0].init?.method).toBe("DELETE")
  })

  test("remove: 404 throws (assertOk)", async () => {
    const client = makeClient()
    client.respond([new Response("", { status: 404 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    await expect(adapter.remove("a/b.json")).rejects.toThrow(/404/)
  })

  test("list: parses <Key> entries (parseKeys)", async () => {
    const client = makeClient()
    client.respond([new Response(xml(["p/u1.json", "p/u2.json", "p/u3.json"]), { status: 200 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    expect(await adapter.list({ prefix: "p" })).toEqual(["p/u1.json", "p/u2.json", "p/u3.json"])
    expect(client.calls[0].url).toContain("list-type=2")
  })

  test("list: before excludes keys >= beforePath (strict <)", async () => {
    const client = makeClient()
    client.respond([new Response(xml(["p/u1.json", "p/u2.json", "p/u3.json"]), { status: 200 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    expect(await adapter.list({ prefix: "p/", before: "u2" })).toEqual(["p/u1.json"])
  })
  

  test("list: 500 throws (assertOk)", async () => {
    const client = makeClient()
    client.respond([new Response("boom", { status: 500 })])
    const adapter = Storage.forClient(client as any, endpoint, bucket)
    await expect(adapter.list({ prefix: "p" })).rejects.toThrow(/500/)
  })
})
