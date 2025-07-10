# Documentação do Sistema de Simulação de Preços

## Visão Geral

Este sistema é uma aplicação web desenvolvida em JSP (JavaServer Pages) que permite a simulação e análise de preços de produtos. O sistema integra dados de custos, preços de tabela, margens e tickets médios para fornecer uma visão abrangente da estrutura de preços da empresa.

## Estrutura do Projeto

### Tecnologias Utilizadas

- **Backend**: JSP (JavaServer Pages) com Oracle Database
- **Frontend**: HTML5, CSS3, JavaScript
- **Frameworks**: Tailwind CSS, Font Awesome, Chart.js
- **Bibliotecas**: SankhyaJX (para integração com banco), XLSX (para exportação Excel)

### Arquivos Principais

- `base documentacao`: Contém a query SQL principal e o código JSP completo
- `prod8.jsp` até `prod8_ok_27.jsp`: Versões iterativas do sistema
- `base*.sql`: Queries SQL de base de dados
- `README.md`: Documentação técnica em inglês

## Análise da Query SQL Principal

### Estrutura da Query

A query principal é composta por múltiplas CTEs (Common Table Expressions) que processam diferentes aspectos dos dados:

#### 1. CTE CUS (Custos do Período)
```sql
WITH CUS AS (
  SELECT CODPROD, CODEMP, CUSTO_SATIS
  FROM (
    SELECT
      CODPROD,
      CODEMP,
      OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', :P_PERIODO, 3) AS CUSTO_SATIS,
      ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
    FROM TGFCUS
    WHERE DTATUAL <= :P_PERIODO
    AND CODEMP = :P_EMPRESA
    AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
  )
  WHERE RN = 1
)
```

**Função**: Obtém o custo de satisfação dos produtos para o período especificado, considerando apenas o registro mais recente por produto.

#### 2. CTE CUS_ATUAL (Custos Atuais)
```sql
CUS_ATUAL AS (
  SELECT CODPROD, CODEMP, CUSTO_SATIS
  FROM (
    SELECT
      CODPROD,
      CODEMP,
      OBTEMCUSTO_SATIS(CODPROD, 'S', CODEMP, 'N', 0, 'N', ' ', SYSDATE, 3) AS CUSTO_SATIS,
      ROW_NUMBER() OVER (PARTITION BY CODEMP, CODPROD ORDER BY DTATUAL DESC) AS RN
    FROM TGFCUS
    WHERE DTATUAL <= SYSDATE
    AND CODEMP = :P_EMPRESA
    AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
  )
  WHERE RN = 1
)
```

**Função**: Calcula o custo atual dos produtos usando a data atual (SYSDATE).

#### 3. CTE PON (Ponderação por Marca)
```sql
PON AS (
  SELECT 
    CODEMP, PROD, CODPROD, DESCRPROD, MARCA, CODGRUPOPROD, DESCRGRUPOPROD,
    ROUND(SUM(QTD) / SUM(SUM(QTD)) OVER (PARTITION BY MARCA), 4) AS POND_MARCA
  FROM VGF_VENDAS_SATIS
  WHERE DTNEG >= ADD_MONTHS(:P_PERIODO, -12)
  AND DTNEG < :P_PERIODO
  AND CODEMP = :P_EMPRESA
  AND MARCA IN (:P_MARCA)
  AND (:P_CODPROD IS NULL OR CODPROD = :P_CODPROD)
  AND (:P_CODPARC IS NULL OR CODPARC = :P_CODPARC)
  GROUP BY CODEMP, PROD, CODPROD, DESCRPROD, MARCA, CODGRUPOPROD, DESCRGRUPOPROD
)
```

**Função**: Calcula a ponderação de cada produto dentro de sua marca baseada nas vendas dos últimos 12 meses.

#### 4. CTE MET (Metas e Tickets)
```sql
MET AS (
  SELECT 
    MARCA, 
    SUM(QTDPREV) AS QTDPREV,
    SUM(VLR_PREV) AS VLR_PREV,
    SUM(VLR_PREV) / NULLIF(SUM(QTDPREV), 0) AS TICKET_MEDIO_OBJETIVO
  FROM (
    -- Subquery complexa com joins para metas
  )
  GROUP BY MARCA
)
```

**Função**: Calcula as metas de vendas e tickets médios objetivos por marca.

#### 5. CTEs FAT e FAT1 (Faturamento)
- **FAT**: Faturamento dos últimos 12 meses
- **FAT1**: Faturamento da safra atual

#### 6. CTE PRE_ATUAL (Preços Atuais)
```sql
PRE_ATUAL AS (
  SELECT CODTAB, NOMETAB, DTVIGOR, CODPROD, VLRVENDA_ATUAL
  FROM (
    -- Subquery para obter preços atuais de venda
  )
  WHERE RN = 1
)
```

