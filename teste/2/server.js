const readline = require("readline");

const SERVER_INFO = {
  name: "mcp-servidor-didatico",
  version: "1.0.0",
};

function sendResponse(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function sendError(id, code, message) {
  process.stdout.write(
    `${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`
  );
}

function handleRequest(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    sendResponse(id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: SERVER_INFO,
    });
    return;
  }

  if (method === "tools/list") {
    sendResponse(id, {
      tools: [
        {
          name: "saudacao",
          description: "Retorna uma saudacao personalizada",
          inputSchema: {
            type: "object",
            properties: {
              nome: { type: "string", description: "Nome da pessoa" },
            },
            required: ["nome"],
          },
        },
      ],
    });
    return;
  }

  if (method === "tools/call") {
    if (params?.name !== "saudacao") {
      sendError(id, -32602, "Ferramenta nao encontrada");
      return;
    }

    const nome = params?.arguments?.nome;
    if (!nome || typeof nome !== "string") {
      sendError(id, -32602, "Parametro 'nome' deve ser string");
      return;
    }

    sendResponse(id, {
      content: [
        {
          type: "text",
          text: `Ola, ${nome}! Este texto veio de um servidor MCP.`,
        },
      ],
    });
    return;
  }

  sendError(id, -32601, `Metodo nao suportado: ${method}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    handleRequest(msg);
  } catch {
    sendError(null, -32700, "JSON invalido");
  }
});
