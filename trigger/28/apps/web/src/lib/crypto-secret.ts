import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Deriva chave AES-256 a partir do AUTH_SECRET (ambiente de teste ≈ produção). */
function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET deve ter ao menos 32 caracteres");
  }
  return createHash("sha256").update(secret).digest();
}

/** Cifra payload binário (AES-256-GCM). Formato: iv(12) | tag(16) | ciphertext. */
export function encryptBytes(plain: Buffer | Uint8Array): Uint8Array {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return new Uint8Array(Buffer.concat([iv, tag, enc]));
}

export function decryptBytes(payload: Buffer | Uint8Array): Buffer {
  const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const key = deriveKey();
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function encryptText(plain: string): Uint8Array {
  return encryptBytes(Buffer.from(plain, "utf8"));
}

export function decryptText(payload: Buffer | Uint8Array): string {
  return decryptBytes(payload).toString("utf8");
}

export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Converte para Uint8Array com ArrayBuffer próprio (compatível com Prisma Bytes + TS 5). */
export function toPrismaBytes(data: Uint8Array | null): Uint8Array<ArrayBuffer> | null {
  if (!data) return null;
  const copy = new ArrayBuffer(data.byteLength);
  const view = new Uint8Array(copy);
  view.set(data);
  return view;
}
