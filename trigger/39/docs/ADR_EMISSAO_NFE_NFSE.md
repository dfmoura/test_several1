# ADR-039-FIS-001 — Emissão NF-e / NFS-e no faturamento (hub Focus)

**Status:** Aceito  
**Data:** 2026-08-13  
**Contexto 39:** BL-051  
**Norma:** `../32` — `FATURAMENTO_GERACAO_COBRANCA.txt` · `CASOS_USO_M05_FISCAL.txt` (UC-FIS-001/002/005) · `ARQUITETURA_ENGENHARIA_MELHORES_PRATICAS.txt`  
**Layout / contrato Focus:** `../28` — `docs/FOCUS_NFE_MAPEAMENTO.md` · `packages/focus-nfe` · `modelos/nfe` · `modelos/nfse`  
**Relacionada:** `ADR_FATURAMENTO_COBRANCA.md` (emenda)

---

## Contexto

O FAT já nasce com TIT/COB do saldo. O estudo manda o documento fiscal andar no mesmo faturamento — **sem o ERP inventar série/número SEFAZ**. O cliente Focus (`FocusNfeClient`) só testava conexão (BL-006).

Homologação precisa do pipeline completo, como se o hub Focus já estivesse em uso. Quando o cadastro do hub ficar OK, a emissão liga sozinha.

## Decisão

```
PED PRODUZIDO → preview (FAT + plano fiscal) → confirma
  → FAT + TIT/COB          (igual BL-049/050; não espera SEFAZ)
  → DocumentoFiscalSaida   (NFE e/ou NFSE, 1 de cada tipo no FAT)
       ├─ hub OK + checklist OK → POST Focus (ref idempotente)
       ├─ hub/cadastro incompleto → PLANEJADO (retry depois)
       └─ rejeição/rede → REJEITADO/ERRO no documento; FAT e cobrança intactos
```

| Escolha | Motivo |
|---------|--------|
| **FAT não espera NF** | Cobrança do saldo já opera. SEFAZ/Focus instável não pode travar TIT/COB. Estudo: documento fiscal ≠ título, nascem juntos. |
| **Dois tipos, um FAT** | PA/REV/FAC → **NF-e** (mod. 55). SVC → **NFS-e Nacional** (`/v2/nfsen`). Pedido misto gera os dois. Sem split dual de um mesmo item PA (isso era o 28; o estudo 32 classifica pela família). |
| **Numeração só do Focus** | Payload **omite** `numero` / `numero_dps`. Série default 1 (ou `meta` do hub). Chave/número só na resposta. |
| **Ativação automática** | Teste OK do **ambiente ativo** + hub padrão ativo + token → `emissao_habilitada`. Trocar ambiente ou falhar o teste desliga. Sem segundo botão. |
| **IM opcional** | NF-e nunca exige inscrição municipal. NFS-e só exige se `empresas.im_obrigatoria_nfse` (município exige). Default: não exige. |
| **HTTP depois do commit** | Planeja na mesma transação do FAT. POST Focus após commit. Falha fiscal não desfaz FAT. |
| **Estoque PA intacto** | Continua só na NF **autorizada** (fase seguinte). Esta fatia não baixa PA. |
| **Retry = mesma `ref`** | UC-FIS-005. `POST /faturamentos/{id}/emitir-nf` reenvia documentos não autorizados. |
| **Prévia ≠ autorização** | Sem hub, o documento permanece `PLANEJADO` com JSON Focus. UI: card humano + **DANFE / DANFSe HTML A4** (Imprimir / Salvar como PDF) + payload de envio. Vale em **homologação e produção**. **Não** grava chave 44, número SEFAZ, XML `nfeProc` nem DANFE oficial do Focus. Número/série/chave/protocolo ficam **—** até autorizar. Quando o hub for cadastrado, o mesmo `DFS-` / mesma `ref` é enviado. |

### Status

| Documento | Significado |
|-----------|-------------|
| `PLANEJADO` | Payload montado; ainda não enviado (ou aguarda hub). Prévia visível; sem chave/número/XML oficial. |
| `PROCESSANDO` | Focus aceitou; aguarda autorização. |
| `AUTORIZADO` | Chave/número/protocolo gravados. |
| `REJEITADO` | SEFAZ/Focus recusou o XML. |
| `ERRO` | Rede/5xx — retry com a mesma ref. |
| `CANCELADO` | FAT estornado (ainda sem NF autorizada). |

`faturamentos.nf_status` deriva dos documentos: `PENDENTE` (planejado/erro) · `PROCESSANDO` · `AUTORIZADA` (todos os tipos do plano) · `REJEITADA`.

Estorno comercial (BL-050) permanece: só com `nf_status` `PENDENTE` ou `REJEITADA` (nada autorizado/processando).

### Checklist (não bloqueia FAT)

Emissão exige: EMP apta ao tipo, PAR destinatário/tomador apto, hub habilitado, NCM/CFOP (NF-e) ou código ISS/NBS (NFS-e, com default de homologação do 28). Pendências aparecem no preview como aviso fiscal.

## Fora de escopo

- Baixa de estoque PA/REV na autorização  
- Cancelamento Focus / CCe / inutilização  
- ENT- / DANFE gerado no servidor / e-mail XML (prévia imprimível = HTML A4 no layout DANFE/DANFSe; XML/`nfeProc` e DANFE oficiais do Focus só após o hub)  
- Catálogo de séries `SerieDocumentoFiscal`  
- Split dual mercadoria×serviço de um único item PA (contador+ADR)  
- NFS-e municipal legado (não nacional)

## Proibido

1. Inventar chave 44, série ou número SEFAZ/DPS.  
2. Desfazer FAT/TIT/COB porque a NF falhou.  
3. Exigir IM para NF-e, ou para NFS-e sem a flag municipal.  
4. Emitir em produção sem token de produção e teste OK nesse ambiente.  
5. Segundo documento do mesmo tipo no mesmo FAT (idempotência).  
6. Misturar EMP (`empresa_id` do contexto).  
7. PRODUÇÃO emitir NF.  
8. Gravar chave, número SEFAZ ou XML `nfeProc` de mentira para “simular” hub. Prévia = JSON Focus + DANFE/DANFSe HTML com marca **PRÉVIA SEM VALOR FISCAL**, status `PLANEJADO`.

Alterar esta ADR exige alinhamento explícito ao estudo 32 e ao contrato Focus do 28.
