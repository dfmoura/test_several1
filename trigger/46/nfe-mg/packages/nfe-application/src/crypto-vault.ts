import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function kekBytes(kek: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(kek)) {
    return Buffer.from(kek, 'hex');
  }
  return createHash('sha256').update(kek).digest();
}

export function encryptSecret(plain: Buffer | string, kek: string): string {
  const key = kekBytes(kek);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = typeof plain === 'string' ? Buffer.from(plain, 'utf8') : plain;
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payloadB64: string, kek: string): Buffer {
  const key = kekBytes(kek);
  const buf = Buffer.from(payloadB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
