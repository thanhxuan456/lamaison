import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const secret =
    process.env.CONTACT_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    "default-development-key-please-set-CONTACT_ENCRYPTION_KEY";
  // Derive a stable 32-byte key from the secret.
  return createHash("sha256").update(`grand-palace-contact-v1:${secret}`).digest();
}

const KEY = getKey();

/**
 * Encrypt a plaintext string. Output is "enc:v1:<base64(iv|tag|cipher)>".
 * Returns "" for null/empty input.
 */
export function encryptString(plain: string | null | undefined): string {
  if (plain == null || plain === "") return "";
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64");
  return PREFIX + payload;
}

/**
 * Decrypt a value produced by encryptString. If the value is not in our
 * encrypted format (legacy plaintext rows), returns it unchanged.
 */
export function decryptString(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext fallback
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const cipher = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(cipher), decipher.final()]);
    return out.toString("utf8");
  } catch {
    return "[không giải mã được]";
  }
}