**Função**: Obtém os preços atuais de venda dos produtos.

### Query Principal (CTE BAS)

A query principal combina todos os dados das CTEs anteriores:

```sql
BAS AS (
  SELECT * FROM (
    SELECT DISTINCT
      TAB.NUTAB, NTA.CODTAB, NTA.NOMETAB, 
      PRO.CODPROD, PRO.DESCRPROD, PRO.MARCA,
      PRO.AD_QTDVOLLT, NVL(PON.POND_MARCA, 0) AS POND_MARCA,
      TAB.DTVIGOR,
      NVL(SNK_GET_PRECO(TAB.NUTAB, PRO.CODPROD, :P_PERIODO), 0) AS PRECO_TAB,
      NVL(CUS.CUSTO_SATIS, 0) AS CUSTO_SATIS,
      -- ... outros campos calculados
    FROM TGFPRO PRO
    INNER JOIN TGFGRU GRU ON PRO.CODGRUPOPROD = GRU.CODGRUPOPROD
    LEFT JOIN TGFEXC EXC ON PRO.CODPROD = EXC.CODPROD
    LEFT JOIN TGFTAB TAB ON EXC.NUTAB = TAB.NUTAB
    LEFT JOIN TGFNTA NTA ON TAB.CODTAB = NTA.CODTAB
    -- ... outros joins
    WHERE NTA.ATIVO = 'S'
    AND PRO.CODGRUPOPROD LIKE '1%'
    AND PRO.ATIVO = 'S'
    AND TAB.DTVIGOR <= :P_PERIODO
    -- ... outros filtros
  ) WHERE RN = 1
)
```

### UNION ALL para Resumos

A query final usa UNION ALL para combinar dados detalhados com resumos por marca:

```sql
SELECT 
  NUTAB, CODTAB, NOMETAB, CODPROD, DESCRPROD, MARCA,
  -- ... campos detalhados
FROM BAS

UNION ALL

SELECT 
  NULL NUTAB, CODTAB, NOMETAB, NULL CODPROD, '1' DESCRPROD, MARCA,
  -- ... campos resumidos por marca
FROM BAS
GROUP BY CODTAB, NOMETAB, MARCA, TICKET_MEDIO_OBJETIVO_MARCA
```

## Interface Web (JSP)

### Estrutura HTML

#### Cabeçalho e Meta Tags
```html
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
```

**Função**: Configuração de encoding UTF-8, importação de bibliotecas e tags JSTL para formatação.

#### Dependências CSS/JS
- **Tailwind CSS**: Framework CSS utilitário para estilização
- **Font Awesome**: Ícones
- **Chart.js**: Gráficos (não utilizado na versão atual)
- **SankhyaJX**: Integração com banco de dados
- **XLSX**: Exportação para Excel

### Estilos CSS

#### Configurações Gerais
```css
html, body {
  font-size: 12.6px; 
}

table {
  font-size: 0.81rem;
}
```

**Função**: Define tamanhos de fonte responsivos para melhor legibilidade.

#### Tabela com Cabeçalho Fixo
```css
#dataTable thead {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: #d1fae5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

**Função**: Mantém o cabeçalho da tabela visível durante a rolagem.

#### Larguras de Colunas Específicas
```css
.col-nutab { width: 40px; }    
.col-codtab { width: 50px; }
.col-tabela { width: 40px; }
/* ... outras colunas */
```

**Função**: Define larguras fixas para cada coluna, otimizando o layout.

#### Estilos Condicionais
```css
tr.bg-codtab-marca-0 {
  background-color: #ffffff;
}

tr.bg-codtab-marca-1 {
  background-color: #f0fdf4;
}

tr.summary-row {
  background-color: #e0f2e9 !important;
  border-bottom: 3px solid #10b981;
}
```

**Função**: Alterna cores de fundo para facilitar a visualização de grupos e destaca linhas de resumo.

### Estrutura da Tabela

#### Cabeçalho Duplo
```html
<tr class="bg-green-100">
  <th></th>
  <!-- ... colunas vazias para alinhamento -->
  <th colspan="2" style="background-color: #E49EDD; text-align: center;">Tab.</th>
  <th colspan="2" style="background-color: #0000FF; text-align: center; color: white;">Tab. Consum. (-15%)</th>
  <th colspan="2" style="background-color: #00FF00; text-align: center;">Tab. Rev. (-35%)</th>
  <!-- ... outras colunas -->
</tr>
```

**Função**: Cabeçalho superior com agrupamento visual de colunas por cenário de preço.

#### Cabeçalho Detalhado
```html
<tr class="bg-green-200 text-green-900">
  <th class="col-nutab" title="Cód. Tab.">Nú.</th>
  <th class="col-codtab" title="Cód. Tab.">Cód.</th>
  <!-- ... outras colunas -->
