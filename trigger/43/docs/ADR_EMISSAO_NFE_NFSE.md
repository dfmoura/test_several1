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
| **Estoque PA/REV na NF oficial** | `SAIDA_VENDA` só quando o DFS está `AUTORIZADO` origem `FOCUS` (tipo NFE). Stub, prévia e NFS-e não baixam. Idempotente (1 MOV por DFS). |
| **Prévia ≠ autorização** | Sem hub em homolog/prod: `PLANEJADO` + JSON Focus + DANFE HTML (marca **PRÉVIA**). **Não** grava chave/XML como se fossem do fisco. Local com `FISCAL_EMISSOR=stub`: origem `STUB` (emenda). Hub apto: mesma `ref` vai ao Focus. |
| **Retry = mesma `ref`** | UC-FIS-005. `POST /faturamentos/{id}/emitir-nf` reenvia não autorizados **e** promove STUB → Focus. |

### Status

| Documento | Significado |
|-----------|-------------|
| `PLANEJADO` | Payload montado; ainda não enviado (ou aguarda hub). Prévia visível; sem chave/número/XML oficial. |
| `PROCESSANDO` | Focus aceitou; aguarda autorização. |
| `AUTORIZADO` | Chave/número/protocolo gravados. `oficial` só se origem `FOCUS`. Origem `STUB` = teste, sem valor fiscal. |
| `REJEITADO` | SEFAZ/Focus recusou o XML. |
| `ERRO` | Rede/5xx — retry com a mesma ref. |
| `CANCELADO` | FAT estornado (ainda sem NF autorizada). |

`faturamentos.nf_status` deriva dos documentos: `PENDENTE` (planejado/erro) · `PROCESSANDO` · `AUTORIZADA` (todos os tipos do plano) · `REJEITADA`.

Estorno comercial (BL-050) permanece: só com `nf_status` `PENDENTE` ou `REJEITADA` (nada autorizado/processando).

### Checklist (não bloqueia FAT)

Emissão exige: EMP apta ao tipo, PAR destinatário/tomador apto, hub habilitado, NCM/CFOP (NF-e) ou código ISS/NBS (NFS-e, com default de homologação do 28). Se o item PA/REV tem SKU, saldo insuficiente ou inventário aberto **bloqueia o POST Focus** — o FAT já nasceu. Sem SKU: aviso, a nota não baixa estoque.

## Emenda — SAIDA_VENDA na autorização Focus (BL-066)

```
DFS NFE AUTORIZADO origem FOCUS
  → MOV SAIDA_VENDA (qtde da linha de produto do FAT)
  → saldo PA/REV − qtde_faturavel
Stub / PLANEJADO / NFSE / REJEITADO → nenhum MOV
```

Falha de saldo **depois** da autorização (consultar assíncrono) não desfaz a nota: mensagem no DFS, sem segundo MOV. Cancelamento Focus que estorna o MOV fica para a fatia seguinte.

## Fora de escopo

- Cancelamento Focus / CCe / inutilização / estorno de `SAIDA_VENDA`  
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
8. Gravar chave, número SEFAZ ou XML `nfeProc` **como se fossem do fisco**. Prévia sem hub = JSON Focus + DANFE/DANFSe HTML com marca **PRÉVIA SEM VALOR FISCAL**, status `PLANEJADO`. Autorização de teste (abaixo) não é exceção a esta regra: origem `STUB`, nunca `oficial`.  
9. Baixar estoque PA/REV no FAT, no stub, na NFS-e ou na prévia.

Alterar esta ADR exige alinhamento explícito ao estudo 32 e ao contrato Focus do 28.

## Emenda — emissor de teste sem A1 (BL-065)

O certificado A1 mora na **Focus NFe**, não no emissor do ERP (BL-006). O cofre cifrado por EMP (`ADR_CERTIFICADO_A1_EMPRESA.md`) é cadastro seguro na ficha Empresas — **não** substitui o A1 no hub Focus para autorização SEFAZ. Sem A1 no hub, Focus homolog/prod não autoriza. Estudo 32: DEV usa mock; HML usa Focus homolog + A1 de homolog; PROD usa Focus prod + A1 de prod.

```
FISCAL_EMISSOR=stub   só local/testing
  → hub Focus apto?  → sempre Focus (A1/token OK)
  → senão            → autoriza DocumentoFiscalSaida com origem STUB
                       chave 44 sintética (tpEmis=9) · protocolo SIM- · sem XML nfeProc
```

| Guarda | Efeito |
|--------|--------|
| `ERP_STAGE` homolog / production | Stub morto, mesmo com `FISCAL_EMISSOR=stub`. |
| Hub padrão com teste OK | Stub morto. POST Focus. |
| Mesma `ref` | Stub pode ser **promovido**: emitir-nf envia ao Focus e substitui chave/origem. |
| `oficial` | Só `AUTORIZADO` + origem `FOCUS`. Stub = `simulada`, selo **SEM VALOR FISCAL**. |
| Estorno | Stub não trava (não é NF do fisco). Focus autorizado continua bloqueando. |
| Estoque PA | Continua só na autorização **Focus**. Stub não baixa PA. |

Homologação formal da NF (HT-FAT-02) continua exigindo A1 de homologação no hub Focus. O stub não substitui isso — só destrava o fluxo ERP no notebook, no mesmo espírito do `BANK_PROVIDER=mock`.
