import type { ValidComponent } from "solid-js"
import { TextShimmerCore } from "./text-shimmer-core"

export const TextShimmerConfig = {
  component: "text-shimmer",
  charSlot: "text-shimmer-char",
  baseSlot: "text-shimmer-char-base",
  shimmerSlot: "text-shimmer-char-shimmer",
  swapVar: "--text-shimmer-swap",
  indexVar: "--text-shimmer-index"
} as const

export const TextShimmer = <T extends ValidComponent = "span">(props: {
  text: string
  class?: string
  as?: T
  active?: boolean
  offset?: number
}) => {
  return <TextShimmerCore {...props} {...TextShimmerConfig} />
}
