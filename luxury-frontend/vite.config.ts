import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = (env.VITE_PROXY_API_TARGET ?? "http://127.0.0.1:8081").replace(/\/+$/, "");

  /** Stesso proxy in `server` e `preview`: senza questo, `vite preview` su localhost non inoltra `/api` e vedi 404. */
  const proxy = {
    "/api": {
      // 127.0.0.1 evita mismatch IPv6 (::1) vs JVM su IPv4 — altrimenti il proxy fallisce e in UI vedi errori
      // senza alcuna richiesta (e nessun log) sul backend Spring.
      // Lab / VM (es. porta 8082): in .env.development impostare VITE_PROXY_API_TARGET=http://192.168.x.x:8082
      // Dev locale default: profilo Spring `local` → :8081
      target: apiProxyTarget,
      changeOrigin: true,
      configure: (proxyServer) => {
        proxyServer.on("proxyReq", (proxyReq) => {
          // Il browser è same-origin con Vite. Inoltrare Origin fa applicare il CORS di Spring:
          // un IP hotspot/LAN fuori lista (es. 172.20.x:5173) riceve 403 «Invalid CORS request» sul login.
          proxyReq.removeHeader("origin");
        });
      },
    },
    // Nominatim: il browser non può chiamarlo in modo affidabile (CORS / User-Agent). In dev usiamo il proxy Vite.
    "/nominatim": {
      target: "https://nominatim.openstreetmap.org",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/nominatim/, "") || "/",
      configure: (proxyServer) => {
        proxyServer.on("proxyReq", (proxyReq) => {
          proxyReq.setHeader("User-Agent", "Luxury-dev/1.0 (localhost; place-suggest)");
          proxyReq.setHeader("Accept-Language", "it");
        });
      },
    },
  } as const;

  /** Desktop/iCloud: cache e pre-bundle fuori dal Desktop evitano hang di Vite su Safari/simulatore. */
  const viteCacheDir = process.env.LUXURY_VITE_CACHE_DIR ?? "/tmp/luxury-vite-cache";
  /** `dev-local.sh` avvia Vite da /tmp con src/public symlinkati al repo reale. */
  const repoRoot = process.env.LUXURY_FRONTEND_REPO_ROOT?.trim();
  const serverFs = repoRoot
    ? { allow: [process.cwd(), path.resolve(repoRoot)] as string[] }
    : undefined;

  /** Dev APK sideload: header corretti così Chrome Android salva `/dev/*.apk`. */
  const luxuryDevApkPlugin = {
    name: "luxury-dev-apk-headers",
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      server.middlewares.use(
        (
          req: { url?: string },
          res: { setHeader: (k: string, v: string) => void },
          next: () => void,
        ) => {
          const pathOnly = (req.url ?? "").split("?")[0] ?? "";
          if (pathOnly.startsWith("/dev/") && pathOnly.endsWith(".apk")) {
            const name = pathOnly.split("/").pop() || "saloni-luxury.apk";
            res.setHeader("Content-Type", "application/vnd.android.package-archive");
            res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("Accept-Ranges", "bytes");
          }
          next();
        },
      );
    },
  };

  return {
    cacheDir: viteCacheDir,
    /** Pre-bundle esplicito: evita 504 «Outdated Optimize Dep» su react-rnd dopo npm install / HMR. */
    optimizeDeps: {
      include: ["react-rnd", "re-resizable", "react-draggable", "tslib"],
    },
    plugins: [react(), luxuryDevApkPlugin],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      /** WebView app / telefono fisico: Vite raggiungibile da IP LAN (non solo localhost). */
      host: true,
      /** Riduce errori CORS se la pagina è servita da origini «vicine» (es. tool di preview / mismatch host). */
      cors: true,
      ...(serverFs ? { fs: serverFs } : {}),
      proxy,
    },
    preview: {
      proxy,
    },
  };
});
