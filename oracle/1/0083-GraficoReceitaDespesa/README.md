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

