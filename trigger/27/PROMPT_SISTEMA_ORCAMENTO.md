# Prompt — Sistema de Geração de Orçamento (Etiquetas Flexográficas)

Use o texto abaixo como prompt para um agente de IA ou equipe de desenvolvimento.

---

## Prompt

Você deve projetar e implementar um **sistema web de geração de orçamentos** para uma gráfica flexográfica especializada em **etiquetas adesivas em bobina/rolo**.

Hoje o processo é 100% analógico: uma planilha Excel (`.xlsm`) com ~19 abas, VLOOKUPs cruzados, macros e preenchimento manual. O objetivo é digitalizar esse fluxo mantendo a **mesma lógica de cálculo e tabelas de custo**, mas com UX moderna, cadastros editáveis, histórico, proposta comercial exportável e redução de erro humano.

### Contexto do negócio

- Produto: etiquetas impressas (flexografia) em materiais como BOPP, couchê, térmico etc.
- O orçamento combina: **especificações do serviço + escolha de faca (mapa de facas) + tabelas de custo (papel, máquina, tinta, acabamento, tubete, caixas, imposto, comissão, matriz)**.
- Um orçamento normalmente compara **várias quantidades** (ex.: 10k, 20k, 40k, 60k etiquetas) lado a lado.
- A saída comercial é um **consolidado/proposta** com preço total, unitário, valor por rolo, valor da matriz (quando cobrada no 1º pedido), prazo e validade.

### Problemas atuais da planilha (o sistema deve resolver)

1. Preenchimento manual propenso a erro (células amarelas “TEM QUE PREENCHER”).
2. Dependência de VLOOKUP e abas auxiliares frágeis.
3. Mapa de facas duplicado/desatualizado em várias abas.
4. Sem histórico versionado de orçamentos nem status (rascunho / enviado / aprovado).
5. Sem controle de quem alterou preços de custo.
6. Sem geração automática de PDF/proposta limpa para o cliente.
7. Sem validação de consistência (ex.: máquina × faca × largura × colunas).

---

## Personas / papéis

- **Vendedor**: cria orçamento, escolhe cliente, quantidade, comissão; gera proposta.
- **Orçamentista / PCP**: escolhe faca, máquina, parâmetros técnicos (cores, acabamento, RPM).
- **Administrador**: mantém tabelas de custo (papel, hora máquina, perdas, acabamentos, imposto, matriz R$/cm²).
- **Cliente (futuro opcional)**: recebe proposta; não edita custos.

---

## Fluxo principal (wizard)

### Passo 1 — Cabeçalho
Campos:
- Data
- Cliente (cadastro ou texto livre)
- Vendedor
- Observações internas

### Passo 2 — Especificação do serviço
Campos de entrada (equivalente à aba `ORÇAMENTO` linhas 7–10):

| Campo | Tipo | Origem / regra |
|---|---|---|
| Medida / tamanho | texto ou seleção via faca | vem do mapa de facas |
| Largura do papel (cm) | número | entrada manual |
| Puxada da máquina | número | vem da faca selecionada |
| Cores | 0, 1, 2, 3, 4, 4V, 5, 6, 7, 8 | select |
| Papel | catálogo | aba `PAPEL` |
| Acabamento (lam/vern) | catálogo | aba `ACABAMENTOS` |
| Qtde modelos | inteiro | default 1 |
| Qtde colunas | inteiro | |
| Qtde etiquetas por rolo | inteiro | |
| Tamanho tubete | `1"`, `1" 1/2`, `3"` | catálogo `TUBETE` |
| Z (repetição) | número | da faca; pode ficar em branco em casos especiais |
| Faca | seleção no mapa | formato da faca |
| Repetição | número | da faca |
| Máquina que roda o serviço | catálogo | BETA, 160, 250, ETIRAMA, BATIDA, MODULAR… |
| Máquina (grupo de custo hora) | mapeamento | determina tabela de hora máquina |
| Imposto (%) | 12–25 | catálogo `IMPOSTO` |
| Matriz | SIM / NÃO | se SIM, calcula e cobra no 1º pedido |
| Coluna rebobinação | inteiro | default 1 |
| RPM máquina | número | default ~1300 |
| Tipo troca produto / parada | catálogo | `HORA PARADA` |

### Passo 3 — Seleção de faca (Mapa de Facas)
Catálogo com ~450+ facas. Atributos:
- Máquina (BETAFLEX, ETIRAMA, REFLEXO, REFLEXO 250, MODULAR SPX…)
- Conjugada / observação
- Fornecedor
- Nº da faca
- Z
- Formato (RETA, REDONDA, OVAL, ESPECIAL, DESENHADA, GÔNDOLA, LACRE, PICOTE, SERRILHA, TAG…)
- Tamanho
- Puxada
- Largura
- Rep (repetição)
- Cil / Col
- Cliente associado (opcional)
- Notas (ex.: “NÃO USAR”, “2 COL 1 ESTRAGADA”)

