import { defineConfig } from "vitest/config";

// DOM tests opt into jsdom with a `// @vitest-environment jsdom` docblock (they are named
// `*.dom.test.tsx`); `environmentMatchGlobs` is deprecated in Vitest 3.
export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ["packages/*/test/**/*.test.{ts,tsx}", "apps/*/test/**/*.test.{ts,tsx}"],
  },
});
