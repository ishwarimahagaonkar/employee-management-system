import { AppState } from "react-native";

import api from "../api/api.js";
import * as queue from "./offlineQueue";
import { KINDS } from "./offlineQueue";
import { breadcrumb, reportError } from "./crashReporter";

/**
 * Delivers queued actions once the network comes back.
 *
 * Triggers are deliberately built on React Native core only. NetInfo would give
 * an instant reconnect signal, but it is a native module, and importing one the
 * running binary does not contain is what took this app down at startup earlier
 * (see crashReporter.js). AppState ships with React Native, needs no rebuild,
 * and covers the case that actually matters: the employee reopens the app.
 *
 * If NetInfo is ever installed, the guarded lookup below picks it up
 * automatically and adds reconnect-triggered syncing. Until then its absence
 * costs nothing.
 */

const ENDPOINTS = {
  [KINDS.PUNCH_IN]: "/attendance/punch-in",
  [KINDS.PUNCH_OUT]: "/attendance/punch-out",
  [KINDS.TRIP_START]: "/travel/start",
  [KINDS.TRIP_END]: "/travel/end",
};

// Past this an entry is abandoned. The server's same-day rule will refuse it
// soon regardless, and retrying forever hides a real problem.
const MAX_ATTEMPTS = 6;

// A punch carries a selfie, so it needs the same generous timeout the live
// path uses rather than the 15s default.
const SEND_TIMEOUT_MS = 60000;

// Retry cadence while anything is waiting. Slow on purpose: the queue is not
// urgent, and a tight loop on a dead network drains the battery for nothing.
const RETRY_INTERVAL_MS = 60000;

let draining = false;
let timer = null;
let appStateSub = null;
let netInfoSub = null;
const listeners = new Set();

/** Notifies the UI so a "2 waiting to sync" badge can stay honest. */
function emit(state) {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      // A broken listener must not stop the drain.
    }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * How to treat a failed delivery.
 *
 *   retry     - the network or the server is at fault; keep the entry and stop
 *               the drain so ordering is preserved.
 *   delivered - the server says this already happened. A replay of something
 *               that landed is a success, not an error: the employee punched
 *               once and it is recorded once.
 *   drop      - the server judged the request itself invalid. Retrying cannot
 *               change that answer, so the entry is abandoned and reported.
 *   halt      - the session is gone; stop and wait for a login.
 */
function classify(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || "";

  if (!error?.response) return { action: "retry", message: "no connection" };
  if (status === 401) return { action: "halt", message: "session expired" };
  if (status === 408 || status === 429 || status >= 500) {
    return { action: "retry", message: `server ${status}` };
  }

  // Idempotent replays. Punch-in is caught by the unique index on
  // (userId, date); punch-out by its own guard. Both mean the earlier attempt
  // did reach the server even though the response never reached us.
  if (/already punched (in|out)/i.test(message)) {
    return { action: "delivered", message };
  }

  return { action: "drop", message: message || `rejected (${status})` };
}

function buildBody(entry, photoBase64) {
  const body = { ...entry.payload, capturedAt: entry.capturedAt };

  // A trip has no natural unique key, so the server needs this to recognise a
  // replay instead of starting a second trip.
  if (entry.kind === KINDS.TRIP_START) {
    body.clientRequestId = entry.id;
  }

  if (photoBase64) body.photo = photoBase64;
  return body;
}

/**
 * Sends queued entries oldest-first.
 *
 * Stops at the first entry that needs retrying. That is the point: a punch-out
 * delivered before its punch-in would be rejected as "no punch in found" and
 * then dropped, silently losing a real day's work.
 */
export async function drain() {
  if (draining) return { skipped: true };
  draining = true;

  const summary = { sent: 0, dropped: 0, remaining: 0, halted: false, rejections: [] };

  try {
    for (;;) {
      const entry = await queue.peek();
      if (!entry) break;

      const endpoint = ENDPOINTS[entry.kind];
      if (!endpoint) {
        // Unknown kind, most likely written by a newer build. Nothing can
        // deliver it, so it must not block everything behind it.
        await queue.remove(entry.id);
        summary.dropped += 1;
        continue;
      }

      const photo = await queue.readPhoto(entry);

      try {
        breadcrumb(`sync: sending ${entry.kind} queued at ${entry.capturedAt}`);
        await api.post(endpoint, buildBody(entry, photo), { timeout: SEND_TIMEOUT_MS });

        await queue.remove(entry.id);
        summary.sent += 1;
      } catch (error) {
        const { action, message } = classify(error);

        if (action === "delivered") {
          await queue.remove(entry.id);
          summary.sent += 1;
          continue;
        }

        if (action === "halt") {
          summary.halted = true;
          break;
        }

        if (action === "drop") {
          // Worth reporting: the employee believes this punch exists.
          reportError(error, `sync dropped ${entry.kind}: ${message}`);
          await queue.remove(entry.id);
          summary.dropped += 1;
          summary.rejections.push({ kind: entry.kind, message });
          continue;
        }

        const updated = await queue.recordFailure(entry.id, message);
        if (updated && updated.attempts >= MAX_ATTEMPTS) {
          reportError(
            new Error(`gave up after ${updated.attempts} attempts: ${message}`),
            `sync abandoned ${entry.kind}`
          );
          await queue.remove(entry.id);
          summary.dropped += 1;
          summary.rejections.push({ kind: entry.kind, message });
          continue;
        }

        // Transient: leave it at the front and stop, preserving order.
        break;
      }
    }
  } finally {
    summary.remaining = await queue.size();
    draining = false;
    emit(summary);
  }

  return summary;
}

/** Drains now if anything is waiting. Safe to call from anywhere, often. */
export async function syncIfPending() {
  if (draining) return null;
  if ((await queue.size()) === 0) return null;
  return drain();
}

/**
 * Starts the background triggers. Called once, from the auth provider, so the
 * queue only drains while somebody is signed in -- the requests need a token.
 */
export function start() {
  stop();

  appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") syncIfPending();
  });

  timer = setInterval(() => {
    syncIfPending();
  }, RETRY_INTERVAL_MS);

  // Opportunistic: adds instant reconnect syncing if NetInfo is ever added.
  // Guarded because it is a native module and this file must not assume it.
  try {
    // eslint-disable-next-line global-require
    const NetInfo = require("@react-native-community/netinfo").default;
    netInfoSub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) syncIfPending();
    });
  } catch (err) {
    // Not installed. AppState and the interval already cover the common cases.
  }

  syncIfPending();
}

export function stop() {
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (netInfoSub) {
    netInfoSub();
    netInfoSub = null;
  }
}

export const __private = { classify, buildBody, ENDPOINTS, MAX_ATTEMPTS };
