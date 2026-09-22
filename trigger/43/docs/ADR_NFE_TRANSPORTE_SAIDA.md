# ADR — Transporte e volumes na NF-e de saída (FAT → Focus)

**Status:** Aceito  
**Data:** 2026-09-18 · emenda 2026-09-22 (herança CIF/FOB + transportadora do ORC)  
**Contexto 43:** emissão Focus  
**Relacionada:** `ADR_EMISSAO_NFE_NFSE.md` · `ADR_ORC_FRETE_ESTIMADO.md` · `ADR_ENTREGA_EXPEDICAO.md` · `ADR_PA_EMBALAGEM_BOBINA_CAIXA.md` · `ADR_OC_RASCUNHO_ENVIO.md` (espelho CIF/FOB + PAR)

---

## Contexto

A NF-e de saída já envia `volumes` parciais (caixas PA) e fixava `modalidade_frete = 9`, sem `transporta`. O ORC já trava o modo de entrega; o PAR transportadora e a embalagem PA já existem. O ENT nasce **depois** da NF (`politica_nf_antes_expedir`) — não pode ser a fonte do payload Focus.

## Decisão

```
ORC modo_entrega (+ mod_frete / transportador_id em Terceiros)
  → PED snapshot
  → FAT: mod_frete + transportador_id (confirma / edita; default = snapshot ORC)
  → FocusPayloadBuilder (NFE)
       ├─ modalidade_frete (Focus 0|1|9)
       ├─ transporta* quando terceiros
       └─ volumes ← PaEmbalagem.caixas (qVol + esp CAIXA)
  → ENT ecoa volumes / transportadora já decididos no FAT
```

| Campo FAT | Semântica |
|-----------|-----------|
| `mod_frete` | `9` retirar · `0` CIF / própria (emitente) · `1` FOB (destinatário) — vocabulário Focus |
| `transportador_id` | FK PAR `papel_transportadora`; **obrigatório** se modo `ENTREGA_TERCEIROS` |

### Defaults a partir do snapshot

| `modo_entrega` | `mod_frete` default | Transportador |
|----------------|---------------------|---------------|
| `RETIRAR` | `9` | omitir |
| `ENTREGA_PROPRIA` / legado `ENTREGAR` | `0` | omitir (frota) |
| `ENTREGA_TERCEIROS` | snapshot `mod_frete` se presente; senão `0` (CIF); UI pode marcar `1` FOB | snapshot `transportador_id` se presente; senão obrigatório na UI do faturar |

A condição comercial (CIF/FOB + transportadora) **nasce no ORC** quando o modo é Terceiros (`ADR_ORC_FRETE_ESTIMADO`). O FAT confirma ou ajusta — não inventa outro vocabulário.

### Volumes

Fonte única: `PaEmbalagem.qtde_caixas` → Focus `volumes[].quantidade` + `especie: CAIXA`.  
**Não** inventar `marca` / `nVol` / `pesoB` / `pesoL` / CUB nesta fatia.

### Fronteiras

- Dono fiscal do transporte = **FAT** (planejar/emitir). ENT não reabre o hub.
- Frete R$ do ORC continua informativo — não vira `valor_frete` na NF nesta onda.
- Sem CT-e / TMS / CCe de transporte.

## Proibido

1. Preencher transportador/peso a partir do ENT para montar a emissão.  
2. Hardcodar `modalidade_frete = 9` quando o modo já é própria/terceiros.  
3. Inventar peso/CUB.  
4. Misturar `estoque_lotes` / `VOL:` de MP com volumes de PA.  
5. Alterar R1–R20 ou somar frete no FAT por causa deste ADR.

## Rastreio

- `FiscalSaidaTransporte` · `FocusPayloadBuilder` · `FaturamentoService` · migration `mod_frete`/`transportador_id` em `faturamentos`
- Testes: `EmissaoFiscalSaidaTest` (payload transporte/volumes)
