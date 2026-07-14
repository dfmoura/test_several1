import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'nfse_session';

export function createAuth(sessionSecret: string, webPassword: string) {
  function signSession(): string {
    const exp = Date.now() + 24 * 60 * 60 * 1000;
    const payload = JSON.stringify({ exp });
    const sig = createHmac('sha256', sessionSecret).update(payload).digest('hex');
    return Buffer.from(`${payload}.${sig}`).toString('base64url');
  }

  function verifySession(token: string | undefined): boolean {
    if (!token) return false;
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const lastDot = decoded.lastIndexOf('.');
      if (lastDot === -1) return false;
      const payload = decoded.slice(0, lastDot);
      const sig = decoded.slice(lastDot + 1);
      const expected = createHmac('sha256', sessionSecret).update(payload).digest('hex');
      if (sig.length !== expected.length) return false;
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
      const data = JSON.parse(payload) as { exp: number };
      return data.exp > Date.now();
    } catch {
      return false;
    }
  }

  function login(password: string): boolean {
    return password === webPassword;
  }

  return { signSession, verifySession, login, COOKIE_NAME };
}

export type Auth = ReturnType<typeof createAuth>;
