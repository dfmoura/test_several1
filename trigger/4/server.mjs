import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > 2_000_000) {
        reject(new Error('Payload muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleOpenAiReport(req, res) {
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || '{}');
    const token = (body?.token || process.env.OPENAI_API_KEY || '').trim();
    const model = body?.model || 'gpt-4o-mini';
    const system = body?.system || '';
    const userPrompt = body?.userPrompt || '';

    if (!token) {
      return sendJson(res, 400, {
        error:
          'Token ausente. Informe no campo da tela ou configure OPENAI_API_KEY no ambiente antes de iniciar o servidor.',
      });
    }
    if (!system || !userPrompt) {
      return sendJson(res, 400, { error: 'Prompt invalido.' });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    const text = await r.text();
    let json = {};
    try {
      json = JSON.parse(text || '{}');
    } catch {
      json = { raw: text };
    }

    if (!r.ok) {
      return sendJson(res, r.status, {
        error: 'Falha ao chamar OpenAI.',
        details: json,
      });
    }

    const content = json?.choices?.[0]?.message?.content || '';
    return sendJson(res, 200, { content });
  } catch (err) {
    return sendJson(res, 500, { error: err?.message || 'Erro interno.' });
  }
}

async function serveStatic(req, res) {
  let reqPath = req.url || '/';
  if (reqPath.includes('?')) reqPath = reqPath.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const full = path.normalize(path.join(__dirname, reqPath));
  if (!full.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(full).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const buff = await readFile(full);
  res.writeHead(200, { 'Content-Type': mime });
  res.end(buff);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/openai-report') {
    return handleOpenAiReport(req, res);
  }
  if (req.method === 'GET') {
    return serveStatic(req, res);
  }
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