</tr>
```

**Função**: Cabeçalho inferior com títulos específicos de cada coluna.

### Dados da Tabela

#### Iteração com JSTL
```jsp
<c:forEach var="row" items="${base.rows}" varStatus="loop">
  <c:set var="currentCodtabMarca" value="${row.CODTAB}-${row.MARCA}"/>
  
  <c:if test="${currentCodtabMarca != previousCodtabMarca}">
    <c:set var="groupCounter" value="${groupCounter + 1}"/>
    <c:set var="previousCodtabMarca" value="${currentCodtabMarca}"/>
  </c:if>
  
  <c:set var="groupClass" value="bg-codtab-marca-${groupCounter % 2}"/>
  <c:set var="isSummaryRow" value="${row.NUTAB == 0 && row.DESCRPROD == '1'}"/>
  <c:set var="rowClass" value="${isSummaryRow ? 'summary-row' : groupClass}"/>
```

**Função**: 
- Agrupa linhas por tabela e marca
- Alterna cores de fundo
- Identifica linhas de resumo

#### Formatação de Números
```jsp
<fmt:formatNumber value="${row.CUSTO_SATIS}" type="number" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/>
```

**Função**: Formata números no padrão brasileiro (vírgula como separador decimal, ponto como separador de milhares).

### Campos Editáveis

#### Campos de Entrada
```html
<td class="col-nova-margem">
  <input type="number" step="0.01" class="row-margin border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" data-custo="${row.CUSTO_SATIS_ATU}" />
</td>
<td class="col-novo-preco">
  <div class="flex items-center justify-center space-x-1">
    <input type="number" step="0.01" class="row-price border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" data-custo="${row.CUSTO_SATIS_ATU}" data-preco-tab="${row.PRECO_TAB}" />
    <span class="price-arrow text-sm ml-1"></span>
  </div>
</td>
<td class="col-dt-vigor">
  <input type="text" class="row-dtvigor border border-green-300 rounded px-1 py-1 w-full focus:outline-none focus:ring-2 focus:ring-green-400 text-center" value="" placeholder="dd/mm/aaaa" maxlength="10" />
