import https from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';

export interface GovHttpResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

export interface GovHttpOptions {
  method: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  agent?: https.Agent;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * HTTP client for gov.br APIs (SEFIN/ADN).
 * Native fetch ignores `agent` — mTLS requires node:https with a custom Agent.
 * SEFIN also requires HTTP/1.1 (configure ALPNProtocols on the Agent).
 */
export function govHttpRequest(url: string, options: GovHttpOptions): Promise<GovHttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const timeoutMs = options.timeoutMs ?? 60_000;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };

    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method,
        headers: options.headers,
        agent: options.agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          finish(() => {
            resolve({
              status: res.statusCode ?? 0,
              headers: res.headers,
              body: Buffer.concat(chunks),
            });
          });
        });
        res.on('error', (err) => finish(() => reject(err)));
      },
    );

    const timeout = setTimeout(() => {
      req.destroy(new Error('Request timed out'));
    }, timeoutMs);

    req.on('error', (err) => {
      finish(() => {
        if (options.signal?.aborted) {
          reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
          return;
        }
        reject(err);
      });
    });

    if (options.signal) {
      if (options.signal.aborted) {
        req.destroy(new Error('The operation was aborted'));
        return;
      }
      options.signal.addEventListener(
        'abort',
        () => req.destroy(new Error('The operation was aborted')),
        { once: true },
      );
    }

    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
}
