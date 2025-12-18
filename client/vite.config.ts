import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Читаем версию из главного package.json
const rootPackageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "../package.json"), "utf-8")
);
const appVersion = rootPackageJson.version;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const innkeeperUrl = String(
    env.VITE_INNKEEPER_URL ?? "http://127.0.0.1:48912"
  ).trim();

  return {
    envDir: repoRoot,
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: innkeeperUrl,
          changeOrigin: true,
        },
      },
    },
    // В dev: ускоряем первый запуск за счёт prebundle зависимостей
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/notifications",
        "effector",
        "effector-react",
      ],
    },
    // В prod: делаем предсказуемые чанки, чтобы первый экран не тянул "всё сразу"
    build: {
      sourcemap: false,
      // esbuild-minify иногда ломает порядок инициализации (TDZ) в ESM при сложных чанках
      // (симптом: "Cannot access 'X' before initialization" в vendor/effector чанках).
      // Terser обычно ведёт себя стабильнее для таких кейсов.
      minify: "terser",
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const p = id.replace(/\\/g, "/");

            if (p.includes("node_modules")) {
              if (p.includes("@mantine/")) return "mantine";
              // if (p.includes("effector")) return "effector";
              // if (p.includes("/react-dom/") || p.includes("/react/"))
              //   return "react";
              return "vendor";
            }

            // Разбиваем по верхнему уровню features/pages для удобного lazy-loading
            const featuresPrefix = "/src/features/";
            const pagesPrefix = "/src/pages/";

            if (p.includes(featuresPrefix)) {
              const rest = p.split(featuresPrefix)[1];
              const feature = rest?.split("/")?.[0];
              if (feature) return `feature-${feature}`;
            }

            if (p.includes(pagesPrefix)) {
              const rest = p.split(pagesPrefix)[1];
              const page = rest?.split("/")?.[0];
              if (page) return `page-${page}`;
            }

            return undefined;
          },
        },
      },
    },
  };
});
