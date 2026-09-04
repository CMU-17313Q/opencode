export function getSelectedValue<T>(next: T | T[] | null): T | null {
  if (next == null) return null
  if (Array.isArray(next)) return next[0] ?? null
  return next
}
