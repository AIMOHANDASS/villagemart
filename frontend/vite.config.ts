import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Determine the target app mode
  //    Priority: VITE_APP_MODE env var  ➜  --mode CLI flag  ➜  "consumer"
  // ──────────────────────────────────────────────────────────────────────────
  let appMode = mode;

  if (process.env.VITE_APP_MODE) {
    appMode = process.env.VITE_APP_MODE;
  }

  // Map "client", "production", or default Vite modes to "consumer"
  const finalAppMode =
    appMode === "client" ||
    appMode === "consumer" ||
    appMode === "production"
      ? "consumer"
      : appMode;

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Resolve root, outDir, and publicDir per app target
  //
  //    WHY root changes: Vite emits HTML files preserving their path relative
  //    to `root`. When root = frontend/ and input = src/apps/admin/index.html,
  //    the output becomes dist/admin/src/apps/admin/index.html (NESTED).
  //    By setting root to the sub-app directory, index.html sits at root level
  //    and outputs as dist/admin/index.html (FLAT) — exactly where Firebase
  //    Hosting expects it via the /** → /index.html rewrite.
  //
  //    All paths are absolute so they are immune to root changes.
  // ──────────────────────────────────────────────────────────────────────────
  const frontendDir = __dirname; // d:\villagemart-mainuichages\frontend

  let root = frontendDir;
  let outDir = path.resolve(frontendDir, "dist/client");

  if (finalAppMode === "admin") {
    root = path.resolve(frontendDir, "src/apps/admin");
    outDir = path.resolve(frontendDir, "dist/admin");
  } else if (finalAppMode === "delivery") {
    root = path.resolve(frontendDir, "src/apps/delivery");
    outDir = path.resolve(frontendDir, "dist/delivery");
  } else if (finalAppMode === "transport") {
    root = path.resolve(frontendDir, "src/apps/transport");
    outDir = path.resolve(frontendDir, "dist/transport");
  }

  console.log(
    `🚀 Vite Building Target: [${finalAppMode}]` +
    `\n   Root:   ${root}` +
    `\n   Output: ${outDir}`
  );

  return {
    root,
    base: "/",
    // publicDir must stay pointed at frontend/public regardless of root shift
    publicDir: path.resolve(frontendDir, "public"),
    // envDir must stay pointed at frontend/ so sub-app builds (where root
    // shifts to src/apps/admin/) can still load the root .env file
    envDir: frontendDir,
    server: {
      host: "::",
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        // Absolute path — unaffected by root changes
        "@": path.resolve(frontendDir, "./src"),
      },
    },
    build: {
      outDir,
      // emptyOutDir: true is safe here because each app target writes to its
      // own isolated subdirectory (dist/admin, dist/delivery, etc.) and the
      // sequential build chain (&&) guarantees no parallel wipe conflicts.
      emptyOutDir: true,
      // No rollupOptions.input needed — Vite auto-detects index.html at root
    },
    define: {
      // Statically inject the build target so runtime routing/loading decisions
      // are resolved at compile time for maximum code splitting & tree shaking
      "import.meta.env.VITE_APP_MODE": JSON.stringify(finalAppMode),
      // FIX: Must use import.meta.env (not process.env) to match how all
      // source files reference the key. The old process.env.* define injected
      // the key into a namespace nothing reads → Maps overlay error persisted.
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(
        "AIzaSyA4fn80rgW3sPP4OwrImLTTuqqCoappPFE"
      ),
    },
  };
});