Ao selecionar a faca, o sistema deve **preencher automaticamente** medida, puxada, Z, formato, repetição e sugerir máquina.

Deve haver busca por: tamanho, formato, máquina, nº faca, cliente, texto livre.

### Passo 4 — Quantidades a orçar
Lista dinâmica de faixas (ex.: 10000, 20000, 40000, 60000). Para cada faixa o usuário informa:
- Quantidade de etiquetas
- Tipo de troca/parada (pode herdar da faixa anterior)

### Passo 5 — Cálculo automático + breakdown
Para cada quantidade, calcular e exibir:

**Variáveis intermediárias (produção):**
- Hora máquina
- Hora troca produto
- Hora troca bobina (0 se metragem linear < 1000)
- Metragem linear
- Metragem m² (arredondar para cima em 0,1)
- Perda acerto (papel)
- Perda acabamento (m²)
- Perda troca bobina (m²)
- Quantidade de rolos
- Quantidade de caixas
- Valor matriz (se aplicável)

**Custos (R$):**
- Valor papel
- Valor máquina
- Valor troca produto
- Valor troca bobina
- Tinta
- Acabamento
- Rebobinação
- Tubete
- Valor caixa
- **Valor serviço** (= soma dos itens acima)

**Comerciais:**
- % comissão → valor comissão
- Imposto sobre custo de serviço
- Serviço + imposto + comissão
- Valor da etiqueta (arredondar para cima em múltiplos de 10 — `CEILING(..., 10)` na lógica atual; confirmar se o teto é sobre o total da faixa)
- Valor da matriz (arredondado)
- Valor total da faixa

### Passo 6 — Proposta / Consolidado
Gerar visão comercial (equivalente aba `CONSOLIDADO`):
- Cliente
- Descrição: material + medida + acabamento + etiq/rolo
- Tabela: material | acabamento | etiq por rolo | rolos | etiquetas | total | unitário | valor rolo
- Valor da matriz
- Prazo de entrega (configurável; hoje “12 dias úteis”)
- Validade (hoje “7 dias”)
- Cláusula: quantidades podem variar ±20%
- Exportar PDF / Excel / link compartilhável
- Status: rascunho → enviado → aprovado / perdido

---

## Motor de cálculo (espelhar a planilha)

Implementar como módulo puro/testável (sem UI). Fórmulas base (referência Excel):

### Produção (por quantidade `Q`)
```
metragem_linear = (puxada/100) * Q / qtde_colunas
hora_maquina = (metragem_linear / rpm) + 1
hora_troca_produto = tempo_parada_h * (qtde_modelos - 1)
hora_troca_bobina = se metragem_linear < 1000 então 0 senão (((metragem_linear/1000) - 1) * 5) / 60
metragem_m2 = CEILING( (Q * largura_papel * puxada) / 10000 , 0.1 )
qtde_rolos = Q / etiq_por_rolo
```

### Perdas
- **Perda acerto**: lookup por nº de cores em `PERDA DE PAPEL`
  - cores 0–3: valor fixo em m² da tabela
  - cores 4: `(largura_papel + 1)/100 * 180` (ou fator da tabela)
  - cores 4V / 5: `(largura_papel/100) * 250`
  - cores 6/7/8: fatores 260/270/280
- **Perda acabamento**: lookup em `PERDA DE ACABAMENTO` (m²)
- **Perda troca bobina m²**: se metragem_linear ≤ 1000 → 0; senão `(5 * (largura_papel - 0.75) * qtde_colunas / 100) * (metragem_linear/1000)`

### Custos
```
valor_papel = (metragem_m2 + perda_acerto + perda_troca_bobina) * preco_papel_m2
valor_maquina = hora_maquina * tarifa_hora(maquina_grupo, cores)
valor_troca_produto = hora_troca_produto * tarifa_hora(...)
valor_troca_bobina = hora_troca_bobina * tarifa_hora(...)
tinta = se cores=0 → 0;
        senão se (metragem_m2 + perda_acerto) ≤ 30 → cores * 10;
        senão (metragem_m2 + perda_acerto) * 0.40
acabamento = preco_acabamento_m2 * (metragem_m2 + perda_acerto + perda_acabamento)
rebobinacao = ((metragem_linear * qtde_colunas) / coluna_rebobinacao / 1000) * preco_rebobinacao
tubete = qtde_rolos * preco_tubete
valor_caixa = qtde_caixas * 7   # R$ 7 por caixa (parametrizável)
valor_servico = soma(papel..caixa)
```

### Matriz (clichê) — só se “Matriz = SIM”
```
largura_matriz = largura_papel * qtde_colunas
valor_matriz = ((((Z * 3.175)/10) + 4) * (largura_matriz + 4) * qtde_cores) * valor_cm2
# valor_cm2 default 0.28 — parametrizável
```
Observação comercial: “Somente no 1º pedido”.

