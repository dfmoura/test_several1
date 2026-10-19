# ADR — Transporte e volumes na NF-e de saída (FAT → Focus)

**Status:** Aceito  
**Data:** 2026-09-18 · emenda 2026-09-22 (herança CIF/FOB + transportadora do ORC) · emenda 2026-10-19 (peso líquido e bruto)  
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

Fonte da quantidade: `PaEmbalagem.qtde_caixas` → `volumes[].quantidade` + `especie: CAIXA`.  
Marca = nome fantasia do emitente. Numeração = faixa das caixas (`nVol`, até 60).  
**Não** inventar placa, ANTT nem CUB.

### Peso (kg, 3 casas) — emenda 2026-10-19

Um único `vol` na NF-e. `pesoL` e `pesoB` saem no XML e na Focus. Sem peso na descrição do item.

| Parcela | Conta |
|---------|--------|
| Líquido da etiqueta | m² travado da faixa × gramatura de expedição / 1000. Default **160 g/m²** (0,16 kg/m²), o conjunto que viaja. |
| Override | `atributos.gramatura_expedicao_g_m2` do papel, quando existir. |
| Revenda | quantidade × `atributos.peso_kg` do SKU. Unidade KG: a quantidade já é o quilo. Sem peso no SKU, a parcela não entra. |
| Serviço | não pesa. |
| Bruto | líquido + (bobinas × peso do tubete) + (caixas × peso da caixa). |

A gramatura de estoque (`gramatura_g_m2`) e o consumo da OP ficam fora. Perda de acerto não viaja.

Tubete e caixa: `atributos.peso_kg` da peça vence. Sem ele, a caixa usa a área do papelão (550 g/m² de chapa) e o tubete a casca (750 kg/m³; parede 2 mm em 1" e 1 1/2", 3 mm em 3"). Comprimento do SKU abaixo de 20 mm não tem unidade confiável e cede à largura da bobina (`largura_cm` × colunas de rebobinação). Sem líquido, a nota não publica peso — tara sozinha não vira `pesoL`.

### Fronteiras

- Dono fiscal do transporte = **FAT** (planejar/emitir). ENT não reabre o hub.
- Frete R$ do ORC continua informativo — não vira `valor_frete` na NF nesta onda.
- Sem CT-e / TMS / CCe de transporte.

## Proibido

1. Preencher transportador/peso a partir do ENT para montar a emissão.  
2. Hardcodar `modalidade_frete = 9` quando o modo já é própria/terceiros.  
3. Inventar CUB, placa ou ANTT. Usar gramatura de estoque ou consumo da OP como peso da nota. Recalcular m² na emissão.  
4. Misturar `estoque_lotes` / `VOL:` de MP com volumes de PA.  
5. Alterar R1–R20 ou somar frete no FAT por causa deste ADR.

## Rastreio

- `FiscalSaidaTransporte` · `NfePesoExpedicao` · `FocusPayloadBuilder` · `NfeXmlBuilder` · `FaturamentoService`
- Testes: `EmissaoFiscalSaidaTest` (transporte, volumes, peso) · `NfePesoExpedicaoTest`
