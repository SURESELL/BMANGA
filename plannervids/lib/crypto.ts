import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { getEnv } from "@/lib/env";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function key(): Buffer {
  const raw = Buffer.from(getEnv().CREDENTIALS_ENCRYPTION_KEY, "base64");
  if (raw.length !== 32) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 of `openssl rand -base64 32`)"
    );
  }
  return raw;
}

// Used to encrypt OAuth access/refresh tokens before they are persisted.
// Ciphertext format: base64(iv):base64(authTag):base64(ciphertext)
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
