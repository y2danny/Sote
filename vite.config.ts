// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  tanstackStart: {
    server: { preset: "vercel" },
    router: {
      routeFileIgnorePattern: "api\\.privy-bridge",
    },
  },
  vite: {
    plugins: [
      // Only polyfill what browser code actually needs (Buffer, process).
      // Excluding fs/stream avoids the node-stdlib-browser/empty.js subpath bug.
      nodePolyfills({ include: ["buffer", "process"] }),
    ],
    resolve: {
      // Force Vite to prefer browser exports so @solana/* packages serve their
      // browser builds instead of the .node.mjs variants.
      conditions: ["browser", "module", "import", "default"],
    },
    optimizeDeps: {
      esbuildOptions: {
        conditions: ["browser", "module", "import", "default"],
      },
    },
    build: {
      rollupOptions: {
        // Externalize any remaining node: built-ins so Rollup doesn't try to
        // bundle them (the browser builds of Solana packages don't import them).
        external: (id) => id.startsWith("node:"),
      },
    },
  },
});
