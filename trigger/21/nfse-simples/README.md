# NFS-e Simples

Emissor de NFS-e (Padrão Nacional) via **Docker** — emitir, cancelar e consultar notas fiscais de serviço.

Um único container. Painel web + API + banco de dados na **porta 18210** (sem conflito com 8080, 3000 ou o sistema antigo em `trigger/20`).

## O que faz

| Função | Descrição |
|--------|-----------|
| **Emitir** | Gera NFS-e com certificado A1 e envia ao gov.br |
| **Cancelar** | Cancela notas autorizadas |
| **Emitidas** | Lista notas que você emitiu, baixa XML/PDF |
| **Recebidas** | Busca notas emitidas contra seu CNPJ (tomador) |

## Pré-requisitos

- Docker e Docker Compose instalados
- Certificado A1 e-CNPJ (`.pfx`) + senha
- CNPJ habilitado no Padrão Nacional NFS-e

## Como usar

### 1. Configurar

```bash
cd nfse-simples
cp .env.example .env
nano .env   # CNPJ, município IBGE, IM, senhas
```

### 2. Instalar certificado

```bash
cp /caminho/seu-certificado.pfx secrets/certificado.pfx
echo "SENHA_DO_CERTIFICADO" > secrets/certificado.senha
```

### 3. Subir

```bash
docker compose up -d --build
```

### 4. Acessar

Abra **http://localhost:18210**

Senha: valor de `NFSE_WEB_PASSWORD` no `.env`.

## Comandos do dia a dia

```bash
# Ver status
docker compose ps

# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Parar (dados preservados)
docker compose down

# Rebuild após alterações
docker compose up -d --build
```

## Porta

| Serviço | Porta padrão | Variável |
|---------|--------------|----------|
| Painel + API | **18210** | `NFSE_PORT` no `.env` |

Se 18210 estiver ocupada no seu servidor, altere `NFSE_PORT` no `.env` e reinicie:

```bash
docker compose down && docker compose up -d
```

## Ambientes

| Variável | Homologação | Produção |
|----------|-------------|----------|
| `NFSE_AMBIENTE` | `homolog` | `prod` |
| `NFSE_GOV_MOCK` | `false` | `false` |

**Teste em homologação antes de ir para produção.**

## Estrutura

```
nfse-simples/
├── .env              # Suas configurações
├── secrets/          # certificado.pfx + certificado.senha
├── docker-compose.yml
└── src/              # código (build automático no Docker)
```

Dados (notas, XMLs) ficam no volume Docker `nfse-data` — persistem entre reinícios.

Guia completo: [MANUAL.md](./MANUAL.md)
