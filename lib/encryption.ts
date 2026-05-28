import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte encryption key from AUTH_SECRET using SHA-256.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for encryption");
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an API key using AES-256-GCM.
 * Returns the encrypted data and initialization vector.
 */
export function encryptApiKey(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Store encrypted data + auth tag together
  return {
    encrypted: encrypted + ":" + authTag.toString("hex"),
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts an API key that was encrypted with encryptApiKey().
 */
export function decryptApiKey(encryptedData: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");

  const [encrypted, authTagHex] = encryptedData.split(":");
  if (!encrypted || !authTagHex) {
    throw new Error("Invalid encrypted data format");
  }

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Masks an API key for display (shows first 4 and last 4 chars).
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
}
