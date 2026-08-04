# ERP RLP — Fase 1 (1.a–1.d)

Sistema operacional **Laravel 11 + MySQL 8 + React** para a RLP Etiquetas, produto da **TRIGGER**, licenciado à RLP.

Base normativa: `../32` (domínio, cadastros, RBAC, Lightsail/AWS Cenário D) · Proposta comercial: `../37` · Esboço anterior: `../36`.

## Escopo desta fase

| Item | Entrega |
|------|---------|
| **1.a** | Login Sanctum, usuários = colaboradores (PAR papel COLABORADOR), perfis RBAC/SoD |
| **1.b** | Empresas EMP-00001 / EMP-00002 + parâmetros versionados |
| **1.c** | Cadastro único de parceiros (papéis, crédito, CNPJ/CEP via BrasilAPI/ViaCEP) |
| **1.d** | Produtos por família MP · EMB · REV · PA · SVC · FAC + **grupos canônicos** (MP-PAP, PA-ETQ, REV-RIB…) |

**Fora desta entrega:** orçamento (1.e), compras, OP, NF, financeiro operacional.

## Identidade visual

- Marca produto/fornecedor: **TRIGGER** (navy `#1a3568` · verde `#7cb518`)
- Área de licença: logo **RLP** (`branding/cliente/logo-rlp.png`) — “Licenciado para”
- Shell: logo do cliente em destaque + rodapé “Powered by TRIGGER”

## Subir (Docker — mesmo artefato para Lightsail)

```bash
cp .env.example .env
# Gere uma APP_KEY estável (ou deixe o entrypoint gerar no 1º boot)
docker compose up -d --build
```

- App (SPA + API via nginx): http://localhost:8039  
- API direta: http://localhost:8000/api/v1/health  
- Login: `admin@rlp.com.br` / `Admin@123`  
- Demos: `comercial@rlp.com.br` … (perfis) / `Demo@123`

Frontend com HMR (opcional):

```bash
cd apps/web && npm run dev   # proxy /api → :8000
```

Parar:

```bash
docker compose down
```

## Estrutura

```
apps/api/     Laravel 11 (API /api/v1, Sanctum, Spatie Permission)
apps/web/     React + TypeScript (Vite)
branding/     Logos TRIGGER + cliente RLP
docker/       PHP, Nginx, MySQL (memória enxuta)
docs/         Lightsail/futuro + guias PDF de importação (parceiros e produtos)
```

## Lightsail Free Tier (recomendação)

Ver `docs/LIGHTSAIL_E_FUTURO.md`. Resumo:

| Recurso | Escolha |
|---------|---------|
| Instância | **1 GB RAM** ($5) — 512 MB é apertado com MySQL |
| SO | Ubuntu 24.04 (ou blueprint Docker) |
| Compose | mysql + app + nginx no **mesmo** host |
| TLS | Caddy/Nginx + Let's Encrypt no host |
| Secrets | env no host / SSM — nunca na imagem |
| Não usar no dia 1 | ALB, NAT, RDS, ElastiCache (custo fixo) |

Após o 1º boot estável: `SEED_ON_BOOT=false`.

## Domínio (invariants que o código respeita)

- Identidade dupla: `id` BIGINT + `codigo` legível  
- Usuário nasce de **colaborador** (PAR)  
- Soft-delete / inativar — sem apagar histórico  
- Multi-empresa por `empresa_id` + header `X-Empresa-Id`  
- EMP-00002 com venda/estoque **desligados** até homologação  
- LAI / grupo 9.xx **proibido**

## Próximo (1.e)

Orçamento ORC → envio → link de aceite (ainda sem PED/NF).
