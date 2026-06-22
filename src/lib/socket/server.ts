import { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { authenticateSocket, type AuthenticatedSocketData } from "./auth";

/**
 * Module-level singleton so route handlers / server-side code elsewhere in
 * the app (e.g. the comment-creation API route) can grab the same
 * io instance via getIO() without needing it passed through every call
 * stack. Set once in initSocketServer(), read via getIO().
 */
let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

/** Room name for targeted, per-user pushes (notifications, future DMs). */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Room name for everyone currently viewing a given post (live comments). */
export function postRoom(postId: string): string {
  return `post:${postId}`;
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket: Socket) => {
    const data = socket.data as AuthenticatedSocketData;

    // Every authenticated user automatically joins their own private room,
    // so the server can push notifications with io.to(userRoom(userId))
    // without the client having to explicitly subscribe.
    socket.join(userRoom(data.userId));

    // --- Live comments: client opts in/out per post as they navigate ---
    socket.on("post:subscribe", (postId: unknown) => {
      if (typeof postId === "string" && postId.length > 0) {
        socket.join(postRoom(postId));
      }
    });

    socket.on("post:unsubscribe", (postId: unknown) => {
      if (typeof postId === "string" && postId.length > 0) {
        socket.leave(postRoom(postId));
      }
    });

    socket.on("disconnect", () => {
      // socket.io automatically leaves all rooms on disconnect; nothing
      // further to clean up for this MVP's room model.
    });
  });

  return io;
}
