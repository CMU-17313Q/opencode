import { createMemo } from "solid-js"
import type { UpdaterState } from "@/updater"
import { usePlatform } from "@/context/platform"
import { useLanguage } from "@/context/language"
import { showToast } from "@/utils/toast"

type UpdaterAction = {
  label:
  | "settings.updates.action.checkNow"
  | "settings.updates.action.checking"
  | "settings.updates.action.downloading"
  | "toast.update.action.installRestart"
  | "settings.updates.action.installing"
  run?: "check" | "install"
}

const updaterActions: Record<UpdaterState["status"], UpdaterAction> = {
  disabled: { label: "settings.updates.action.checkNow" },
  idle: { label: "settings.updates.action.checkNow", run: "check" },
  checking: { label: "settings.updates.action.checking" },
  downloading: { label: "settings.updates.action.downloading" },
  ready: { label: "toast.update.action.installRestart", run: "install" },
  "up-to-date": { label: "settings.updates.action.checkNow", run: "check" },
  installing: { label: "settings.updates.action.installing" },
  error: { label: "settings.updates.action.checkNow", run: "check" },
}

export function updaterAction(state: UpdaterState | undefined): UpdaterAction {
  return { ...updaterActions[state?.status ?? "disabled"] }
}

export function useUpdaterAction() {
  const platform = usePlatform()
  const language = useLanguage()
  const action = createMemo(() => updaterAction(platform.updater?.state()))

  return {
    action,
    async run() {
      const run = action().run
      if (run === "install") return platform.updater?.install()
      if (run !== "check") return

      const state = await platform.updater?.check()
      if (state?.status === "up-to-date") {
        showToast({
          variant: "success",
          icon: "circle-check",
          title: language.t("settings.updates.toast.latest.title"),
          description: language.t("settings.updates.toast.latest.description", { version: platform.version ?? "" }),
        })
      }
      if (state?.status === "error") {
        showToast({ title: language.t("common.requestFailed"), description: state.message })
      }
    },
  }
}