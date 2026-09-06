import { describe, expect, test, mock, beforeEach } from "bun:test"
import { app, dialog } from "electron"
import type { BrowserWindow } from "electron"
import { exportDebugLogs, write as writeLog } from "./logging"
import {
  handleRecoveryAction,
  handleLoadFailure,
  setRelaunchHandler,
  showRecoveryDialog,
  wireWindowRecovery,
  type RecoveryContext,
} from "./windows"

function fakeSampler() {
  const calls: string[] = []
  return {
    calls,
    start: () => {
      calls.push("start")
    },
    stopAndFlush: () => {
      calls.push("stopAndFlush")
      return true
    },
  }
}

function fakeWin(destroyed = false) {
  const state = { destroyed }
  const winHandlers = new Map<string, (...args: any[]) => void>()
  const webContentsHandlers = new Map<string, (...args: any[]) => void>()
  return {
    isDestroyed: () => state.destroyed,
    on: mock((event: string, handler: (...args: any[]) => void) => {
      winHandlers.set(event, handler)
    }),
    webContents: {
      isDestroyed: () => state.destroyed,
      getURL: () => "https://example.com",
      isDevToolsOpened: () => true,
      on: mock((event: string, handler: (...args: any[]) => void) => {
        webContentsHandlers.set(event, handler)
      }),
    },
    destroy: () => {
      state.destroyed = true
    },
    winHandlers,
    webContentsHandlers,
  }
}

function fakeCtx(overrides: { destroyed?: boolean; showing?: boolean } = {}) {
  const win = fakeWin(overrides.destroyed)
  const sampler = fakeSampler()
  const state = { showing: overrides.showing ?? false }
  const ctx = { win, name: "main", sampler, state } as unknown as RecoveryContext
  return { ctx, win, sampler, state }
}

describe("handleRecoveryAction", () => {
  beforeEach(() => {
    ;(exportDebugLogs as ReturnType<typeof mock>).mockClear()
    ;(writeLog as ReturnType<typeof mock>).mockClear()
  })

  test("export-logs: flushes sampler, exports logs, and restarts sampling when waiting", async () => {
    const sampler = fakeSampler()
    const result = await handleRecoveryAction("export-logs", true, sampler)
    expect(result).toBe(true)
    expect(sampler.calls).toEqual(["stopAndFlush", "start"])
    expect(exportDebugLogs).toHaveBeenCalledTimes(1)
  })

  test("export-logs: does not restart sampling when not waiting", async () => {
    const sampler = fakeSampler()
    const result = await handleRecoveryAction("export-logs", false, sampler)
    expect(result).toBe(true)
    expect(sampler.calls).toEqual(["stopAndFlush"])
    expect(exportDebugLogs).toHaveBeenCalledTimes(1)
  })

  test("relaunch: flushes sampler and triggers the relaunch handler", async () => {
    const sampler = fakeSampler()
    let relaunched = false
    setRelaunchHandler(() => {
      relaunched = true
    })
    const result = await handleRecoveryAction("relaunch", true, sampler)
    expect(result).toBe(false)
    expect(sampler.calls).toEqual(["stopAndFlush"])
    expect(relaunched).toBe(true)
  })

  test("quit: flushes sampler and calls app.quit", async () => {
    const sampler = fakeSampler()
    const quitSpy = mock(() => {})
    app.quit = quitSpy
    const result = await handleRecoveryAction("quit", true, sampler)
    expect(result).toBe(false)
    expect(sampler.calls).toEqual(["stopAndFlush"])
    expect(quitSpy).toHaveBeenCalledTimes(1)
  })

  test("undefined action: does nothing and returns false", async () => {
    const sampler = fakeSampler()
    const result = await handleRecoveryAction(undefined, true, sampler)
    expect(result).toBe(false)
    expect(sampler.calls).toEqual([])
  })

  test("keep-waiting action: does nothing and returns false", async () => {
    const sampler = fakeSampler()
    const result = await handleRecoveryAction("keep-waiting", true, sampler)
    expect(result).toBe(false)
    expect(sampler.calls).toEqual([])
  })
})

describe("showRecoveryDialog", () => {
  beforeEach(() => {
    ;(exportDebugLogs as ReturnType<typeof mock>).mockClear()
    ;(writeLog as ReturnType<typeof mock>).mockClear()
  })

  test("does nothing when already showing", async () => {
    dialog.showMessageBox = mock(async () => ({ response: 0 }))
    const { ctx, state } = fakeCtx({ showing: true })
    await showRecoveryDialog(ctx, "message", "detail", true)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
    expect(state.showing).toBe(true)
  })

  test("does nothing when the window is already destroyed", async () => {
    dialog.showMessageBox = mock(async () => ({ response: 0 }))
    const { ctx, state } = fakeCtx({ destroyed: true })
    await showRecoveryDialog(ctx, "message", "detail", true)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
    expect(state.showing).toBe(false)
  })

  test("shows the dialog once and resets the showing flag when a terminal action is chosen", async () => {
    dialog.showMessageBox = mock(async () => ({ response: 0 }))
    let relaunched = false
    setRelaunchHandler(() => {
      relaunched = true
    })
    const { ctx, state } = fakeCtx()
    await showRecoveryDialog(ctx, "message", "detail", true)
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
    expect(state.showing).toBe(false)
    expect(relaunched).toBe(true)
  })

  test("loops again when export-logs is chosen while waiting, then exits on the next terminal action", async () => {
    dialog.showMessageBox = mock()
      .mockImplementationOnce(async () => ({ response: 1 }))
      .mockImplementationOnce(async () => ({ response: 0 }))
    const { ctx, state } = fakeCtx()
    await showRecoveryDialog(ctx, "message", "detail", true)
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(2)
    expect(exportDebugLogs).toHaveBeenCalledTimes(1)
    expect(state.showing).toBe(false)
  })

  test("stops looping if the window is destroyed before the next dialog", async () => {
    const { ctx, state, win } = fakeCtx()
    dialog.showMessageBox = mock().mockImplementationOnce(async () => {
      win.destroy()
      return { response: 1 }
    })
    await showRecoveryDialog(ctx, "message", "detail", true)
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
    expect(exportDebugLogs).toHaveBeenCalledTimes(1)
    expect(state.showing).toBe(false)
  })
})

