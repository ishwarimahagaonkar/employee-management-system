// Punch selfies live on disk, not inside MongoDB documents.
//
// They used to be stored as base64 strings on the attendance record, which
// made a single company's attendance list ~27 MB and pushed it past the
// mobile app's request timeout. Documents now hold a short file reference
// and the image is read back only when an admin opens that one record.
//
// Files are served through the authenticated controller rather than a public
// static route, so a selfie is never reachable by URL alone.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ATTENDANCE_DIR = path.join(__dirname, "../../uploads/attendance");

// Refuse anything absurd; a compressed punch selfie is well under this.
const MAX_BYTES = 8 * 1024 * 1024;

// A stored reference looks like "attendance/<random>.jpg". Anything else
// (notably a legacy inline base64 blob) is handled separately on read.
const REF_PATTERN = /^attendance\/[A-Za-z0-9._-]+$/;

function isStoredRef(value) {
    return typeof value === "string" && REF_PATTERN.test(value);
}

/**
 * Persist a base64 punch photo and return its storage reference.
 * Returns null when there is no usable image, so callers can just assign
 * the result without extra branching.
 */
function savePunchPhoto(base64) {
    if (!base64 || typeof base64 !== "string") return null;

    // Already stored (e.g. a record being re-saved) -- keep the reference.
    if (isStoredRef(base64)) return base64;

    const cleaned = base64.replace(/^data:image\/[A-Za-z]+;base64,/, "").trim();
    if (cleaned.length < 100) return null;

    let buffer;
    try {
        buffer = Buffer.from(cleaned, "base64");
    } catch (err) {
        return null;
    }

    if (!buffer.length || buffer.length > MAX_BYTES) return null;

    fs.mkdirSync(ATTENDANCE_DIR, { recursive: true });

    // Random name: the file is only ever served through an authorised
    // controller, and an unguessable name avoids accidental enumeration.
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.jpg`;
    fs.writeFileSync(path.join(ATTENDANCE_DIR, name), buffer);

    return `attendance/${name}`;
}

/**
 * Read a stored photo back as base64 for the client. Tolerates legacy
 * records whose field still holds the raw base64 image.
 */
function readPunchPhoto(ref) {
    if (!ref || typeof ref !== "string") return null;

    // Legacy inline image -- hand it back untouched.
    if (!isStoredRef(ref)) return ref;

    try {
        const file = path.join(ATTENDANCE_DIR, path.basename(ref));
        if (!fs.existsSync(file)) return null;
        return fs.readFileSync(file).toString("base64");
    } catch (err) {
        return null;
    }
}

/**
 * Remove the files behind a set of references. Used when attendance records
 * are cascade-deleted so the disk doesn't fill with orphans.
 */
function deletePunchPhotos(refs) {
    let removed = 0;

    for (const ref of refs || []) {
        if (!isStoredRef(ref)) continue;

        try {
            const file = path.join(ATTENDANCE_DIR, path.basename(ref));
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                removed += 1;
            }
        } catch (err) {
            // Best effort -- a stuck file must never block the delete.
        }
    }

    return removed;
}

module.exports = { savePunchPhoto, readPunchPhoto, deletePunchPhotos, isStoredRef };
