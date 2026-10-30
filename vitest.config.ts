import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/components/shell/AppPageHeader": path.resolve(
        __dirname,
        "./src/classic/AppPageHeaderAdapter.tsx",
      ),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Large editor/app suites cold-transform a sizeable module graph on Windows.
    // Bound parallelism and allow setup work without weakening any assertions.
    maxWorkers: 2,
    minWorkers: 1,
    testTimeout: 30_000,
    include: ["{src,tests}/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/setupGlobals.ts", "./tests/setupTests.ts"],
    globals: true,
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
