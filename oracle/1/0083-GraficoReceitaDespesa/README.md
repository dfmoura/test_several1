# 📌 Detalhamento da Página Responsiva com Gráficos e Slider

## 🎯 Objetivo
Criar uma página **responsiva** utilizando **HTML, CSS e JavaScript**, que se adapte automaticamente a diferentes dispositivos. A página contará com um **slider interativo** (biblioteca [noUiSlider](https://refreshless.com/nouislider/)) para controlar a exibição de dados em **gráficos dinâmicos** (biblioteca [Chart.js](https://www.chartjs.org/)).

---

## 🏗️ Estrutura da Página
A página será dividida em **duas áreas principais**:

- **Área Superior**: Contendo o **slider** e dois gráficos.
- **Área Inferior**: Contendo mais dois gráficos.

O **slider** permitirá selecionar um período específico (dias do mês) para visualizar os dados correspondentes nos gráficos.

---

## 📊 Detalhamento dos Quadrantes e Gráficos

### 🟢 **Cabeçalho (Head)**
- Contém o **slider interativo** da biblioteca **noUiSlider**.
- O **range** do slider varia de **1 a 31**, representando os dias do mês.
- Controla dinamicamente os períodos exibidos nos gráficos.

### 📌 **Quadrantes da Página**

#### 🔹 **Quadrante 1 (Superior Esquerdo)**
- **Título:** "Previsão Receita"
- **Gráfico:** Gráfico de **barras** (Chart.js) representando a **receita diária**.
- **Comparação:** Linha adicional mostrando valores do **mês anterior**.

#### 🔹 **Quadrante 2 (Superior Direito)**
- **Título:** "Previsão Despesa Efetiva"
- **Gráfico:** Gráfico de **barras** para **despesas diárias**.
- **Comparação:** Linha adicional mostrando valores do **mês anterior**.

#### 🔹 **Quadrante 3 (Inferior Esquerdo)**
- **Título:** "Previsão Ordem de Compra"
- **Gráfico:** Gráfico de **barras** representando valores das **ordens de compra por dia**.
- **Comparação:** Linha adicional com valores do **mês anterior**.

#### 🔹 **Quadrante 4 (Inferior Direito)**
- **Título:** "Fluxo de Caixa"
- **Gráfico:** Gráfico de **barras** com duas séries:
  - **Receitas** por dia
  - **Despesas** por dia
- **Comparação:** Linha adicional com valores do **mês anterior**.

---

## 🎛️ **Funcionalidade do Slider**
✅ **Totalmente responsivo**, adaptando-se a diferentes dispositivos.
✅ **Interação dinâmica** com os gráficos, ajustando a quantidade de dias mostrados.
✅ **Otimizado para evitar loops infinitos** e atualizações excessivas.

---

## 🏗️ **Estrutura do Código**
### 🔹 **HTML**
- Estrutura semântica e organizada.

### 🎨 **CSS**
- Design responsivo e flexível.

### 🛠️ **JavaScript**
- Código modular e otimizado.
- Separação clara de responsabilidades.
- Uso eficiente das bibliotecas **noUiSlider** e **Chart.js**.

---

## 🚀 Conclusão
Esta página proporcionará uma experiência **fluida e interativa**, permitindo a análise **rápida e eficiente** dos dados ao longo do mês, com um design **limpo, responsivo e escalável**. 🔥




📌 Atividades Realizadas

🕒 13/02/2025 10:30 - 12:40

Foi realizada a adequação da estrutura do HTML para a implementação no JSP do Sankhya. O código foi atualizado para carregar todo o conjunto de dados via SELECT, garantindo que a filtragem de dias fosse realizada dinamicamente pelo slider, proporcionando maior eficiência na renderização dos gráficos.

🕒 13/02/2025 13:45 - 20:10

Ajustamos o SELECT do primeiro gráfico para exibir os dados de forma estruturada, posicionando os valores do mês atual em colunas e os do mês anterior em linhas. Isso possibilitou uma comparação clara e intuitiva entre os períodos, melhorando a análise de tendências e variações de receita e despesas ao longo do tempo.

🕒 14/02/2025 08:30 - 12:25

Ajustamos a query fluxo_caixa para alimentar o gráfico fluxoChart, seguindo a mesma estrutura utilizada no gráfico de despesa. As séries incluídas foram: receita (vlr_receita) e despesa (vlr_despesa) como colunas, e saldo_acumulado como linha. Além disso, foi adicionado um label ao lado do slider para exibir seu valor dinamicamente conforme o usuário o movimenta.

🕒 14/02/2025 13:50 - 16:00

Adaptamos a query prev_oc para o gráfico compraChart, semelhante ao ajuste feito no gráfico de despesa. As séries adicionadas foram: atual (vlr_prov_S_ATUAL) como coluna e anterior (vlr_prov_S_ANT) como linha. Também foi realizada a atualização na query prev_rec, garantindo que os dados de receita sejam exibidos corretamente e adicionando bordas arredondadas e centralização dos títulos dos gráficos para uma melhor estética.

🕒 14/02/2025 17:30 - 20:30

Foi otimizada a query prev_rec e atualizado o código JavaScript, permitindo que o gráfico de receita tenha duas séries agrupadas nas mesmas colunas e uma terceira série representada por uma linha. No select do fluxo de caixa, foi acrescentada uma coluna para calcular a soma acumulada (vlr_receita - vlr_despesa). Além disso, criamos a função FUNC_OBTER_DATE para armazenar parâmetros de data no HTML5, permitindo que os selects utilizem a query corretamente sem falhas de leitura. Também foram implementadas melhorias no where das queries para considerar o parâmetro ou, caso nulo, utilizar o SYSDATE. Por fim, o título dos gráficos foi atualizado para exibir o nome completo do mês e o ano (exemplo: JANEIRO - 2025) e foi criada uma versão otimizada dos selects para cada gráfico, garantindo melhor desempenho sem alterar os resultados exibidos.