import { mock } from "bun:test"

// The real "electron" package has no usable exports outside a running Electron
// process, so any test that imports main-process code needs this stub instead.
mock.module("electron", () => {
  const app = {
    getPath: (_name: string) => "/tmp/opencode-desktop-test",
    setPath: () => {},
    getVersion: () => "0.0.0-test",
    getName: () => "opencode",
    isPackaged: false,
    dock: { setIcon: () => {} },
    quit: () => {},
    relaunch: () => {},
    exit: () => {},
  }
  const BrowserWindow = class {}
  const dialog = { showMessageBox: mock(async () => ({ response: 0 })) }
  const net = { fetch: async () => new Response(null) }
  const nativeImage = { createFromPath: () => ({ isEmpty: () => true }) }
  const nativeTheme = { shouldUseDarkColors: false, themeSource: "system" }
  const protocol = { registerSchemesAsPrivileged: () => {} }
  const shell = { openExternal: async () => {}, openPath: async () => "", showItemInFolder: () => {} }
  const crashReporter = { start: () => {} }
  const netLog = {
    currentlyLogging: false,
    startLogging: async () => {},
    stopLogging: async () => {},
  }
  const electron = { app, BrowserWindow, dialog, net, nativeImage, nativeTheme, protocol, shell, crashReporter, netLog }
  return { ...electron, default: electron }
})

// Real exportDebugLogs() does file/zip I/O that depends on the electron app paths above;
// tests that only care about who calls it should mock it instead of exercising it for real.
mock.module("../src/main/logging", () => ({
  exportDebugLogs: mock(async () => {}),
  write: mock(() => {}),
}))
