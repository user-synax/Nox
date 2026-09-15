"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "./auth";

/**
 * Shared Socket.IO client (PRD §25) — one connection per tab, cookies flow
 * automatically (same-origin session). Sockets only ever *receive*: every
 * write goes through the session-guarded REST routes, which fan out events.
 */

let socket = null;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

export function joinRooms({ challengeId = null, solutionId = null } = {}) {
  const s = getSocket();
  if (!s) return;
  const payload = {};
  if (challengeId) payload.challengeId = challengeId;
  if (solutionId) payload.solutionId = solutionId;
  if (Object.keys(payload).length > 0) {
    if (s.connected) s.emit("join", payload);
    else s.once("connect", () => s.emit("join", payload));
  }
}

export function leaveRooms({ challengeId = null, solutionId = null } = {}) {
  if (!socket?.connected) return;
  const payload = {};
  if (challengeId) payload.challengeId = challengeId;
  if (solutionId) payload.solutionId = solutionId;
  if (Object.keys(payload).length > 0) socket.emit("leave", payload);
}

/**
 * Subscribe to live events for the open rooms.
 * `events`: { "solution:like": fn, "comment:new": fn, … }.
 * Handlers always see fresh state (kept in a ref); the subscription itself
 * re-binds only when rooms or event names change. Re-joins rooms on
 * reconnect so a dropped socket never goes silently stale.
 */
export function useLiveRooms({ challengeId = null, challengeIds = [], solutionId = null, events = {} }) {
  // Latest-handlers ref, synced in an effect (never written during render).
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  });
  const names = Object.keys(events).join("|");
  const rooms = [
    ...(challengeId ? [String(challengeId)] : []),
    ...challengeIds.map((c) => String(c)),
  ].filter((c, i, all) => c && all.indexOf(c) === i);
  const roomsKey = rooms.join(",");
  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    const roomList = roomsKey ? roomsKey.split(",") : [];
    const payload = {};
    if (roomList.length > 0) payload.challengeIds = roomList;
    if (solutionId) payload.solutionId = solutionId;

    const doJoin = () => {
      if (Object.keys(payload).length > 0) s.emit("join", payload);
    };
    if (s.connected) doJoin();
    s.on("connect", doJoin);

    const eventNames = Object.keys(eventsRef.current);
    const dispatchers = eventNames.map((name) => {
      const dispatch = (data) => eventsRef.current[name]?.(data);
      s.on(name, dispatch);
      return [name, dispatch];
    });
    return () => {
      s.off("connect", doJoin);
      for (const [name, dispatch] of dispatchers) s.off(name, dispatch);
      if (Object.keys(payload).length > 0 && s.connected) s.emit("leave", payload);
    };
  }, [roomsKey, solutionId, names]);
}
