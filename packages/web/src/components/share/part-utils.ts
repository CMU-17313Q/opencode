// Converts nested objects/arrays into [path, value] pairs.
// E.g. {a:{b:{c:1}}, d:[{e:2}, 3]} => [["a.b.c",1], ["d[0].e",2], ["d[1]",3]]
export function flattenToolArgs(obj: unknown, prefix: string = ""): Array<[string, unknown]> {
  if (typeof obj !== "object" || obj === null) return []

  // Recurse into containers; emit a [path, value] pair for leaf (non-object) values.
  const walk = (path: string, value: unknown): Array<[string, unknown]> =>
    value !== null && typeof value === "object" ? flattenToolArgs(value, path) : [[path, value]]

  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(value)) return value.flatMap((item, index) => walk(`${path}[${index}]`, item))
    return walk(path, value)
  })
}
