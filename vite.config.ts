import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ViteDevServer } from "vite";

function normalizeBaseUrl(rawBaseUrl: string) {
  return rawBaseUrl.replace(/\/$/, "");
}

async function readRequestBody(req: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function devFileLoggerPlugin() {
  const logDir = resolve(process.cwd(), "logs");
  const logFilePath = resolve(logDir, "dev-app.log");

  return {
    name: "dev-file-logger",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/__llm/chat/completions")) {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          const headerProvider =
            typeof req.headers["x-llm-provider"] === "string"
              ? req.headers["x-llm-provider"].toLowerCase()
              : "";
          const provider =
            headerProvider === "openai" || headerProvider === "lmstudio"
              ? headerProvider
              : process.env.VITE_LLM_PROVIDER === "openai"
                ? "openai"
                : "lmstudio";
          const configuredBaseUrl =
            provider === "openai"
              ? process.env.VITE_OPENAI_BASE_URL ?? "https://api.openai.com/v1"
              : process.env.VITE_LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234/v1";
          const upstreamUrl = `${normalizeBaseUrl(configuredBaseUrl)}/chat/completions`;

          try {
            const bodyBuffer = await readRequestBody(req);
            const incomingAuthorization =
              typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
            const upstreamResponse = await fetch(upstreamUrl, {
              method: "POST",
              headers: {
                "Content-Type": req.headers["content-type"] ?? "application/json",
                ...(provider === "openai"
                  ? incomingAuthorization
                    ? { Authorization: incomingAuthorization }
                    : process.env.VITE_OPENAI_API_KEY
                      ? { Authorization: `Bearer ${process.env.VITE_OPENAI_API_KEY}` }
                      : {}
                  : {}),
              },
              body: bodyBuffer,
            });

            const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
            res.statusCode = upstreamResponse.status;
            res.setHeader("Content-Type", upstreamResponse.headers.get("content-type") ?? "application/json");
            res.setHeader("x-llm-relay", "vite-dev");
            res.setHeader("x-llm-provider", provider);
            res.end(responseBody);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: {
                  message: `LLM relay failed (${provider}): ${message}`,
                },
              }),
            );
          }

          return;
        }

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
