# WhatsApp AI Agent

Assistente pessoal que responde no WhatsApp quando você está offline.

---

## Sequência completa (faça nesta ordem)

### 1. Configure o `.env`

Você já colocou o `OPENAI_API_KEY` — ótimo.

Confira também:

| Variável | O que colocar |
|----------|----------------|
| `OPENAI_API_KEY` | Seu token OpenAI (já feito) |
| `OWNER_NAME` | Seu nome (ex: Diogo) |
| `OWNER_PHONE` | Seu número com DDI (ex: 5534999909660) |
| `EVOLUTION_KEY` | Qualquer senha secreta (ex: `minha-chave-123`) — use a **mesma** nos curls abaixo |
| `EVOLUTION_INSTANCE` | Deixe `personal` |

### 2. Suba tudo

No terminal, na pasta do projeto:

```bash
docker compose up --build
```

> A imagem oficial da Evolution é `evoapicloud/evolution-api` (o antigo `atendai/...` não existe mais).

Espere até aparecer algo como `Application startup complete` / containers healthy.

Abra no navegador para testar:

- App: http://localhost:8000/health  
- Evolution: http://localhost:8085  

Se `/health` retornar `"status":"ok"`, a API está rodando.

### 3. Crie a instância do WhatsApp

Abra **outro terminal** (deixe o `docker compose` rodando) e rode:

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: minha-chave-123" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "personal",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

Substitua `SUA_EVOLUTION_KEY` pelo valor de `EVOLUTION_KEY` do `.env`  
(se não mudou, use: `your-evolution-api-key`).

### 4. Pegue o QR Code

```bash
curl http://localhost:8085/instance/connect/personal \
  -H "apikey: SUA_EVOLUTION_KEY"
```

A resposta traz um QR (base64 ou link).  
No celular: **WhatsApp → Aparelhos conectados → Conectar um aparelho** → escaneie.

### 5. Converse

Peça para alguém (ou outro número) te mandar mensagem no WhatsApp.

O agente:

1. recebe a mensagem via webhook  
2. monta o contexto  
3. chama o ChatGPT  
4. responde automaticamente  

Ele **só responde** quando recebe mensagem. Não envia spam.

---

## URLs úteis

| Serviço   | URL                          |
|-----------|------------------------------|
| App       | http://localhost:8000        |
| Health    | http://localhost:8000/health |
| Metrics   | http://localhost:8000/metrics|
| Docs      | http://localhost:8000/docs   |
| Admin     | http://localhost:8000/admin  |
| Evolution | http://localhost:8085        |
| pgAdmin   | http://localhost:5050        |

---

## Problemas comuns

**`docker compose` não sobe**  
- Docker Desktop / daemon precisa estar rodando.  
- Veja o erro com: `docker compose logs -f app`

**Curl da Evolution dá 401**  
- A `apikey` do curl tem que ser **igual** a `EVOLUTION_KEY` do `.env`.

**QR não aparece / não conecta**  
- Espere a Evolution ficar healthy: `docker compose ps`  
- Tente de novo o `/instance/connect/personal`.

**Mensagem chega mas não responde**  
- Confira logs: `docker compose logs -f app`  
- Veja se a OpenAI key está válida.  
- Confirme que a mensagem não é de grupo (só chat 1:1).

---

## Trocar para Ollama

1. Instale o Ollama no PC e puxe um modelo:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
```

2. No `.env`:

```env
AI_PROVIDER=ollama
MODEL_NAME=llama3.2
# No Docker (Linux), use o proxy abaixo. Fora do Docker: http://127.0.0.1:11434
OLLAMA_BASE_URL=http://172.17.0.1:11435
```

3. Suba o proxy (só no Linux, para o container alcançar o Ollama do host) e reinicie o app:

```bash
docker compose --profile ollama up -d ollama-proxy
docker compose up -d --force-recreate app
```

Voltar para OpenAI: `AI_PROVIDER=openai`, `MODEL_NAME=gpt-4o-mini`, reinicie o `app`.

---

## Personalidade

Edite os textos em `app/prompts/` e reinicie o container `app`.

---

## Perfil por contato (opcional)

Memória durável e **manual** por número (ex.: “é minha esposa”).  
Desligada por padrão — com `CONTACT_KB_ENABLED=false` o agente se comporta como antes.

### Pelo painel (recomendado)

1. No `.env`:

```env
CONTACT_KB_ENABLED=true
ADMIN_UI_ENABLED=true
```

2. Abra: http://localhost:8000/admin  
3. Cole o `WEBHOOK_SECRET` do `.env` e salve o contato (telefone, relação, notas).

Reinicie o app se mudou o `.env`: `docker compose up -d --build app`

### Pela API

```bash
curl -X PUT http://localhost:8000/contacts/5534999909660 \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: change-me-webhook-secret" \
  -d '{"name":"Ana","relation":"esposa","notes":"Prefere respostas curtas"}'
```

Consultar:

```bash
curl http://localhost:8000/contacts/5534999909660 \
  -H "x-webhook-secret: change-me-webhook-secret"
```

Só injeta no prompt se houver `relation` ou `notes`. Se falhar, a resposta segue normalmente (fail-open).  
Se o app ficar exposto na internet, use `ADMIN_UI_ENABLED=false`.
