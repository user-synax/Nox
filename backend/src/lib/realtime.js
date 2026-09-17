import { Server } from "socket.io";
import { env } from "../env.js";
import { getSessionUser } from "./session.js";

/**
 * Realtime fan-out (PRD §25) — live solution likes/comments (§19).
 *
 * Rooms:
 *   challenge:<challengeId>  → solution list events + count updates
 *   solution:<solutionId>     → thread events for the open solution
 *   user:<userId>             → private inbox hints (notification:new),
 *                               auto-joined for authed sockets
 *
 * Auth is best-effort: the session cookie is verified via Better Auth when
 * present (socket.data.userId), otherwise the socket stays anonymous and
 * read-only. All writes still go through session-guarded REST routes —
 * sockets only ever *receive*.
 */

const ID_RX = /^[a-f0-9]{24}$/i;

export function roomForChallenge(challengeId) {
  return `challenge:${String(challengeId)}`;
}

export function roomForSolution(solutionId) {
  return `solution:${String(solutionId)}`;
}

export function roomForUser(userId) {
  return `user:${String(userId)}`;
}

export function initRealtime(httpServer, db) {
  const io = new Server(httpServer, {
    cors: { origin: [env.FRONTEND_URL], credentials: true },
  });

  // Best-effort session attach — never rejects the connection.
  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie ?? "";
      if (!cookie) return next();
      const found = await getSessionUser(db, { headers: { cookie } });
      if (found) socket.data.userId = String(found.user._id);
    } catch {
      /* anonymous: live reads only */
    }
    next();
  });

  io.on("connection", (socket) => {
    // Authed sockets auto-join their private inbox room (notifications).
    if (socket.data.userId) {
      socket.join(roomForUser(socket.data.userId));
    }
    const challengeRooms = (msg = {}) =>
      [msg?.challengeId, ...(msg?.challengeIds ?? [])]
        .map((c) => String(c ?? ""))
        .filter((c) => ID_RX.test(c));
    socket.on("join", (msg = {}) => {
      for (const cid of challengeRooms(msg)) socket.join(roomForChallenge(cid));
      if (msg?.solutionId && ID_RX.test(String(msg.solutionId))) {
        socket.join(roomForSolution(msg.solutionId));
      }
    });
    socket.on("leave", (msg = {}) => {
      for (const cid of challengeRooms(msg)) socket.leave(roomForChallenge(cid));
      if (msg?.solutionId && ID_RX.test(String(msg.solutionId))) {
        socket.leave(roomForSolution(msg.solutionId));
      }
    });
  });

  return io;
}

/** Emit from inside a route: req.app.get("io") may be missing in tests. */
function ioOf(req) {
  try {
    return req.app?.get("io") ?? null;
  } catch {
    return null;
  }
}

export function emitChallenge(req, challengeId, event, payload) {
  ioOf(req)?.to(roomForChallenge(challengeId))?.emit(event, payload);
}

export function emitSolution(req, solutionId, event, payload) {
  ioOf(req)?.to(roomForSolution(solutionId))?.emit(event, payload);
}

/** Private inbox hint — recipient's user:<id> room only. */
export function emitUser(req, userId, event, payload) {
  ioOf(req)?.to(roomForUser(userId))?.emit(event, payload);
}
