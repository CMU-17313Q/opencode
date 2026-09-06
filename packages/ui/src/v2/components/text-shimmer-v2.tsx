import type { ValidComponent } from "solid-js"
import { TextShimmerCore } from "../../components/text-shimmer-core"
import "./text-shimmer-v2.css"

export const TextShimmerV2Config = {
  component: "text-shimmer-v2",
  charSlot: "text-shimmer-v2-char",
  baseSlot: "text-shimmer-v2-base",
  shimmerSlot: "text-shimmer-v2-shimmer",
  swapVar: "--_swap",
  indexVar: "--_index"
} as const

export const TextShimmerV2 = <T extends ValidComponent = "span">(props: {
  text: string
  class?: string
  as?: T
  active?: boolean
  offset?: number
}) => {
  return <TextShimmerCore {...props} {...TextShimmerV2Config} />
}
