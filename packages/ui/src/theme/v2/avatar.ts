import type { V2ColorValue } from "../types"

/** Fixed project avatar colors (OC-2); theme-independent like v1 `avatar-background-*`. */
export const V2_AVATAR_FG = "#ffffffff"

type AvatarColor = readonly [name: string, background: V2ColorValue, border: V2ColorValue]

function createAvatarTokens(colors: readonly AvatarColor[]): Record<string, V2ColorValue> {
  const tokens: Record<string, V2ColorValue> = {
    "v2-avatar-fg": V2_AVATAR_FG,
  }

  for (const [name, background, border] of colors) {
    tokens[`v2-avatar-bg-${name}`] = background
    tokens[`v2-avatar-border-${name}`] = border
  }

  return tokens
}

export const V2_AVATAR_LIGHT = createAvatarTokens([
  ["orange", "#ee7330ff", "#d16427ff"],
  ["yellow", "#e7af36ff", "#cb9f34ff"],
  ["cyan", "#0096b8ff", "#007d9bff"],
  ["green", "#2eaf5aff", "#198b43ff"],
  ["red", "#d92e3cff", "#b82d35ff"],
  ["pink", "#e4429eff", "#c83d8bff"],
  ["blue", "#3250dfff", "#2c47c8ff"],
  ["purple", "#623be2ff", "#5230c2ff"],
  ["gray", "#5c5c5cff", "#3a3a3aff"],
] as const)

export const V2_AVATAR_DARK = createAvatarTokens([
  ["orange", "#723d22ff", "#ff8648ff"],
  ["yellow", "#68552bff", "#e7af36ff"],
  ["cyan", "#005a6eff", "#0096b8ff"],
  ["green", "#196130ff", "#49c970ff"],
  ["red", "#7a1f23ff", "#d92e3cff"],
  ["pink", "#8c2d61ff", "#e4429eff"],
  ["blue", "#263fa9ff", "#7698fdff"],
  ["purple", "#361f83ff", "#7152f4ff"],
  ["gray", "#5c5c5cff", "#aeaeaeff"],
] as const)