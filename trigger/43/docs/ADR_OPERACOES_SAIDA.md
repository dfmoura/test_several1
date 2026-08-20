# ADR-039-DOM-002 — Três operações de saída (não misturar)

**Status:** Aceito  
**Data:** 2026-08-18  
**Contexto 39:** BL-067  
**Norma:** `../32` — `CADASTRO_PRODUTOS_VENDA.txt` §1/§5.6/§10.6 · `ORDEM_SERVICO.txt` · `GERACAO_ORCAMENTO.txt` §2/§10.3 · `PATRIMONIO_CONTROLE.txt` · `CASOS_USO_M05` UC-FIS-001 AL1  
**Layout NFS-e Nacional:** `../21` (`nfse-simples`) · `../28` `FOCUS_NFE_MAPEAMENTO.md` · `modelos/nfse`  
**Relacionada:** `ADR_EMISSAO_NFE_NFSE.md` · `ADR_FATURAMENTO_COBRANCA.md` · `ADR_BEM_VS_ORC_MAQUINA.md` · `MAPA_FATURAMENTO.md`

---

## Contexto

A industrialização de etiqueta (PA → OP → NF-e) está estável. Prestação de serviço (rebobinação, acerto, avulso, manutenção) e cessão de impressora (comodato/locação) estavam no **mesmo bolo**: o ORC exigia faca/papel/cores mesmo para serviço, e o sistema não dizia se comodato gera nota.

Estudo 32: três naturezas de saída (produção própria, revenda, serviço avulso). OS ≠ OP. SVC-* é catálogo fiscal curto, não mil SKUs. Contador confirma NF-e × NFS-e no caso concreto. Patrimônio tem status `CEDIDO`. NFS-e Nacional (Focus `/v2/nfsen`, exemplo `../21`) é o documento de **serviço**, não o de mercadoria.

STF Súmula Vinculante 31: **locação de bem móvel não é ISS**. Comodato (empréstimo gratuito) não tem contraprestação — **não nasce NFS-e nem NF-e de venda**.

## Decisão

Três trilhos. Mesmo ERP, mesmo PAR, mesmo `empresa_id`. **Não** três sistemas.

```
                    ┌─ INDUSTRIALIZAÇÃO / MERCADORIA
                    │    etiqueta impressa/lisa · revenda
                    │    ORC motor R1–R20 · OP · PA · NF-e 55 · NAT 1.01.01/02
ORC / cadastro ─────┤
                    ├─ PRESTAÇÃO DE SERVIÇO
                    │    rebobinação · acerto · avulso · manutenção
                    │    ORC comercial (sem BOM de etiqueta) · OS · NFS-e Nacional · NAT 1.01.03
                    │
                    └─ CESSÃO DE BEM
                         comodato (e locação cobrada, depois)
                         BEM → CES- · status CEDIDO
                         documento fiscal = NENHUM (não entra no FAT)
```

| Trilho | Quando | Execução | Documento fiscal | Estoque PA |
|--------|--------|----------|------------------|------------|
| **Industrialização** | Produz etiqueta própria (ou revende ribbon) | OP | **NF-e** mod. 55 (ICMS). Etiqueta que circula **não** vai em NFS-e 13.05 | `SAIDA_VENDA` na NF-e Focus |
| **Prestação de serviço** | Trabalho sobre material do cliente / hora / manutenção **cobrada** | OS | **NFS-e Nacional** (`/v2/nfsen`). Códigos no catálogo SVC | nenhum |
| **Cessão de bem** | Impressora no cliente (comodato) | Patrimônio | **Nenhum.** Contrato/termo. Locação cobrada ≠ ISS (SV 31) | BEM `CEDIDO`, não PA |

Pedido misto PA+SVC continua: **um FAT, dois DFS** (já era ADR fiscal). Item PA **não** vira NFS-e. Item SVC **não** vira NF-e neste produto.

### Catálogo SVC (poucas famílias)

| Código | Uso | Família | cTribNac inicial | NBS inicial |
|--------|-----|---------|------------------|-------------|
| `REBOBINACAO` | Rebobinar bobina do cliente | SVC-001 | `140101` (recondicionamento) | `121012100` |
| `ACERTO` | Acerto / corte sem industrializar PA | SVC-001 | `140101` | `121012100` |
| `AVULSO` | Serviço genérico | SVC-002 | `170202` (exemplo `../21`) | `118064000` |
| `MANUTENCAO` | Manutenção da impressora cedida (isso **é** ISS) | SVC-002 | `140101` | `121012100` |

Códigos ISS são **parâmetro do catálogo**, não hardcoded no payload. Contador pode corrigir sem reescrever o trilho. Default de homologação do 28 (`130501`) **não** se aplica a etiqueta vendida — essa continua NF-e.

### Preço do serviço

Não passa no motor R1–R20 (faca, papel, tinta). O comercial informa quantidade × valor unitário; teto para cima em múltiplo de R$ 10 (GERACAO §1.6). Snapshot guarda tipo, descrição, material do cliente, unidade, códigos ISS. `valor_etiqueta` no result = **total comercial do serviço** da faixa (mesmo contrato que o FAT já consome).

Hora-máquina no serviço é **opcional / interno** nesta fase — não explode BOM de etiqueta.

### Comodato

```
BEM ATIVO + PAR cliente → CES- VIGENTE tipo=COMODATO
  → BEM CEDIDO
  → sem ORC · sem PED · sem FAT · sem DFS
encerrar → BEM ATIVO de novo
```

Se no futuro cobrarem aluguel: TIT de locação **sem** NFS-e (SV 31) — ADR própria. Se cobrarem **manutenção**: trilho serviço `MANUTENCAO` (NFS-e), opcionalmente ligado ao `CES-`.

## Fora de escopo

- Motor R1–R20 com componentes “só máquina” para rebobinação (GERACAO §10.3) — preço comercial explícito nesta fase  
- Locação cobrada com TIT recorrente  
- Split dual mercadoria×serviço de um item PA  
- NFS-e municipal legado  
- Inventar SKU por serviço pontual  

## Proibido

1. Exigir faca/papel/cores/medida para ORC de serviço.  
2. Emitir NF-e de etiqueta (PA) como NFS-e 13.05 (o texto nacional **exclui** rótulos/etiquetas destinados a circulação — ICMS).  
3. Emitir NFS-e ou NF-e de venda no comodato.  
4. Tratar locação de bem móvel como ISS.  
5. Abrir “módulo de oficina” paralelo (OS usa PED/PAR).  
6. Baixar PA na NFS-e ou na cessão.  
7. Misturar EMP.  
8. Reescrever o motor de industrialização para caber serviço.

Alterar esta ADR exige alinhamento explícito ao estudo 32 e, no ISS, ao contador da EMP.
