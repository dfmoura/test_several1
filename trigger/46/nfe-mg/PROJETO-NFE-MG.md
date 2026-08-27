# Projeto: Sistema NF-e MG — Emissor Multi-tenant (SEFAZ-MG)

> **Escopo:** emissão de NF-e **modelo 55** (vendedores de produto) com integração **direta** nos Web Services da SEFAZ-MG, em arquitetura **multi-tenant**: cada cliente cadastra IE + certificado A1 dele.
> **Origem:** `ESTUDO-NFE-MG-SOFTHOUSE-HOMOLOGACAO.txt` · padrão de engenharia espelhado do NFS-e Nacional (`trigger/22`).

---

## 1. Visão

A softhouse **não** tem IE e **não** assina NF-e de produto de terceiro. O produto é um emissor/ERP fiscal: o cliente vendedor credencia-se no SIARE, sobe o A1, e o sistema consome SOAP 1.2 + mTLS nos endpoints `hnfe.` / `nfe.` de Minas Gerais.

Em desenvolvimento (~70% do módulo) opera com **mock da SEFAZ** — XML, chave, DANFE, filas, cancelamento, inutilização e CC-e sem certificado de cliente.

## 2. Princípios

| Princípio | Aplicação |
|-----------|-----------|
| Hexagonal | Portas para SEFAZ, certificado, banco, fila, storage |
| DDD | Agregados: Emitente, NFe, Evento, Lote, Inutilizacao |
| Idempotência | `X-Idempotency-Key` + UNIQUE (emitente, série, número, tpAmb) |
| Fail-safe | Retry recibo, DLQ, circuit breaker |
| 12-factor | Config via env, logs stdout, workers stateless |
| Segredo | PFX criptografado; senha nunca em log |

## 3. Operações fiscais

| Operação | WS SEFAZ-MG | Prioridade |
|----------|-------------|------------|
| Status do serviço | NFeStatusServico4 | P0 |
| Autorizar | NFeAutorizacao4 | P0 |
| Retorno do lote | NFeRetAutorizacao4 | P0 |
| Consultar protocolo | NFeConsultaProtocolo4 | P0 |
| Cancelar (110111) | NFeRecepcaoEvento4 | P0 |
| Carta de correção (110110) | NFeRecepcaoEvento4 | P1 |
| Inutilizar numeração | NFeInutilizacao4 | P1 |
| Consulta cadastro | CadConsultaCadastro4 | P2 |

## 4. Fluxo de autorização

```
Montar infNFe (emit = CNPJ/IE do tenant)
  → Assinar XML com A1 do emitente
  → enviNFe (indSinc=1 preferencial)
  → SOAP Autorizacao4 (mTLS do mesmo A1)
  → cStat 100: persistir procNFe
  → cStat 103/105: gravar nRec e poll RetAutorizacao (mesmo certificado)
  → Eventos posteriores em RecepcaoEvento4
```

## 5. Topologia Docker

Mesmo desenho do NFS-e: API + worker + DANFE + web + Postgres + Redis + RabbitMQ + MinIO + Traefik. Portas **19xxx**. Redes `172.29.x.x` para não colidir com o stack NFS-e (`172.28.x.x`).

Não há `nfe-sync` equivalente ao ADN: distribuição nacional de NF-e (NSU) é evolução (consulta destinatário / Manifesto), fora do MVP de emissão MG.

## 6. Modelo de dados (resumo)

`emitente` (tenant) → `serie_numeracao`, `destinatario`, `produto`, `nfe` + `nfe_item`, `evento`, `inutilizacao`, `lote`, `idempotency`, `outbox`, `audit_log`.

Object storage:

```
/{ano}/{mes}/{chave44}/nfe.xml
/{ano}/{mes}/{chave44}/procNFe.xml
/{ano}/{mes}/{chave44}/eventos/{tipo}_{seq}.xml
/danfe/{chave44}.pdf
/cert/{emitenteId}/a1.pfx.enc
```

## 7. API interna

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health/*` | liveness / readiness |
| GET/POST | `/v1/emitentes` | CRUD + wizard A1 + StatusServico |
| GET/POST | `/v1/destinatarios` | Cadastro por emitente |
| GET/POST | `/v1/produtos` | Cadastro por emitente |
| POST | `/v1/nfe` | Emitir |
| GET | `/v1/nfe` | Listar |
| GET | `/v1/nfe/{chave}` | Consultar |
| POST | `/v1/nfe/{chave}/cancelar` | Evento 110111 |
| POST | `/v1/nfe/{chave}/cce` | Evento 110110 |
| GET | `/v1/nfe/{chave}/xml` | XML / procNFe |
| GET | `/v1/nfe/{chave}/danfe` | PDF |
| POST | `/v1/inutilizacoes` | Inutilizar faixa |
| GET | `/v1/admin/*` | Dashboard, auditoria, outbox |

Headers: `X-API-Key`, `X-Emitente-Id`, `X-Idempotency-Key`, `X-Correlation-Id`.

## 8. Fases (estudo)

| Fase | Conteúdo | Neste repositório |
|------|----------|-------------------|
| 0 | Multi-tenant, cadastros, XML, DANFE, mock | **Implementado** |
| 0b | Cadastro fiscal completo (parceiro multi-papel + IBS/CBS/IS cadastro-first) | **Implementado** (ADR-005; XML reforma sob demanda) |
| 1 | Piloto homologação (A1 real, StatusServico, 1 nota, cancelamento) | Adapter SOAP pronto; exige A1 do piloto |
| 2 | Inutilização, CC-e, rejeições, retry | **Implementado** (mock + WS) |
| 3 | Produção tpAmb=1 | Flag de ambiente por emitente |

Fora do MVP: contingência FS-DA/EPEC, NFC-e 65, postos (Portaria 277/2025 / grupo ZD).

## 9. Riscos

| Risco | Mitigação |
|-------|-----------|
| PFX de cliente | AES-256-GCM, KEK, LGPD, runbook |
| Certificado expirando | Alertas 30/15/7 |
| Homologação apagada ~6 meses | Não usar como arquivo fiscal |
| Rejeição IE/CNPJ | Checklist SIARE no wizard |
| NT / layout | Versionar PL_009; CI de XML |

## 10. Referências

- SIARE: https://www2.fazenda.mg.gov.br/sol/
- SPED MG NF-e: https://portalsped.fazenda.mg.gov.br/spedmg/nfe/
- WS MG: https://portalsped.fazenda.mg.gov.br/spedmg/nfe/webservices/
- Portal nacional: https://www.nfe.fazenda.gov.br/
