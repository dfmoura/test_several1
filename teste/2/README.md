# MCP Server Simples (Didatico)

Este exemplo cria um servidor MCP minimo usando JSON-RPC por `stdio`.
Ele responde a 3 chamadas principais:

- `initialize`
- `tools/list`
- `tools/call` (tool `saudacao`)

## 1) Build da imagem Docker

```bash
docker build -t mcp-servidor-simples .
```

## 2) Rodar em modo interativo

```bash
docker run --rm -i mcp-servidor-simples
```

Agora envie mensagens JSON (uma por linha).

### Exemplo: initialize

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"teste","version":"1.0.0"},"capabilities":{}}}
```

### Exemplo: listar tools

```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

### Exemplo: chamar tool

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"saudacao","arguments":{"nome":"Daniel"}}}
```

## Como funciona (resumo didatico)

1. O cliente MCP envia `initialize`.
2. O servidor responde capacidades e identificacao.
3. O cliente pede `tools/list` para descobrir ferramentas.
4. O cliente usa `tools/call` para executar uma ferramenta.
5. O servidor retorna `content` com texto (ou erro JSON-RPC).

## Integracao no Cursor (conceito)

No cliente MCP, voce aponta o comando para executar esse container (`docker run --rm -i mcp-servidor-simples`) e o cliente conversa via `stdin/stdout`.
