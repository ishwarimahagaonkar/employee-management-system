import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

/**
 * A durable, strictly ordered queue of actions that could not reach the server.
 *
 * Attendance and travel used to be lost outright when the network dropped --
 * the employee saw "network problem, try again" and the punch was gone. Sites,
 * warehouses and basements are exactly where signal fails and exactly where
 * this app is used, so "try again" was often not something they could do.
 *
 * ORDER IS NOT OPTIONAL. A punch-out replayed before its punch-in, or a trip
 * end before its start, corrupts the record rather than merely failing. Entries
 * are drained oldest-first and the drain stops at the first one that cannot be
 * delivered -- see syncEngine.js.
 *
 * Photos never go in here. A punch selfie is a few hundred KB of base64 and
 * AsyncStorage is backed by SQLite on Android; a handful would exhaust it and
 * take unrelated app state down with them. The image goes to the filesystem and
 * the entry keeps a URI.
 */

const QUEUE_KEY = "offlineQueue.v1";
const PHOTO_DIR = `${FileSystem.documentDirectory}offline-queue/`;

// A queue this long means something is badly wrong (weeks offline, or a bug).
// Past it the oldest entries are dropped: they will be refused by the server's
// same-day rule anyway, so keeping them only wastes space.
const MAX_ENTRIES = 40;

// Every action this queue knows how to replay. Kept explicit so an unknown
// kind is caught here rather than failing halfway through a drain.
export const KINDS = {
  PUNCH_IN: "punchIn",
  PUNCH_OUT: "punchOut",
  TRIP_START: "tripStart",
  TRIP_END: "tripEnd",
};

/**
 * Enough uniqueness to make a replay recognisable to the server, which is all
 * clientRequestId needs. Not security-sensitive, so no native crypto module is
 * pulled in for it -- this file must work on any build.
 */
export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // A corrupt queue must not brick the app. Losing queued punches is bad;
    // an app that cannot start is worse.
    console.warn("[queue] unreadable, resetting:", err?.message);
    return [];
  }
}

async function writeAll(entries) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

async function ensurePhotoDir() {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

/**
 * Queue one action.
 *
 * `capturedAt` is stamped here, at the moment the employee acted -- not when
 * the entry is eventually sent. That value is the whole point of the queue:
 * the server records it as the real punch time, so a punch made at 09:00 and
 * delivered at 14:00 is still a 09:00 punch.
 */
export async function enqueue({ kind, payload, photoBase64 = null }) {
  if (!Object.values(KINDS).includes(kind)) {
    throw new Error(`offlineQueue: unknown kind "${kind}"`);
  }

  const id = newId();
  let photoUri = null;

  if (photoBase64) {
    try {
      await ensurePhotoDir();
      photoUri = `${PHOTO_DIR}${id}.jpg`;
      await FileSystem.writeAsStringAsync(photoUri, photoBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (err) {
      // A punch without its selfie is still worth keeping -- the time and
      // location are the parts payroll needs.
      console.warn("[queue] could not store photo:", err?.message);
      photoUri = null;
    }
  }

  const entry = {
    id,
    kind,
    payload,
    photoUri,
    capturedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  const entries = await readAll();
  entries.push(entry);

  // Trim from the front: the oldest are the ones the server's same-day rule
  // will refuse anyway.
  while (entries.length > MAX_ENTRIES) {
    const dropped = entries.shift();
    await deletePhoto(dropped);
  }

  await writeAll(entries);
  return entry;
}

export async function list() {
  return readAll();
}

export async function size() {
  return (await readAll()).length;
}

/** The oldest entry, or null. Draining always starts here. */
export async function peek() {
  const entries = await readAll();
  return entries[0] || null;
}

/** Reads the stored selfie back as base64, or null if it is gone. */
export async function readPhoto(entry) {
  if (!entry?.photoUri) return null;

  try {
    const info = await FileSystem.getInfoAsync(entry.photoUri);
    if (!info.exists) return null;

    return await FileSystem.readAsStringAsync(entry.photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (err) {
    console.warn("[queue] could not read photo:", err?.message);
    return null;
  }
}

async function deletePhoto(entry) {
  if (!entry?.photoUri) return;
  try {
    await FileSystem.deleteAsync(entry.photoUri, { idempotent: true });
  } catch (err) {
    // An orphaned image is harmless; failing the removal is not.
  }
}

/** Drops an entry and its photo. Called once it is delivered, or abandoned. */
export async function remove(id) {
  const entries = await readAll();
  const target = entries.find((e) => e.id === id);
  if (target) await deletePhoto(target);

  await writeAll(entries.filter((e) => e.id !== id));
}

/** Records a failed delivery so repeated failures can eventually be abandoned. */
export async function recordFailure(id, message) {
  const entries = await readAll();
  const target = entries.find((e) => e.id === id);
  if (!target) return null;

  target.attempts += 1;
  target.lastError = message || null;
  await writeAll(entries);
  return target;
}

/** Empties the queue. Used on logout -- a queued punch belongs to one session. */
export async function clear() {
  const entries = await readAll();
  for (const entry of entries) await deletePhoto(entry);
  await writeAll([]);
}

export const __private = { QUEUE_KEY, PHOTO_DIR, MAX_ENTRIES };
