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
    router: {
      routeFileIgnorePattern: "api\\.privy-bridge",
    },
  },
  vite: {
    plugins: [
      // Polyfill Buffer and process for Solana/bs58 packages.
      // Exclude stream — stream-browserify/web subpath doesn't exist and
      // @tanstack/router-core's SSR stream usage should stay server-side.
      nodePolyfills({ exclude: ["stream"] }),
    ],
    resolve: {
      alias: {
        // Prevent vite from trying to bundle the non-existent stream-browserify/web
        "stream-browserify/web": "stream-browserify",
      },
    },
  },
});
