export type StartCommand = {
  type: "start"
  hostname: string
  port: number
  password: string
  userDataPath: string
}
export type StopCommand = { type: "stop" }
export type SidecarCommand = StartCommand | StopCommand

export function parseCommand(value: unknown): SidecarCommand | undefined {
  if (!value || typeof value !== "object") return
  const command = value as Partial<StartCommand | StopCommand>
  if (command.type === "stop") return { type: "stop" }
  if (command.type !== "start") return
  const { hostname, port, password, userDataPath } = command
  if (
    typeof hostname !== "string" ||
    typeof port !== "number" ||
    typeof password !== "string" ||
    typeof userDataPath !== "string"
  )
    return
  return { type: "start", hostname, port, password, userDataPath }
}