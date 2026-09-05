import { describe, expect, test, mock, beforeEach } from "bun:test"
import { app, dialog } from "electron"
import { exportDebugLogs, write as writeLog } from "./logging"
import {
  handleRecoveryAction,
  handleLoadFailure,
  setRelaunchHandler,
  showRecoveryDialog,
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
  return {
    isDestroyed: () => state.destroyed,
    webContents: { isDestroyed: () => state.destroyed, getURL: () => "https://example.com" },
    destroy: () => {
      state.destroyed = true
    },
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