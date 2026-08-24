import { useSyncExternalStore } from "react";
import { api } from "../api/client";

/** Must stay comfortably under the server's 90s online window. */
const HEARTBEAT_MS = 20_000;

export type Presence = { live: number; views: number };

let counts: Presence | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;
const listeners = new Set<() => void>();

async function beat() {
  if (inFlight || document.visibilityState === "hidden") return;
  inFlight = true;
  try {
    const next = await api.presence();
    if (!counts || next.live !== counts.live || next.views !== counts.views) {
      counts = next;
      for (const listener of listeners) listener();
    }
  } catch {
    // Offline or the server is restarting — hold the last known counts.
  } finally {
    inFlight = false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === null) {
    void beat();
    timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || timer === null) return;
    clearInterval(timer);
    timer = null;
    document.removeEventListener("visibilitychange", beat);
  };
}

function snapshot() {
  return counts;
}

/**
 * Subscribing is what marks this browser as present, so every page should call
 * it even when it has nothing to render. Returns null until the first beat lands.
 */
export function usePresence() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
