// New test file to validate my implementation of FieldV2 Prefix and Suffix
import { expect, test } from "vitest"
import { render } from "solid-js/web"
import { FieldV2 } from "../src/v2/components/field-v2"

test("FieldV2 prefix and suffix preserve their behavior", async () => {
  const host = document.createElement("div")
  document.body.appendChild(host)

  const dispose = render(
    () => (
      <FieldV2>
        <FieldV2.Prefix class="prefix-class">Before</FieldV2.Prefix>

        <FieldV2.Control>
          <input data-slot="text-input-v2-input" />
        </FieldV2.Control>

        <FieldV2.Suffix class="suffix-class">After</FieldV2.Suffix>
      </FieldV2>
    ),
    host,
  )

  await Promise.resolve()

  const prefix = host.querySelector('[data-slot="field-v2-prefix"]')
  const suffix = host.querySelector('[data-slot="field-v2-suffix"]')
  const input = host.querySelector("input")

  expect(prefix).not.toBeNull()
  expect(suffix).not.toBeNull()
  expect(input).not.toBeNull()

  expect(prefix?.textContent).toBe("Before")
  expect(suffix?.textContent).toBe("After")

  expect(prefix?.classList.contains("prefix-class")).toBe(true)
  expect(suffix?.classList.contains("suffix-class")).toBe(true)

  expect(prefix?.id.startsWith("field-prefix-")).toBe(true)
  expect(suffix?.id.startsWith("field-suffix-")).toBe(true)

  expect(input?.getAttribute("aria-describedby")).toBe(
    `${prefix?.id} ${suffix?.id}`,
  )

  dispose()
  host.remove()
})