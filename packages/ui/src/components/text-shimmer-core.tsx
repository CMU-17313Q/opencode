import { createEffect, createMemo, createSignal, onCleanup, type JSX, type ValidComponent } from "solid-js"
import { Dynamic } from "solid-js/web"


export type TextShimmerCoreProps<T extends ValidComponent = "span"> = {
  text: string
  class?: string 
  as?: T
  active?: boolean
  offset?: number
  component: string
  charSlot: string
  bareSlot: string
  shimmerSlot: string
  swapVar: string
  indexVar: string
}

export const TextShimmerCore = <T extends ValidComponent = "span">(
  props: TextShimmerCoreProps<T>
) => {
  const text = createMemo(() => props.text ?? "")
  const active = createMemo(() => props.active ?? true)
  const offset = createMemo(() => props.offset ?? 0)
  const [run, setRun] = createSignal(active())
  const swap = 220
  let timer: ReturnType<typeof setTimeout> | undefined

  createEffect(() => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }

    if (active()) {
      setRun(true)
      return
    }

    timer = setTimeout(() => {
      timer = undefined
      setRun(false)
    }, swap)
  })

  onCleanup(() => {
    if (!timer) return
    clearTimeout(timer)
  })

  return (
    <Dynamic
      component={props.as ?? "span"}
      data-component={props.component}
      data-active={active() ? "true" : "false"}
      class={props.class}
      aria-label={text()}
      style={buildTextSimmerStyle(props.swapVar, props.indexVar, swap, offset())}
    >
      <span data-slot={props.charSlot}>
        <span data-slot={props.bareSlot} aria-hidden="true">
          {text()}
        </span>
        <span data-slot={props.shimmerSlot} data-run={run() ? "true" : "false"} aria-hidden="true">
          {text()}
        </span>
      </span>
    </Dynamic>
  )
}

export function buildTextSimmerStyle(swapVar: string, indexVar: string, 
  swap: number, offset: number) {
  return {[swapVar]: `${swap}ms`, [indexVar]: `${offset}` } as JSX.CSSProperties
}