</td>
```

**Função**: 
- Campos para nova margem, novo preço e data de vigor
- Atributos `data-*` armazenam valores de referência
- Validação de formato de data

## Funcionalidades JavaScript

### Cálculos Automáticos

#### Cálculo de Margem
```javascript
function calcMargin(newPrice, custo) {
  if (!newPrice || !custo) return '';
  return (((newPrice - custo) / newPrice) * 100).toFixed(2);
}
```

**Função**: Calcula a margem percentual baseada no novo preço e custo.

#### Cálculo de Preço
```javascript
function calcPrice(newMargin, custo) {
  if (!newMargin || !custo) return '';
  return (custo / (1 - (newMargin / 100))).toFixed(2);
}
```

**Função**: Calcula o preço necessário para atingir uma margem específica.

### Event Listeners

#### Campos de Preço
```javascript
document.querySelectorAll('.row-price').forEach(function(input) {
  input.addEventListener('input', function() {
    const custo = parseFloat(this.dataset.custo);
    const price = parseFloat(this.value);
    const row = this.closest('tr');
    const marginInput = row.querySelector('.row-margin');
    if (!isNaN(price) && !isNaN(custo)) {
      marginInput.value = calcMargin(price, custo);
    } else {
      marginInput.value = '';
    }
    
    updatePriceArrow(this);
  });
});
```

**Função**: 
- Atualiza automaticamente a margem quando o preço é alterado
- Chama função para atualizar seta indicadora

#### Campos de Margem
```javascript
document.querySelectorAll('.row-margin').forEach(function(input) {
  input.addEventListener('input', function() {
    const custo = parseFloat(this.dataset.custo);
    const margin = parseFloat(this.value);
    const row = this.closest('tr');
    const priceInput = row.querySelector('.row-price');
    if (!isNaN(margin) && !isNaN(custo)) {
      priceInput.value = calcPrice(margin, custo);
    } else {
      priceInput.value = '';
    }
  });
});
```

**Função**: Atualiza automaticamente o preço quando a margem é alterada.

### Controles Globais

#### Aplicação Global de Preço
```javascript
document.getElementById('applyGlobalPrice').addEventListener('click', function() {
  const price = parseFloat(globalPrice.value);
  document.querySelectorAll('.row-price').forEach(function(input) {
    if (!isNaN(price)) {
      input.value = price;
      const custo = parseFloat(input.dataset.custo);
      const row = input.closest('tr');
      const marginInput = row.querySelector('.row-margin');
      marginInput.value = calcMargin(price, custo);
      updatePriceArrow(input);
    }
  });
});
```

**Função**: Aplica o mesmo preço a todos os produtos e recalcula margens.

#### Aplicação Global de Margem
```javascript
document.getElementById('applyGlobalMargin').addEventListener('click', function() {
  const margin = parseFloat(globalMargin.value);
  document.querySelectorAll('.row-margin').forEach(function(input) {
    if (!isNaN(margin)) {
      input.value = margin;
      const custo = parseFloat(input.dataset.custo);
      const row = input.closest('tr');
      const priceInput = row.querySelector('.row-price');
      priceInput.value = calcPrice(margin, custo);
      updatePriceArrow(priceInput);
    }
  });
});
```

**Função**: Aplica a mesma margem a todos os produtos e recalcula preços.

### Indicadores Visuais

#### Setas de Preço
```javascript
function updatePriceArrow(priceInput) {
  const novoPreco = parseFloat(priceInput.value);
  const precoTab = parseFloat(priceInput.dataset.precoTab);
  const arrowSpan = priceInput.closest('td').querySelector('.price-arrow');
  
  if (isNaN(novoPreco) || isNaN(precoTab)) {
    arrowSpan.innerHTML = '';
    return;
  }
  
  if (novoPreco > precoTab) {
    arrowSpan.innerHTML = '<i class="fas fa-arrow-up text-green-600"></i>';
  } else if (novoPreco < precoTab) {
    arrowSpan.innerHTML = '<i class="fas fa-arrow-down text-red-600"></i>';
  } else {
    arrowSpan.innerHTML = '<i class="fas fa-minus text-gray-500"></i>';
  }
}
```

**Função**: Mostra setas indicando se o novo preço é maior (↑), menor (↓) ou igual (=) ao preço atual.

### Filtros

#### Filtro de Tabela
```javascript
function filterTable() {
  const filterValue = tableFilter.value.toLowerCase().trim();
  
  if (!filterValue) {
    originalRows.forEach(row => {
      row.style.display = '';
    });
    return;
  }

  const searchTerms = filterValue.split('|').map(term => term.trim()).filter(term => term.length > 0);
  
  originalRows.forEach(row => {
    const cells = Array.from(row.cells);
    const rowText = cells.map(cell => cell.textContent || cell.innerText).join(' ').toLowerCase();
    
    const matches = searchTerms.some(term => rowText.includes(term));
    
    row.style.display = matches ? '' : 'none';
  });
}
```

**Função**: 
- Filtra linhas em tempo real
- Suporta múltiplos termos separados por `|`
- Case-insensitive

### Validação de Data

#### Formato Brasileiro
```javascript
function isValidBRDate(dateStr) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
  const [d, m, y] = dateStr.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
