import { defineConfig } from "vitest/config";

/**
 * Two projects so the pure/server suites don't pay the cost of booting jsdom.
 *
 * Note: `@vitejs/plugin-react` is deliberately absent. It only provides Fast
 * Refresh, which tests don't use, and its v6 line drags in a `@babel/core@8`
 * peer that conflicts with the `@babel/core@7` pinned by `shadcn`. Vite's own
 * esbuild transform handles JSX via `compilerOptions.jsx: "react-jsx"`.
 */
export default defineConfig({
  // Resolves the `@/*` alias straight from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    // next-auth's ESM entry imports "next/server" bare; let Vite resolve it
    // through the package exports map instead of Node's raw resolver.
    server: { deps: { inline: ["next-auth", "@auth/core"] } },
    // `HistoryList` formats dates with Intl, so pin the zone for determinism.
    env: { TZ: "UTC" },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "tests/lib/**/*.test.ts",
            "tests/api/**/*.test.ts",
            "tests/auth/**/*.test.ts",
            "tests/instrumentation/**/*.test.ts",
            "tests/proxy.test.ts",
            "tests/app/manifest.test.ts",
          ],
          // Needs localStorage — runs in the dom project instead.
          exclude: ["tests/lib/history.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
          include: [
            "tests/components/**/*.test.tsx",
            "tests/app/page.test.tsx",
            "tests/lib/history.test.ts",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "lib/**",
        "app/**",
        "components/**",
        "auth.ts",
        "proxy.ts",
        "instrumentation*.ts",
      ],
      exclude: [
        "components/ui/**", // generated shadcn primitives
        "app/layout.tsx",
        "app/login/page.tsx", // async server component — unsupported by Vitest
        "components/site-header.tsx", // async server component
        "app/api/auth/**", // 3-line re-export of NextAuth handlers
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 75,
        statements: 75,
        functions: 75,
        branches: 75,
      },
    },
  },
});
