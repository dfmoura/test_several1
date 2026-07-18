# Prompt · Propostas abertas · Análise de preço de mercado (IA)

## Contexto do projeto

Tela **Propostas abertas** lista itens com campos típicos:
- Descrição
- NCM
- QTD
- Valor unitário
- Total estimado

Há (ou haverá) cadastro de tokens de IA no Setup com rotação automática — ver `04-setup-tokens-ia-rotacao.md`. Este módulo **consome** esse serviço de IA; não hardcodar API key no código.

## Objetivo

Em cada registro de Propostas abertas, oferecer ação que abre uma **tela de detalhes/análise** com botão(ões) que disparam busca/estimativa de **preços de mercado** do item, usando prompt pré-montado com os dados do registro, e **persistindo** o resultado indexado ao item sem alterar o significado das tabelas oficiais de licitação.

## Requisitos funcionais

1. Na listagem de Propostas abertas: ação **“Análise de preço”** (ou equivalente) por registro.
2. Tela de detalhe do item mostrando:
   - dados do item (Descrição, NCM, QTD, Valor unitário, Total estimado)
   - botão principal: **Buscar preços de mercado**
   - o botão usa um **prompt pré-definido** (versão fixa no código/config), preenchido automaticamente com os campos do item
   - área de resultado (resumo estruturado + texto bruto opcional)
   - histórico das análises anteriores daquele item
3. Prompt pré-setado (versão base v2 — detalha sites e preços; o implementador pode refinar, mas manter a intenção):

```text
Você é um assistente especializado em pesquisa de preços de mercado para apoio à fiscalização de compras públicas no Brasil.

OBJETIVO
Com base no item abaixo, estime faixas de preço de mercado atuais no Brasil (BRL) e apresente achados concretos de sites/fontes, com o máximo de detalhe útil para verificação humana. O resultado é auxiliar — não prova oficial.

REGRAS
- Seja conservador: se houver incerteza, declare explicitamente.
- Não invente notas fiscais, CNPJs, editais, atas ou números de processo.
- Não invente URLs; se não souber o endereço exato, cite o site/canal e deixe url como null.
- Prefira produtos equivalentes; se usar similar, declare a diferença.
- Informe preços unitários em R$. Indique se inclui frete/impostos ou é só produto.
- Considere o mercado brasileiro (B2C e B2B) e, quando fizer sentido, painéis públicos de preços.

FONTES A CONSIDERAR (quando aplicável)
Marketplaces/varejo: Mercado Livre, Magazine Luiza, Amazon Brasil, Americanas, Casas Bahia, Shopee, Kabum, Pichau, loja oficial.
Atacado/B2B: Mercado Livre Empresas, catálogos B2B, distribuidores.
Referências públicas: Painel de Preços (compras.gov.br), Banco de Preços em Saúde, CATMAT/CATSER, atas/editais similares (sem inventar números).

Item:
- Descrição: {{descricao}}
- NCM: {{ncm}}
- Quantidade: {{qtd}}
- Valor unitário estimado no processo: {{valor_unitario}}
- Total estimado no processo: {{total_estimado}}

Responda em português do Brasil:
1) Resumo do item interpretado
2) Achados de preço por site/fonte (3–8 itens: site, tipo, preço unitário, produto, URL/referência, data, nota)
3) Faixa de preço unitário de mercado (mín / típico / máx) em R$
4) Comparativo com o valor unitário do processo
   O sujeito é o PROCESSO vs. o mercado (não o contrário):
   mais_barato | alinhado | mais_caro | indeterminado
   desvio_percentual_aprox = ((unitário_processo − típico_mercado) / típico_mercado) × 100
5) Observações e limitações
6) Síntese das fontes usadas

JSON final com: resumo_item, faixa_unitario, comparativo, desvio_percentual_aprox, observacoes, fontes[], achados[{site, tipo, preco_unitario, produto, url, referencia_data, nota}]

> **Normalização no servidor:** após a resposta da IA, o backend recalcula
> `comparativo` e `desvio_percentual_aprox` a partir do unitário do processo e da
> faixa/achados (típico preferencial). Evita inversão de sinal/rótulo pelo modelo.
> Limiar de alinhamento: |desvio| < 15% (mesmo critério da mediana local).
```

4. Persistir cada execução vinculada ao registro:
   - id do item/proposta
   - prompt efetivamente enviado
   - provedor/modelo usado
   - resposta (estruturada JSON se possível + texto)
   - status, erro, timestamps
5. Papéis:
   - `admin`: dispara busca e vê tudo
   - `consulta`: pode ver histórico (somente leitura), **não** dispara busca (ou conforme decisão final no auth)
6. Deixar claro na UI que o resultado é **auxiliar**, não prova oficial.

## Requisitos técnicos (persistência)

- Tabelas **novas e isoladas**, ex.:
  - `proposta_analise_preco` (cabeçalho da análise)
  - campos JSON para resposta estruturada
- FK lógica ao item de propostas abertas **sem** sobrescrever colunas oficiais
- Serviço único `analise_preco` que monta prompt + chama camada de IA (rotaciona tokens)
- Não misturar com coletores PNCP/Power BI

## Fora de escopo

- Scraping próprio complexo de marketplaces
- Substituição automática do valor estimado do processo
- Aprovação jurídica do preço

## Critérios de aceite

- Do registro → tela detalhe → botão → resultado salvo e reaparece no histórico
- Falha de token/API não corrompe o item original
- Prompt sempre leva Descrição/NCM/QTD/valores do registro atual