### Comercial
```
comissao = valor_servico * (%comissao/100)
imposto = valor_servico * (%imposto/100)
servico_com_encargos = valor_servico + comissao + imposto
valor_etiqueta_apresentado = CEILING(servico_com_encargos, 10)  # validar regra de arredondamento com o negócio
total_faixa = valor_etiqueta_apresentado + CEILING(valor_matriz, 1)  # matriz pode aparecer só na 1ª faixa / 1º pedido
```

**Importante:** as fórmulas acima são a tradução da planilha oficial. O sistema deve permitir **configurar parâmetros** (constantes como 5 min/troca bobina, R$/caixa, valor cm² matriz, arredondamentos) sem alterar código.

---

## Cadastros / tabelas mestres (CRUD admin)

1. **Papéis** — nome, preço R$/m², ativo
2. **Acabamentos** — nome, preço R$/m², perda m² associada
3. **Hora máquina** — por grupo de máquina × nº de cores → R$/hora  
   Grupos atuais: `BETA/160/250/ETIRAMA`, `BATIDA`, `MODULAR`
4. **Hora parada / troca produto** — tipo + tempo em minutos
5. **Perda de papel** — por cores
6. **Tubetes** — tamanho + preço unitário
7. **Tinta / verniz** — regras e preços
8. **Caixas** — regra tubete × nº rolos → qtde caixas (hoje uma tabela enorme gerada; preferir **algoritmo** + override)
9. **Comissão** — percentuais permitidos
10. **Imposto** — percentuais permitidos
11. **Máquinas** — nome + grupo de custo + vínculo com facas
12. **Mapa de facas** — CRUD completo + importação Excel
13. **Clientes / vendedores**
14. **Parâmetros gerais** — prazo, validade, cláusula ±20%, R$/caixa, valor cm² matriz, RPM default, arredondamentos

Toda alteração de preço deve gerar **histórico (audit log)**: quem, quando, valor antigo → novo.

---

## Requisitos funcionais

- RF01: Criar/editar/duplicar orçamento
- RF02: Calcular em tempo real ao mudar inputs
- RF03: Comparar N quantidades na mesma proposta
- RF04: Buscar e vincular faca do mapa
- RF05: Incluir/excluir cobrança de matriz
- RF06: Gerar PDF da proposta (consolidado)
- RF07: Exportar breakdown técnico interno (não vai ao cliente)
- RF08: Listar orçamentos com filtros (cliente, vendedor, data, status)
- RF09: Versionar orçamento (v1, v2…) ao reenviar
- RF10: Importar mapa de facas e tabelas de custo a partir do Excel atual
- RF11: Permissões por papel
- RF12: Validar campos obrigatórios antes de calcular/enviar
- RF13: Mostrar alertas (ex.: faca marcada “NÃO USAR”, metragem baixa, cores 0)

## Requisitos não funcionais

- UI em português (pt-BR), responsiva (desktop first — uso interno)
- Cálculos determinísticos e cobertos por testes unitários (golden tests vs planilha)
- Tempo de cálculo < 100 ms para 5 faixas
- Multi-usuário com autenticação
- Backup / exportação dos cadastros
- Código modular: `pricing-engine` separado da API/UI

---

## Stack sugerida (pode ajustar)

- Frontend: Next.js + TypeScript
- Backend: API TypeScript (ou acoplado ao Next)
- DB: PostgreSQL
- PDF: template da proposta consolidada
- Auth: sessão com papéis
- Importação inicial: parser do `.xlsm` oficial

---

## Critério de aceite (obrigatório)

1. Reproduzir o orçamento exemplo da planilha (`CLIENTE: BANCA DO DINEI`, medida da faca `5,0X2,5`, papel `BOPP BRILHO`, acabamento `COLD STAMP + COLA`, etc.) com **valores iguais ou diferença < R$ 0,01** por componente (salvo arredondamentos documentados).
2. Admin consegue alterar preço de um papel e o próximo orçamento usa o novo valor.
3. Proposta PDF contém consolidado comercial sem expor breakdown de custo interno.
4. Testes automatizados cobrem o motor de cálculo e os lookups principais.

---

## Entregáveis esperados

1. Documento de domínio (glossário: puxada, Z, faca, metragem, matriz…)
2. Modelo de dados (ER)
3. `pricing-engine` com testes golden
4. Telas: login, cadastros, novo orçamento (wizard), lista, detalhe, PDF
5. Script de migração/importação da planilha `ORÇAMENTO OFICIAL … .xlsm`
6. README de operação para vendedores e admin

### Fora de escopo (fase 1)
- Integração ERP/financeiro
- PCP/produção após aprovação
- Portal do cliente
- App mobile nativo

---

## Instrução final ao implementador

Antes de inventar regras novas, **extraia e preserve a lógica da planilha oficial**. Onde a planilha for ambígua ou inconsistente (ex.: arredondamento `CEILING` do valor da etiqueta, casos especiais de perda por cores, tabela de caixas), marque como `TODO de negócio`, proponha a regra mais clara e peça confirmação — não “corrija” silenciosamente o preço.

Comece pelo **motor de cálculo + importação das tabelas + testes golden**; só depois a UI do wizard.