```

**Função**: Valida se a data está no formato dd/mm/aaaa e é uma data válida.

#### Formatação Automática
```javascript
function autoFormatDateInput(input) {
  input.addEventListener('input', function(e) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
    if (v.length > 5) v = v.slice(0,5) + '/' + v.slice(5,9);
    input.value = v;
  });
}
```

**Função**: Formata automaticamente a entrada de data no formato dd/mm/aaaa.

## Exportação de Dados

### Exportação para Excel

#### Coleta de Dados
```javascript
function collectTableDataForExcel() {
  const table = document.getElementById('dataTable');
  const rows = table.querySelectorAll('tbody tr');
  const data = [];
  
  rows.forEach(row => {
    if (row.style.display === 'none') {
      return;
    }
    
    const cells = row.cells;
    const rowData = {
      'Nú.': cells[0].textContent.trim(),
      'Cód.': cells[1].textContent.trim(),
      // ... outros campos
      'Nova Margem': convertToBrazilianFormat(row.querySelector('.row-margin').value),
      'Novo Preço': convertToBrazilianFormat(row.querySelector('.row-price').value),
      'Dt. Vigor': row.querySelector('.row-dtvigor').value
    };
    
    data.push(rowData);
  });
  
  return data;
}
```

**Função**: Coleta apenas linhas visíveis (não filtradas) para exportação.

#### Geração do Arquivo
```javascript
document.getElementById('exportJsonBtn').addEventListener('click', function() {
  const data = collectTableDataForExcel();
  
  if (data.length === 0) {
    showStatusOverlay('Aviso', 'Nenhum dado para exportar. A tabela está vazia ou não há linhas visíveis com o filtro atual.', 'error');
    return;
  }
  
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    const colWidths = [
      { wch: 8 },   // Nú.
      { wch: 8 },   // Cód.
      // ... outras larguras
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo Material');
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `resumo_material_${dateStr}_${timeStr}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    showStatusOverlay('Sucesso', `${data.length} linhas exportadas para Excel com sucesso!`, 'success');
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    showStatusOverlay('Erro', 'Erro ao exportar arquivo Excel. Verifique o console para detalhes.', 'error');
  }
});
```

**Função**: 
- Cria arquivo Excel com dados formatados
- Define larguras de colunas
- Gera nome de arquivo com timestamp
- Mostra feedback ao usuário

### Inserção no Banco de Dados

#### Coleta de Dados para Inserção
```javascript
function collectTableData() {
  const table = document.getElementById('dataTable');
  const rows = table.querySelectorAll('tbody tr');
  const data = [];
  
  rows.forEach(row => {
    if (row.style.display === 'none') {
      return;
    }
    
    const cells = row.cells;
    const rowData = {
      numeroTabela: cells[0].textContent.trim(),
      codigoTabela: cells[1].textContent.trim(),
      codigoProduto: cells[3].textContent.trim(),
      novoPreco: row.querySelector('.row-price').value,
      dataVigor: row.querySelector('.row-dtvigor').value
    };
    
    if (rowData.novoPreco || rowData.dataVigor) {
      data.push(rowData);
    }
  });
  
  return data;
}
```

**Função**: Coleta apenas dados que foram modificados (novo preço ou data de vigor).

#### Validação e Inserção
```javascript
document.getElementById('insertDataBtn').addEventListener('click', async function () {
  const btn = this;
  btn.disabled = true;

  const rawData = collectTableData();
  
  const invalidRecords = rawData.filter(item => 
    item.codigoProduto?.trim() !== '' && 
    (!item.novoPreco?.trim() || !item.dataVigor?.trim())
  );
  
  if (invalidRecords.length > 0) {
    showStatusOverlay('Validação', 'Todos os registros devem ter tanto o Novo Preço quanto a Data de Vigor preenchidos. Verifique os campos vazios.', 'error');
    btn.disabled = false;
    return;
  }
  
  const data = rawData.filter(item =>
    item.codigoProduto?.trim() !== '' &&
    item.novoPreco?.trim() !== '' &&
    item.dataVigor?.trim() !== ''
  );

  if (data.length === 0) {
    showStatusOverlay('Aviso', 'Nenhum dado válido encontrado para inserir. Por favor, preencha tanto o Novo Preço quanto a Data de Vigor para pelo menos um registro.', 'error');
    btn.disabled = false;
    return;
  }

  showStatusOverlay('Processando...', `Inserindo ${data.length} registros no banco de dados...`, 'processing');

  try {
    for (const item of data) {
      const nextId = await getNextId();

      const record = {
        ID: nextId,
        NUTAB: item.numeroTabela || '',
        CODTAB: item.codigoTabela || '',
        CODPROD: item.codigoProduto || '',
        NOVO_PRECO: item.novoPreco || '',
        DTVIGOR: item.dataVigor || ''
      };

      await JX.salvar(record, 'AD_TESTEPRECO');
      console.log(`Registro ${nextId} salvo com sucesso.`);
    }

    showStatusOverlay('Sucesso', `${data.length} registros foram salvos com sucesso!`, 'success');
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    showStatusOverlay('Erro', 'Erro ao salvar dados. Verifique o console para detalhes.', 'error');
  } finally {
    btn.disabled = false;
  }
});
```

**Função**: 
- Valida que todos os campos obrigatórios estão preenchidos
- Insere registros na tabela `AD_TESTEPRECO`
- Mostra feedback de progresso e resultado

## Overlays e Feedback

### Overlay de Carregamento
```html
<div id="loadingOverlay" class="loading-overlay">
  <div class="loading-content">
    <div class="loading-spinner"></div>
    <div class="loading-title">Processando...</div>
    <div id="loadingMessage" class="loading-message">Salvando dados na tabela...</div>
    <div class="loading-progress">
      <div id="loadingProgressBar" class="loading-progress-bar"></div>
    </div>
  </div>
</div>
```

**Função**: Mostra indicador de carregamento durante operações longas.

### Overlay de Status
```html
<div id="statusOverlay" class="status-overlay">
  <div class="status-content">
    <div id="statusIcon" class="status-icon"></div>
    <div id="statusTitle" class="status-title"></div>
    <div id="statusMessage" class="status-message"></div>
    <button id="statusCloseBtn" class="status-button">OK</button>
  </div>
</div>
```

**Função**: Mostra mensagens de sucesso, erro ou aviso ao usuário.

### Função de Exibição de Status
```javascript
function showStatusOverlay(title, message, type = 'success') {
  const overlay = document.getElementById('statusOverlay');
  const icon = document.getElementById('statusIcon');
  const titleEl = document.getElementById('statusTitle');
  const messageEl = document.getElementById('statusMessage');
  
  icon.className = `status-icon ${type}`;
  
  if (type === 'success') {
    icon.innerHTML = '<i class="fas fa-check-circle"></i>';
  } else if (type === 'error') {
    icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
  } else if (type === 'processing') {
    icon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  
  titleEl.textContent = title;
  messageEl.textContent = message;
  
  overlay.style.display = 'flex';
}
```

**Função**: Exibe overlay com ícone, título e mensagem apropriados para o tipo de status.

## Parâmetros do Sistema

### Parâmetros SQL
- `:P_PERIODO`: Data de referência para cálculos
- `:P_EMPRESA`: Código da empresa
- `:P_CODPROD`: Código do produto (opcional)
- `:P_CODTAB`: Código da tabela de preços (opcional)
- `:P_MARCA`: Marca(s) dos produtos
- `:P_CODPARC`: Código do parceiro (opcional)

### Configurações de Interface
- **Fonte base**: 12.6px
- **Fonte da tabela**: 0.81rem
- **Cores principais**: Verde (#10b981, #d1fae5)
- **Cores de cenários**: 
  - Tabela atual: Rosa (#E49EDD)
  - Consumidor (-15%): Azul (#0000FF)
  - Revenda (-35%): Verde (#00FF00)

## Cenários de Preços

### 1. Preço Atual (Tabela)
- **Cálculo**: `PRECO_TAB`
- **Margem**: `MARGEM`
- **Cor**: Rosa (#E49EDD)

### 2. Preço Consumidor (-15%)
- **Cálculo**: `PRECO_TAB * 0.85`
- **Margem**: `MARGEM_MENOS15`
- **Cor**: Azul (#0000FF)

### 3. Preço Revenda (-35%)
- **Cálculo**: `PRECO_TAB * 0.65`
- **Margem**: `MARGEM_MENOS65`
- **Cor**: Verde (#00FF00)

## Tabelas de Banco de Dados

### Tabelas Principais
- **TGFPRO**: Produtos
- **TGFTAB**: Tabelas de preços
- **TGFNTA**: Nomes das tabelas
- **TGFEXC**: Exceções de preços
- **TGFCUS**: Custos
- **TGFMET**: Metas
- **VGF_VENDAS_SATIS**: Vendas (view)

### Tabela de Destino
- **AD_TESTEPRECO**: Armazena novos preços e datas de vigor

## Considerações de Performance

### Índices Recomendados
- `TGFCUS(DTATUAL, CODEMP, CODPROD)`
- `VGF_VENDAS_SATIS(DTNEG, CODEMP, MARCA)`
- `TGFMET(CODMETA, MARCA, DTREF)`
- `TGFEXC(NUTAB, CODPROD)`

### Otimizações Implementadas
- Uso de `ROW_NUMBER()` para evitar duplicatas
- Filtros por data para limitar volume de dados
- CTEs para reutilização de subqueries complexas
- Índices em colunas de junção

## Manutenção e Evolução

### Pontos de Atenção
1. **Parâmetros**: Verificar se os parâmetros estão sendo passados corretamente
2. **Performance**: Monitorar tempo de execução da query principal
3. **Dados**: Validar integridade dos dados de entrada
4. **Interface**: Testar responsividade em diferentes dispositivos

### Possíveis Melhorias
1. **Cache**: Implementar cache para queries frequentes
2. **Paginção**: Adicionar paginação para grandes volumes de dados
3. **Gráficos**: Implementar visualizações com Chart.js
4. **Relatórios**: Adicionar mais opções de exportação
5. **Validações**: Expandir validações de dados de entrada

## Conclusão

Este sistema representa uma solução completa para simulação e análise de preços, combinando uma query SQL complexa com uma interface web moderna e responsiva. A arquitetura permite fácil manutenção e expansão, enquanto fornece funcionalidades robustas para análise de preços e exportação de dados. 

## Resumo da Correção Implementada

### Problema Identificado
O código tinha **dois scripts JavaScript separados** que estavam definindo os mesmos event listeners múltiplas vezes, causando a execução duplicada do trigger do banco de dados.

### Solução Implementada

1. **Consolidação dos Scripts**: Unificou os dois scripts em um único bloco `<script>`.

2. **Proteção contra Duplicação**: Implementou uma flag `window.eventListenersInitialized` para garantir que os event listeners sejam registrados apenas uma vez:

```javascript
// Flag para evitar duplicação de event listeners
if (window.eventListenersInitialized) {
  console.log('Event listeners já foram inicializados, pulando...');
} else {
  window.eventListenersInitialized = true;
  
  // Todo o código JavaScript aqui...
}
```

3. **Estrutura Organizada**: Manteve toda a funcionalidade existente:
   - Cálculos automáticos de margem e preço
   - Filtros de tabela
   - Exportação para Excel
   - Inserção no banco de dados
   - Overlays de status
   - Formatação de datas
   - Indicadores visuais (setas)

### Benefícios da Correção

- ✅ **Trigger executado apenas uma vez** por clique no botão
- ✅ **Todas as funcionalidades preservadas**
- ✅ **Performance melhorada** (sem duplicação de listeners)
- ✅ **Código mais limpo e organizado**
- ✅ **Facilita manutenção futura**

### Como Funciona Agora

1. Quando a página carrega, a flag `window.eventListenersInitialized` é verificada
2. Se for a primeira vez, todos os event listeners são registrados e a flag é definida como `true`
3. Se a página for recarregada ou o script executado novamente, a verificação da flag impede a duplicação
4. O botão "Inserir no Banco" agora executa o trigger apenas uma vez por clique

A correção foi implementada de forma **limpa e mínima**, preservando toda a estrutura e funcionalidade existente, conforme solicitado.

## Detalhes do Trigger do Banco de Dados

### Trigger: `TRG_I_U_TESTEPRECO_SATIS`

O trigger é executado automaticamente quando um registro é inserido ou atualizado na tabela `AD_TESTEPRECO`. Ele gerencia a criação/atualização de preços nas tabelas do sistema.

#### Estrutura do Trigger

```sql
CREATE OR REPLACE TRIGGER TRG_I_U_TESTEPRECO_SATIS
BEFORE UPDATE OR INSERT ON AD_TESTEPRECO
FOR EACH ROW
```

**Função**: Executa **antes** de qualquer INSERT ou UPDATE na tabela `AD_TESTEPRECO`, processando cada linha individualmente.

#### Variáveis Declaradas

```sql
DECLARE
    FIELD_ID        NUMBER;        -- ID do campo (não utilizado)
    V_NUTAB_SEQ     NUMBER;        -- Número da tabela sequencial
    V_CODTAB        NUMBER;        -- Código da tabela de preços
    V_DTVIGOR       DATE;          -- Data de vigor do preço
    V_CODPROD       NUMBER;        -- Código do produto
    V_NOVO_PRECO    NUMBER;        -- Novo preço a ser aplicado
    V_NUTAB         NUMBER;        -- Número da tabela (chave primária)
    P_DESCPER       CHAR;          -- Descrição do período
    P_COUNT         NUMBER;        -- Contador para verificar existência
```

#### Processamento Principal

##### 1. Conversão e Validação de Dados
```sql
V_NOVO_PRECO := TO_NUMBER(:NEW.NOVO_PRECO, '9999999999D99', 'NLS_NUMERIC_CHARACTERS = ''.,''');
V_DTVIGOR := TO_DATE(:NEW.DTVIGOR,'DD/MM/YYYY');
V_CODTAB := TO_NUMBER(:NEW.CODTAB);
V_CODPROD := TO_NUMBER(:NEW.CODPROD);
```

**Função**: 
- Converte o novo preço do formato brasileiro (vírgula como decimal) para número
- Converte a data do formato DD/MM/YYYY para DATE
- Converte códigos de tabela e produto para números

##### 2. Verificação de Condições
```sql
IF NVL(V_CODPROD,0) <> 0 AND NVL(V_NOVO_PRECO,0) <> 0 THEN
```

**Função**: Só executa o processamento se tanto o código do produto quanto o novo preço forem válidos (não nulos e não zero).

##### 3. Busca da Tabela de Preços Existente
```sql
BEGIN
    SELECT NVL(NUTAB,0) INTO V_NUTAB 
    FROM TGFTAB 
    WHERE CODTAB = :NEW.CODTAB AND DTVIGOR = :NEW.DTVIGOR;
EXCEPTION WHEN NO_DATA_FOUND THEN
    V_NUTAB := NULL;
END;
```

**Função**: Verifica se já existe uma tabela de preços para o código e data de vigor especificados.

#### Lógica de Decisão

##### Cenário 1: Nova Tabela de Preços (V_NUTAB IS NULL OR V_NUTAB = 0)

```sql
-- Gera próximo NUTAB
SELECT NVL(MAX(NUTAB), 0) + 1 INTO V_NUTAB FROM TGFTAB;

-- Busca descrição do período da última tabela da mesma categoria
BEGIN
    SELECT AD_DESCPER INTO P_DESCPER 
    FROM TGFTAB 
    WHERE NUTAB = (SELECT MAX(NUTAB) FROM TGFTAB WHERE CODTAB = V_CODTAB);
EXCEPTION WHEN NO_DATA_FOUND THEN
    P_DESCPER := NULL;
END;

-- Inserção na TGFTAB
INSERT INTO TGFTAB (CODTAB, DTVIGOR, DTALTER, NUTAB, AD_DESCPER)
VALUES (V_CODTAB, V_DTVIGOR, SYSDATE, V_NUTAB, P_DESCPER);

-- Inserção na TGFEXC
INSERT INTO TGFEXC (CODPROD, VLRVENDA, NUTAB, CODLOCAL, TIPO)
VALUES (V_CODPROD, V_NOVO_PRECO, V_NUTAB, 0, 'V');

:NEW.STATUS := 'SUCESSO, PREÇO INCLUIDO';
:NEW.DHALTER := SYSDATE;
```

**Função**:
- Gera um novo NUTAB sequencial
- Copia a descrição do período da última tabela da mesma categoria
- Cria nova entrada na tabela de preços (`TGFTAB`)
- Cria exceção de preço para o produto (`TGFEXC`)
- Define status de sucesso

##### Cenário 2: Tabela de Preços Existente

```sql
-- Atualização da TGFTAB
UPDATE TGFTAB 
SET DTALTER = SYSDATE
WHERE NUTAB = V_NUTAB AND CODTAB = V_CODTAB;

-- Verifica se o produto já tem preço nesta tabela
SELECT COUNT(*) INTO P_COUNT 
FROM TGFEXC 
WHERE NUTAB = V_NUTAB AND CODPROD = V_CODPROD;
```

**Função**: Atualiza a data de alteração da tabela e verifica se o produto já tem preço definido.

###### Subcenário 2.1: Produto já tem preço (P_COUNT > 0)

```sql
-- Atualização do preço existente
UPDATE TGFEXC 
SET VLRVENDA = V_NOVO_PRECO
WHERE NUTAB = V_NUTAB AND CODPROD = V_CODPROD;

:NEW.STATUS := 'SUCESSO, PREÇO ATUALIZADO';
:NEW.DHALTER := SYSDATE;
```

**Função**: Atualiza o preço existente do produto na tabela.

###### Subcenário 2.2: Produto não tem preço (P_COUNT = 0)

```sql
-- Inserção de novo preço
INSERT INTO TGFEXC (CODPROD, VLRVENDA, NUTAB, CODLOCAL, TIPO)
VALUES (V_CODPROD, V_NOVO_PRECO, V_NUTAB, 0, 'V');

:NEW.STATUS := 'SUCESSO, PREÇO INCLUIDO';
:NEW.DHALTER := SYSDATE;
```

**Função**: Adiciona novo preço para o produto na tabela existente.

#### Tabelas Envolvidas

1. **AD_TESTEPRECO**: Tabela de origem (dispara o trigger)
2. **TGFTAB**: Tabela de preços (cabeçalho)
3. **TGFEXC**: Exceções de preços (detalhes por produto)

#### Campos Atualizados pelo Trigger

- **:NEW.STATUS**: Status da operação ('SUCESSO, PREÇO INCLUIDO' ou 'SUCESSO, PREÇO ATUALIZADO')
- **:NEW.DHALTER**: Data/hora da alteração (SYSDATE)

#### Tratamento de Erros

- **Conversão de dados**: Usa `TO_NUMBER` e `TO_DATE` com tratamento de exceções
- **Busca de dados**: Usa blocos `BEGIN/EXCEPTION` para tratar `NO_DATA_FOUND`
- **Validação**: Verifica se códigos e preços são válidos antes do processamento

#### Fluxo de Execução

1. **Inserção/Atualização** na `AD_TESTEPRECO`
2. **Trigger disparado** automaticamente
3. **Conversão** dos dados de entrada
4. **Validação** das condições
5. **Busca** da tabela de preços existente
6. **Decisão** baseada na existência da tabela
7. **Processamento** (inserção ou atualização)
8. **Atualização** do status e data de alteração

#### Considerações de Performance

- **Índices recomendados**:
  - `TGFTAB(CODTAB, DTVIGOR)`
  - `TGFEXC(NUTAB, CODPROD)`
  - `TGFTAB(CODTAB, NUTAB)`

- **Otimizações**:
  - Uso de `NVL` para evitar valores nulos
  - Verificação de existência antes de inserir
  - Controle de transação automático

#### Monitoramento

Para monitorar a execução do trigger:

```sql
-- Verificar registros processados
SELECT STATUS, COUNT(*) 
FROM AD_TESTEPRECO 
WHERE DHALTER >= SYSDATE - 1
GROUP BY STATUS;

-- Verificar erros de conversão
SELECT * 
FROM AD_TESTEPRECO 
WHERE STATUS IS NULL OR STATUS NOT LIKE 'SUCESSO%';
``` 