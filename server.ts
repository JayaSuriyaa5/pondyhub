/**
 * Custom server entry point — run via `tsx server.ts` (see package.json
 * scripts), not `next start` / `next dev` directly.
 *
 * Why a custom server at all: Socket.IO needs a real, persistent
 * `http.Server` instance to upgrade HTTP connections to WebSockets on.
 * Next.js route handlers are request/response functions invoked per
 * request, not a long-lived server object we can attach a websocket
 * listener to — so this file creates the actual http.Server, hands every
 * non-socket request to Next.js's own request handler (unchanged
 * behavior for routing, middleware, rendering, etc.), and attaches
 * Socket.IO to that same server for the websocket upgrade path.
 *
 * Why TypeScript + tsx instead of plain server.js + require(): the
 * socket server logic (src/lib/socket/server.ts) is written in TypeScript
 * and uses the project's `@/` path aliases and shared types. A plain
 * `.js` bootstrap script run directly under `node` cannot `require()` a
 * `.ts` file or resolve those aliases without a separate build step.
 * Running the entire bootstrap through `tsx` keeps one consistent module
 * system end to end and avoids needing a second compile step just for
 * the server shell.
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketServer } from "./src/lib/socket/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  initSocketServer(httpServer);

  httpServer.once("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(
      `> PondyHub server ready on http://${hostname}:${port} (${dev ? "development" : "production"})`
    );
  });

  // Graceful shutdown for container environments (Docker sends SIGTERM on
  // `docker stop`); without this, in-flight requests/socket connections
  // are dropped abruptly instead of being allowed to finish.
  function shutdown() {
    console.log("Shutting down gracefully...");
    httpServer.close(() => {
      process.exit(0);
    });
    // Force-exit if close() hangs for some reason (e.g. a socket that
    // never disconnects).
    setTimeout(() => process.exit(1), 10_000);
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