describe("handleLoadFailure", () => {
  beforeEach(() => {
    ;(exportDebugLogs as ReturnType<typeof mock>).mockClear()
    ;(writeLog as ReturnType<typeof mock>).mockClear()
    dialog.showMessageBox = mock(async () => ({ response: 0 }))
  })

  test("logs the failure and skips the dialog for non-main-frame failures", () => {
    const { ctx } = fakeCtx()
    handleLoadFailure(ctx, {
      event: "did-fail-load",
      errorCode: -6,
      errorDescription: "ERR_FAILED",
      validatedURL: "https://example.com",
      isMainFrame: false,
    })
    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("window", "renderer load failed", expect.anything(), "error")
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  test("logs the failure and skips the dialog when the load was aborted (-3)", () => {
    const { ctx } = fakeCtx()
    handleLoadFailure(ctx, {
      event: "did-fail-load",
      errorCode: -3,
      errorDescription: "ERR_ABORTED",
      validatedURL: "https://example.com",
      isMainFrame: true,
    })
    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  test("logs the failure and shows the recovery dialog otherwise", () => {
    const { ctx } = fakeCtx()
    handleLoadFailure(ctx, {
      event: "did-fail-load",
      errorCode: -6,
      errorDescription: "ERR_FAILED",
      validatedURL: "https://example.com",
      isMainFrame: true,
    })
    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })
})

describe("wireWindowRecovery", () => {
  beforeEach(() => {
    ;(writeLog as ReturnType<typeof mock>).mockClear()
    dialog.showMessageBox = mock(async () => ({ response: 0 }))
  })

  test("registers the expected webContents and window listeners", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    expect([...win.webContentsHandlers.keys()].sort()).toEqual(
      ["console-message", "did-fail-load", "did-fail-provisional-load", "preload-error", "render-process-gone"].sort(),
    )
    expect([...win.winHandlers.keys()]).toEqual(expect.arrayContaining(["unresponsive", "responsive", "closed"]))
  })

  test("did-fail-load: logs the failure and shows the recovery dialog for main-frame errors", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.webContentsHandlers.get("did-fail-load")?.({}, -6, "ERR_FAILED", "https://example.com", true)

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("window", "renderer load failed", expect.anything(), "error")
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  test("did-fail-load: logs but skips the dialog when aborted (-3)", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.webContentsHandlers.get("did-fail-load")?.({}, -3, "ERR_ABORTED", "https://example.com", true)

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  test("did-fail-provisional-load: logs the failure and shows the recovery dialog", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.webContentsHandlers.get("did-fail-provisional-load")?.({}, -6, "ERR_FAILED", "https://example.com", true)

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("window", "renderer load failed", expect.anything(), "error")
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  test("render-process-gone: flushes the sampler, logs, and shows the recovery dialog", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.webContentsHandlers.get("render-process-gone")?.({}, { reason: "crashed", exitCode: 1 })

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("window", "renderer process gone", expect.anything(), "error")
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  test("unresponsive: logs, starts sampling, and shows the recovery dialog", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.winHandlers.get("unresponsive")?.()

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("window", "renderer unresponsive", expect.anything(), "error")
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  test("responsive: logs and flushes the sampler", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.winHandlers.get("responsive")?.()

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("window", "renderer responsive", expect.anything(), "error")
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  test("console-message: logs pty output when the message mentions terminal", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.webContentsHandlers.get("console-message")?.({}, "info", "opened a terminal session", 1, "file.js")

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("pty", "console", expect.anything())
  })

  test("console-message: does not log when neither message nor sourceId mention terminal", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.webContentsHandlers.get("console-message")?.({}, "info", "normal log line", 1, "file.js")

    expect(writeLog).not.toHaveBeenCalled()
  })

  test("preload-error: logs the preload error", () => {
    const win = fakeWin()
    wireWindowRecovery(win as unknown as BrowserWindow, "main")

    win.webContentsHandlers.get("preload-error")?.({}, "/path/preload.js", new Error("boom"))

    expect(writeLog).toHaveBeenCalledTimes(1)
    expect(writeLog).toHaveBeenCalledWith("preload", "preload error", expect.anything(), "error")
  })
})