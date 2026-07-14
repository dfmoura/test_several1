# Manual — NFS-e Simples (Docker)

Guia passo a passo para colocar o sistema funcionando com o gov.br.

---

## Antes de começar

Tenha em mãos:

- [ ] Docker e Docker Compose instalados
- [ ] Certificado digital A1 e-CNPJ (`.pfx`) válido
- [ ] Senha do certificado
- [ ] CNPJ (igual ao certificado)
- [ ] Inscrição Municipal (IM) — peça na prefeitura
- [ ] Código IBGE do município emissor (7 dígitos)
- [ ] CNPJ habilitado no Padrão Nacional NFS-e

---

## Passo 1 — Configurar o `.env`

```bash
cd nfse-simples
cp .env.example .env
nano .env
```

| Variável | O que colocar |
|----------|---------------|
| `NFSE_AMBIENTE` | `homolog` (testes) ou `prod` (notas reais) |
| `NFSE_CNPJ` | Seu CNPJ (14 dígitos) |
| `NFSE_C_MUN_EMISSOR` | Código IBGE do município |
| `NFSE_INSCRICAO_MUNICIPAL` | Sua IM na prefeitura |
| `NFSE_RAZAO_SOCIAL` | Nome da empresa |
| `NFSE_WEB_PASSWORD` | Senha para entrar no painel |
| `NFSE_SESSION_SECRET` | Senha forte (mín. 16 caracteres) |
| `NFSE_GOV_MOCK` | `false` (sempre, para gov.br real) |
| `NFSE_PORT` | `18210` (padrão; mude se ocupada) |

---

## Passo 2 — Instalar certificado

```bash
cp /caminho/certificado.pfx secrets/certificado.pfx
echo "SENHA_DO_CERTIFICADO" > secrets/certificado.senha
```

Confira:

```bash
ls -la secrets/
# Deve mostrar: certificado.pfx  certificado.senha
```

---

## Passo 3 — Subir o sistema

```bash
docker compose up -d --build
```

Aguarde 1–2 minutos na primeira vez. Verifique:

```bash
docker compose ps
# STATUS deve ser "healthy" ou "running"
```

Se der erro:

```bash
docker compose logs -f
```

---

## Passo 4 — Acessar o painel

Abra no navegador: **http://localhost:18210**

(Se alterou `NFSE_PORT` no `.env`, use essa porta.)

Faça login com a senha de `NFSE_WEB_PASSWORD`.

Na tela **Início**, confira:

- Ambiente correto (Homologação ou Produção)
- Certificado com status **OK**
- Inscrição Municipal configurada

---

## Passo 5 — Testar em homologação

1. **Emitir** — preencha tomador, serviço e valor → "Emitir nota fiscal"
2. **Emitidas** — veja a nota, baixe XML/PDF
3. **Cancelar** — detalhes da nota → motivo (15+ caracteres) → confirmar
4. **Recebidas** — "Buscar no gov.br" para sincronizar notas contra seu CNPJ

---

## Passo 6 — Ir para produção

Somente após todos os testes em homologação:

1. `docker compose down`
2. Edite `.env`: `NFSE_AMBIENTE=prod`
3. Substitua o certificado de produção em `secrets/`
4. `docker compose up -d --build`

A partir daí, cada nota emitida é **real** e tem efeito fiscal.

---

## Comandos úteis

```bash
# Status e saúde
docker compose ps

# Logs em tempo real
docker compose logs -f

# Reiniciar (ex.: após trocar certificado)
docker compose restart

# Parar sem apagar dados
docker compose down

# Parar e apagar dados (CUIDADO — perde todas as notas)
docker compose down -v
```

---

## Trocar porta

Se `18210` estiver em uso:

1. Edite `.env`: `NFSE_PORT=18211` (ou outra livre)
2. Execute: `docker compose down && docker compose up -d`
3. Acesse: `http://localhost:18211`

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Porta em uso | Mude `NFSE_PORT` no `.env` e reinicie |
| Certificado inativo | Confira senha em `secrets/certificado.senha` e validade do `.pfx` |
| CNPJ não confere | `NFSE_CNPJ` deve ser igual ao do certificado |
| Nota rejeitada | Verifique IM, código IBGE e habilitação na prefeitura |
| Recebidas vazias | Clique em "Buscar no gov.br"; aguarde alguns minutos |
| Container não sobe | `docker compose logs` — confira `.env` e certificado |
| Painel não abre | `docker compose ps` — aguarde status healthy |

---

Portal oficial: https://www.gov.br/nfse
