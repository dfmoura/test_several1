# Motor de orçamento — planilha → domínio

Fonte: `ORÇAMENTO OFICIAL 2607171006.xlsm`  
Objetivo: portar a inteligência de precificação para um **serviço testável**, com tabelas versionadas.

## Abas → tabelas

| Aba planilha | Tabela / artefato |
|--------------|-------------------|
| PAPEL | `pricing.paper_prices` |
| ACABAMENTOS | `pricing.finish_prices` |
| TUBETE | `pricing.tube_prices` |
| TINTA / VERNIZ | `pricing.ink_rules` (+ verniz em finish se preferir) |
| HORA MÁQUINA | `pricing.machine_hour_rates` |
| HORA PARADA | regra/tabela `changeover` (fase B) |
| PERDA DE PAPEL | `pricing.waste_paper_rules` |
| PERDA DE ACABAMENTO | `pricing.waste_finish_rules` |
| CAIXAS | `pricing.box_rules` |
| MATRIZ | `pricing.matrix_rules` |
| IMPOSTO / COMISSÃO | campos no `Quote` (+ listas auxiliares) |
| MÁQUINAS | `catalog.machines` |
| MAPA_DE_FACAS* | `catalog.dies` |
| ORÇAMENTO | `PricingEngine` + `Quote` / `QuoteLine` / `QuotePriceTier` |
| CONSOLIDADO | view/PDF de apresentação ao cliente |

## Contrato do engine

```ts
type QuoteSpec = {
  measureLabel: string;
  paperWidthCm: number;
  pullCm: number;
  colors: number;
  paperName: string;
  finishName: string;
  modelsQty: number;
  columnsQty: number;
  labelsPerRoll: number;
  tubeSize: string;          // '1"' | '1" 1/2' | '3"'
  dieKind?: string;
  repeatZ?: number;
  machineCostGroup: string;  // MODULAR | BETA / 160 / ...
  rpm: number;
  changeoverMode: string;    // SEM PARADA | ...
  taxPercent: number;
  commissionPercent: number;
  usesMatrix: boolean;
  firstOrderMatrix: boolean;
};

type TierResult = {
  quantity: number;
  linearMeters: number;
  areaM2: number;
  wastes: { setup: number; finish: number; reel: number };
  rolls: number;
  boxes: number;
  hours: { machine: number; changeover: number; reelChange: number };
  costs: {
    paper: number; machine: number; changeover: number; reelChange: number;
    ink: number; finish: number; rewind: number; tube: number; box: number;
    service: number; commission: number; tax: number;
  };
  labelPrice: number;   // política ceil
  matrixPrice: number;
  totalPrice: number;
  breakdown: Record<string, unknown>;
};

interface PricingEngine {
  calculate(spec: QuoteSpec, quantities: number[], versionId: string): TierResult[];
}
```

## Fórmulas (espelho da aba ORÇAMENTO)

Variáveis de cabeçalho (ex.):

- `D8` = puxada (cm)  
- `C8` = largura papel  
- `I8` = colunas  
- `J8` = etiq/rolo  
- `E8` = cores  
- `F8` = papel  
- `G8` = acabamento  
- `B10` = tubete  
- `H10` = imposto %  
- `C18` = RPM  

Para quantidade `B` (ex. 10000):

1. **Metragem linear** `G` ≈ `(D8/100) * B / I8`  
2. **m²** `H` ≈ `CEILING((B * C8 * D8) / 10000, 0.1)`  
3. **Perda acerto** `I` ← lookup cores em PERDA DE PAPEL  
4. **Perda acabamento** `J` ← lookup acabamento  
5. **Perda troca bobina** `K` ← 0 se `G <= 1000`, senão regra da planilha  
6. **Hora máquina** `D` ≈ `(((D8/100)*B/I8)/RPM) + 1` (conforme fórmula atual)  
7. **Rolos** `L` = `B / J8`  
8. **Caixas** ← lookup `tubete + rolos` em CAIXAS  

Custos (linha de valores):

- Papel = `(H+I+K) * preço_papel_m2`  
- Máquina = horas × taxa (por grupo/cores)  
- Tinta = se cores>0: se `(H+I)<=30` → `cores*10` senão `(H+I)*0.4` (regra TINTA)  
- Acabamento = preço_acab × `(H+I+J)` (conforme VLOOKUP atual)  
- Rebobinação = f(metragem, colunas, rewind) × taxa rebobinação  
- Tubete = rolos × preço tubete  
- Caixa = qtd_caixas × preço unitário caixa  

```
servico = soma(custos)
comissao = servico * %comissao
imposto  = servico * %imposto
bruto    = servico + comissao + imposto
valor_etiqueta = CEILING(bruto, 10)     # política comercial atual
valor_matriz   = CEILING(matriz_calc, 1) se 1º pedido
total          = valor_etiqueta + valor_matriz
```

> Qualquer divergência encontrada ao portar: **documentar exceção** e fixar teste com o valor da planilha como golden file.

## Caso dourado (regressão)

Da planilha (exemplo consolidado):

- Cliente: BANCA DO DINEI  
- Material: BOPP BRILHO · 5,0×2,5 · COLD STAMP + COLA · 1000 etiq/rolo · 1 cor  

| Qtd | Valor etiqueta (planilha) | Matriz |
|-----|---------------------------|--------|
| 10000 | 550 | 94 |
| 20000 | 850 | 94 |
| 40000 | 1450 | 94 |
| 60000 | 2040 | 94 |

Teste automatizado deve reproduzir esses totais (± R$ 0,01 nos intermediários; totais ceiling exatos).

## Versionamento

1. Importador CSV/XLSX → cria `price_table_versions`  
2. Marca `is_current = true`  
3. Orçamento grava `price_version_id` e `breakdown` JSON  
4. Recálculo posterior **não** altera orçamentos aprovados  

## O que não vai para o engine

- Layout VBA / botões da planilha  
- Abas históricas duplicadas de mapa de facas (consolidar em `catalog.dies`)  
- Imposto “lista 12..25” como entidade — vira campo editável no orçamento com default da empresa
