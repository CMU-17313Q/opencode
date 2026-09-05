import { defineConfig } from "vitest/config"
import solidPlugin from "vite-plugin-solid"

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    conditions: ["browser", "development"],
  },
  test: {
    environment: "happy-dom",
    include: ["test-browser/**/*.browser.tsx"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: ["src/v2/components/field-v2.tsx"],
    },
  },
})