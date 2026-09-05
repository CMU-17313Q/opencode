import type { LspStatus } from "@opencode-ai/sdk/v2/client"
import type { McpServer } from "@opencode-ai/client/promise"

export function hasServiceNeedingAttention(input: { mcp: Array<McpServer["status"]["status"]> }) {
  return input.mcp.some((status) => status === "needs_auth" || status === "needs_client_registration")
}

export function hasNonBlockingServiceIssue(input: {
  mcp: Array<McpServer["status"]["status"]>
  lsp: Array<LspStatus["status"]>
}) {
  return (
    input.mcp.some((status) => status !== "connected" && status !== "pending" && status !== "disabled") ||
    input.lsp.some((status) => status === "error")
  )
}

export function serverStatusDotClass(input: {
  ready: boolean
  serverHealth: boolean | undefined
  attention?: boolean
  issue: boolean
}) {
  const rules: Array<[boolean, string]> = [
    [input.serverHealth === false, "bg-icon-critical-base"],
    [!input.ready || input.serverHealth === undefined, "bg-border-weak-base"],
    [input.attention === true, "bg-v2-background-bg-accent"],
    [input.issue, "bg-icon-warning-base"],
    [input.serverHealth === true, "bg-icon-success-base"],
  ]

  return rules.find(([condition]) => condition)?.[1] ?? "bg-border-weak-base"
}
