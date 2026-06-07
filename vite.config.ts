import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ViteDevServer } from "vite";

function devFileLoggerPlugin() {
  const logDir = resolve(process.cwd(), "logs");
  const logFilePath = resolve(logDir, "dev-app.log");

  return {
    name: "dev-file-logger",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/__devlog") {
          next();
          return;
        }

        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        let body = "";
        req.setEncoding("utf8");

        req.on("data", (chunk: string | Buffer) => {
          const textChunk = typeof chunk === "string" ? chunk : chunk.toString("utf8");
          body += textChunk;
          if (body.length > 1_000_000) {
            res.statusCode = 413;
            res.end("Payload too large");
            req.destroy();
          }
        });

        req.on("end", () => {
          try {
            const parsed = JSON.parse(body) as unknown;
            const entry = {
              serverReceivedAt: new Date().toISOString(),
              payload: parsed,
            };

            if (!existsSync(logDir)) {
              mkdirSync(logDir, { recursive: true });
            }

            appendFileSync(logFilePath, `${JSON.stringify(entry)}\n`, "utf8");
            res.statusCode = 204;
            res.end();
          } catch {
            res.statusCode = 400;
            res.end("Invalid JSON");
          }
        });

        req.on("error", () => {
          res.statusCode = 500;
          res.end("Request error");
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devFileLoggerPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
