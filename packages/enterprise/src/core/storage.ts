import { AwsClient } from "aws4fetch"
import { lazy } from "@opencode-ai/core/util/lazy"

export namespace Storage {
  export interface Adapter {
    read(path: string): Promise<string | undefined>
    write(path: string, value: string): Promise<void>
    remove(path: string): Promise<void>
    list(options?: { prefix?: string; limit?: number; after?: string; before?: string }): Promise<string[]>
  }

  type ListOptions = { prefix?: string; limit?: number; after?: string; before?: string }

  // --- module-level helpers (extracted from createAdapter) ---

  function assertOk(response: Response, label: string): void {
    if (!response.ok) throw new Error(`Failed to ${label}: ${response.status}`)
  }

  function parseKeys(xml: string): string[] {
    const keys: string[] = []
    const regex = /<Key>([^<]+)<\/Key>/g
    let match
    while ((match = regex.exec(xml)) !== null) {
      keys.push(match[1])
    }
    return keys
  }

  function readAt(client: AwsClient, base: string, path: string): Promise<string | undefined> {
    return client.fetch(`${base}/${path}`).then((response) => {
      if (response.status === 404) return undefined
      assertOk(response, `read ${path}`)
      return response.text()
    })
  }

  function writeAt(client: AwsClient, base: string, path: string, value: string): Promise<void> {
    return client
      .fetch(`${base}/${path}`, {
        method: "PUT",
        body: value,
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        assertOk(response, `write ${path}`)
      })
  }

  function removeAt(client: AwsClient, base: string, path: string): Promise<void> {
    return client
      .fetch(`${base}/${path}`, {
        method: "DELETE",
      })
      .then((response) => {
        assertOk(response, `remove ${path}`)
      })
  }

  function listAt(client: AwsClient, base: string, options?: ListOptions): Promise<string[]> {
    const prefix = options?.prefix || ""
    const params = new URLSearchParams({ "list-type": "2", prefix })
    if (options?.limit) params.set("max-keys", options.limit.toString())
    if (options?.after) {
      const afterPath = prefix + options.after + ".json"
      params.set("start-after", afterPath)
    }
    return client
      .fetch(`${base}?${params}`)
      .then(async (response) => {
        assertOk(response, `list ${prefix}`)
        const xml = await response.text()
        const keys = parseKeys(xml)
        if (options?.before) {
          const beforePath = prefix + options.before + ".json"
          return keys.filter((key) => key < beforePath)
        }
        return keys
      })
  }

  // --- adapter factory (now just wires the helpers) ---

  function createAdapter(client: AwsClient, endpoint: string, bucket: string): Adapter {
    const base = `${endpoint}/${bucket}`
    return {
      read: (path) => readAt(client, base, path),
      write: (path, value) => writeAt(client, base, path, value),
      remove: (path) => removeAt(client, base, path),
      list: (options) => listAt(client, base, options),
    }
  }

  // --- backend constructors (unchanged) ---

  function s3(): Adapter {
    const bucket = process.env.OPENCODE_STORAGE_BUCKET!
    const region = process.env.OPENCODE_STORAGE_REGION || "us-east-1"
    const client = new AwsClient({
      region,
      accessKeyId: process.env.OPENCODE_STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.OPENCODE_STORAGE_SECRET_ACCESS_KEY!,
    })
    return createAdapter(client, `https://s3.${region}.amazonaws.com`, bucket)
  }

  function r2(): Adapter {
    const accountId = process.env.OPENCODE_STORAGE_ACCOUNT_ID!
    const client = new AwsClient({
      accessKeyId: process.env.OPENCODE_STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.OPENCODE_STORAGE_SECRET_ACCESS_KEY!,
    })
    return createAdapter(client, `https://${accountId}.r2.cloudflarestorage.com`, process.env.OPENCODE_STORAGE_BUCKET!)
  }

  const adapter = lazy(() => {
    const type = process.env.OPENCODE_STORAGE_ADAPTER
    if (type === "r2") return r2()
    if (type === "s3") return s3()
    throw new Error("No storage adapter configured")
  })

  function resolve(key: string[]) {
    return key.join("/") + ".json"
  }

  // --- public API (signatures unchanged) ---

  /**
   * Build an adapter around an AwsClient. Exported so tests can drive
   * readAt/writeAt/removeAt/listAt/parseKeys/assertOk with a fake client,
   * no OPENCODE_STORAGE_* env or real bucket required.
   */
  export function forClient(client: AwsClient, endpoint: string, bucket: string): Adapter {
    return createAdapter(client, endpoint, bucket)
  }

  export async function read<T>(key: string[]) {
    const result = await adapter().read(resolve(key))
    if (!result) return undefined
    return JSON.parse(result) as T
  }

  export function write<T>(key: string[], value: T) {
    return adapter().write(resolve(key), JSON.stringify(value))
  }

  export function remove(key: string[]) {
    return adapter().remove(resolve(key))
  }

  export async function list(options?: { prefix?: string[]; limit?: number; after?: string; before?: string }) {
    const p = options?.prefix ? options.prefix.join("/") + (options.prefix.length ? "/" : "") : ""
    const result = await adapter().list({
      prefix: p,
      limit: options?.limit,
      after: options?.after,
      before: options?.before,
    })
    return result.map((x) => x.replace(/\.json$/, "").split("/"))
  }

  export async function update<T>(key: string[], fn: (draft: T) => void) {
    const val = await read<T>(key)
    if (!val) throw new Error("Not found")
    fn(val)
    await write(key, val)
    return val
  }
}
