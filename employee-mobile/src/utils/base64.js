const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Reads an arraybuffer response back as text.
 *
 * A request made with `responseType: "arraybuffer"` gets a buffer even when the
 * server answers with a JSON error, so the message is unreadable without this.
 * Buffer/TextDecoder can't be relied on under Hermes (see the note below), and
 * spreading a large byte array into String.fromCharCode overflows the stack --
 * hence the manual chunked loop.
 *
 * Decodes as latin1, which is exact for the ASCII JSON our API returns.
 */
export function arrayBufferToText(buffer) {
  const bytes = new Uint8Array(buffer || []);
  let out = "";

  for (let i = 0; i < bytes.length; i += 4096) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
  }

  return out;
}

// Hermes doesn't reliably expose btoa/Buffer, so binary responses (axios
// `responseType: "arraybuffer"`) are base64-encoded manually before being
// written to disk via expo-file-system.
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let result = "";
  let i;

  for (i = 0; i + 2 < bytes.length; i += 3) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += BASE64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += BASE64_CHARS[bytes[i + 2] & 63];
  }

  const remaining = bytes.length - i;
  if (remaining === 1) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[(bytes[i] & 3) << 4];
    result += "==";
  } else if (remaining === 2) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += BASE64_CHARS[(bytes[i + 1] & 15) << 2];
    result += "=";
  }

  return result;
}
