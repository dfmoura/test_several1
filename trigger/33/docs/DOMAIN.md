# Glossário do domínio — Orçamento Flexo

| Termo | Significado |
|---|---|
| **Puxada** | Comprimento (cm) avançado pela máquina a cada ciclo da faca; vem do mapa de facas. |
| **Z** | Número de dentes / repetição do cilindro; entra no cálculo da matriz (clichê). |
| **Faca** | Ferramenta de corte (mapa ~450 itens). Define medida, puxada, Z, formato, repetição. |
| **Metragem linear** | Metros de material processados: `(puxada/100) * Q / colunas`. |
| **Metragem m²** | Área: `CEILING((Q * largura * puxada)/10000, 0.1)`. |
| **Perda acerto** | Desperdício de setup por nº de cores (tabela PERDA DE PAPEL). |
| **Matriz** | Clichê de impressão; cobrado tipicamente só no 1º pedido. |
| **Grupo de máquina** | Classificação de custo/hora: BETA/160/250/ETIRAMA, BATIDA, MODULAR. |
| **Faixa** | Uma quantidade orçada (ex.: 10k, 20k) dentro da mesma proposta. |
| **Consolidado** | Visão comercial (sem breakdown de custo interno). |
| **Tubete** | Núcleo do rolo (`1"`, `1" 1/2`, `3"`). |
| **Rebobinação** | Acabamento de rebobinar; preço em ACABAMENTOS!B6 (R$ 17). |
| **Parceiro** | Entidade mestre comercial (Party Pattern): cliente, fornecedor, vendedor e/ou usuário do sistema no mesmo registro, via papéis. |
| **Tipo de parceiro** | Papel comercial atribuído: `CLIENTE`, `FORNECEDOR`, `VENDEDOR`, `USUARIO`. Um parceiro pode ter vários. |

## TODO de negócio (não “corrigidos” silenciosamente)

1. Arredondamento `CEILING(serviço+encargos, 10)` — validar se o negócio confirma o teto sobre o total da faixa.
2. Tabela CAIXAS: hoje lookup fiel ao Excel; algoritmo `ceil(rolos/capacidade)` é fallback documentado.
3. Cores `4V` na fórmula de tinta (`$E$8*10`) — planilha usa o literal da célula; confirmar regra.
4. Linha 17 do ORÇAMENTO (5ª faixa) tem fórmula ligeiramente diferente em metragem — fora do golden atual.
