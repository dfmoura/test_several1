<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tela com 2 Seções</title>
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      display: flex;
      justify-content: center;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .section {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      background-color: #fff;
      margin: 0 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 600px; /* Altura mínima aumentada */
      position: relative; /* Adicionado para posicionamento do overlay */      
      transition: transform 0.3s ease, box-shadow 0.3s ease; /* Adiciona transição suave */
    }
    .section:hover {
      transform: translateY(-5px); /* Movimenta a seção para cima ao passar o mouse */
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Adiciona uma sombra para efeito de profundidade */
    }    
    .title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .chart-container, .table-container {
      width: 100%;
      flex-grow: 1;
      /*display: flex;*/
      justify-content: center;
      align-items: center;
    }
    .chart-container canvas {
      max-width: 100%;
    }
    .table-container {
      position: relative;
      overflow: auto;
      max-height: 400px; /* Altura máxima adicionada */
    }     
    .table-container table {
      width: 100%;
      border-collapse: collapse;
    }
    .table-container th, .table-container td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
      font-size: 12px;
    }
    .table-container th {
      background-color: #f2f2f2;
      position: sticky; /* Fixa o cabeçalho */
      top: 0; /* Coloca no topo */
      z-index: 1; /* Garante que fique acima do conteúdo scrollado */      
    }
    .overlay {
      position: absolute;
      top: 55%;
      left: 65%;
      transform: translate(-50%, -50%);
      font-size: 34px;
      font-weight: bold;
      pointer-events: none; /* Permite interação com o gráfico */
    }    
    /* Estilo do filtro */
    .filter-container {
        margin-bottom: 20px;
        align-self: flex-start; /* Alinha o filtro à esquerda */
    }    
  </style>

<snk:load/>


</head>

<body>

<snk:query var="fat_ger">

SELECT

SUM(TOTALLIQ)VLRFAT

FROM VGF_CONSOLIDADOR_NOTAS_GM
WHERE
DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND GOLSINAL = -1
AND TIPMOV IN ('V', 'D')
AND ATIVO = 'S' 
AND CODEMP IN (:P_EMPRESA)
AND CODNAT IN (:P_NATUREZA)
AND CODCENCUS IN (:P_CR)
AND CODVEND IN (:P_VENDEDOR)
AND AD_SUPERVISOR IN (:P_SUPERVISOR)
AND CODGER IN (:P_GERENTE)
AND AD_ROTA IN (:P_ROTA)
AND CODTIPOPER IN (:P_TOP)
AND AD_SUPERVISOR = :A_SUPERVISOR
AND AD_TPPROD = :A_TPPROD


</snk:query>   

<snk:query var="fat_tipo">  
SELECT
AD_TPPROD,
CODVEND,
VENDEDOR,
AD_SUPERVISOR,
SUPERVISOR,
CODGER,
SUM(TOTALLIQ)VLRFAT

FROM VGF_CONSOLIDADOR_NOTAS_GM
WHERE
DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND GOLSINAL = -1
AND TIPMOV IN ('V', 'D')
AND ATIVO = 'S' 
AND CODEMP IN (:P_EMPRESA)
AND CODNAT IN (:P_NATUREZA)
AND CODCENCUS IN (:P_CR)
AND CODVEND IN (:P_VENDEDOR)
AND AD_SUPERVISOR IN (:P_SUPERVISOR)
AND CODGER IN (:P_GERENTE)
AND AD_ROTA IN (:P_ROTA)
AND CODTIPOPER IN (:P_TOP)
AND AD_SUPERVISOR = :A_SUPERVISOR
AND AD_TPPROD = :A_TPPROD
GROUP BY AD_TPPROD, CODVEND, VENDEDOR, AD_SUPERVISOR, SUPERVISOR,CODGER
ORDER BY 5 DESC
</snk:query>    


<snk:query var="det_sup">
SELECT
CODEMP,CODVEND,VENDEDOR,AD_SUPERVISOR,SUPERVISOR,CODGER,GERENTE,TIPOPROD,CODPROD,DESCRPROD AS PRODUTO,SUM(TOTALLIQ)TOTALLIQ
FROM VGF_CONSOLIDADOR_NOTAS_GM
WHERE
DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
AND GOLSINAL = -1
AND TIPMOV IN ('V', 'D')
AND ATIVO = 'S' 
AND CODEMP IN (:P_EMPRESA)
AND CODNAT IN (:P_NATUREZA)
AND CODCENCUS IN (:P_CR)
AND CODVEND IN (:P_VENDEDOR)
AND AD_SUPERVISOR IN (:P_SUPERVISOR)
AND CODGER IN (:P_GERENTE)
AND AD_ROTA IN (:P_ROTA)
AND CODTIPOPER IN (:P_TOP)
AND AD_TPPROD = :A_TPPROD
AND AD_SUPERVISOR = :A_SUPERVISOR
GROUP BY CODEMP,CODVEND,VENDEDOR,AD_SUPERVISOR,SUPERVISOR,CODGER,GERENTE,TIPOPROD,CODPROD,DESCRPROD
</snk:query>



<div class="section">
  <div class="title">Faturamento por Vendedor</div>
  <div class="chart-container">
    <canvas id="doughnutChart"></canvas>
    <c:forEach items="${fat_ger.rows}" var="row">                    
        <div class="overlay"><fmt:formatNumber value="${row.VLRFAT}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="0" maxFractionDigits="0"/></div>
    </c:forEach>    
  </div>
</div>

<div class="section">
  <div class="title">Detalhamento por Produto</div>
  
    <!-- Filtro de Vendedor -->
    <div class="filter-container">
      <label for="vendedorFilter">Filtro por Vendedor:</label>
      <select id="vendedorFilter" class="form-control">
          <option value="">Todos</option>
          <c:forEach items="${fat_tipo.rows}" var="row">
              <option value="${row.VENDEDOR}">${row.VENDEDOR}</option>
          </c:forEach>
      </select>
  </div>
  
  <div class="table-container">
    <table>
      <thead>
        <tr>
            <th>Cód. Emp.</th>
            <th>Cód. Vend.</th>
            <th>Vendedor</th>
            <th>Tp. Produto</th>
            <th>Cód. Prod.</th>
            <th>Produto</th>            
            <th>Total Líq.</th>
        </tr>
    </thead>
    <tbody id="productTableBody">
        <c:set var="total" value="0" />
        <c:forEach items="${det_sup.rows}" var="row">
            <tr class="table-row" data-vendedor="${row.VENDEDOR}">
                <td>${row.CODEMP}</td>
                <td>${row.CODVEND}</td>
                <td>${row.VENDEDOR}</td>
                <td>${row.TIPOPROD}</td>
                <td onclick="abrir_det('${row.CODPROD}','${row.CODVEND}')">${row.CODPROD}</td>
                <td>${row.PRODUTO}</td>
                <td><fmt:formatNumber value="${row.TOTALLIQ}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></td>
                <c:set var="total" value="${total + row.TOTALLIQ}" />
            </tr>
        </c:forEach>
        <tr>
            <td><b>Total</b></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td><b><fmt:formatNumber value="${total}" type="currency" currencySymbol="" groupingUsed="true" minFractionDigits="2" maxFractionDigits="2"/></b></td>
        </tr>
    </tbody>
    </table>
  </div>
</div>

<script>



        // Função para abrir o novo nível

        function abrir_det(produto,codvend) {
                var params = {'A_CODPROD': parseInt(produto),
                              'A_VENDEDOR': parseInt(codvend)

                };
                var level = 'lvl_n992o6'; // abre 73
                openLevel(level, params);
            }


          // Função para recalcular o total dos itens visíveis
          function atualizarTotalVisivel() {
              var rows = document.querySelectorAll('#productTableBody .table-row');
              var total = 0;

              rows.forEach(function(row) {
                  if (row.style.display !== 'none') {
                      var totalLiqCell = row.querySelector('td:last-child');
                      var valor = parseFloat(totalLiqCell.textContent.replace(/\./g, '').replace(',', '.')); // Converter para número
                      total += valor;
                  }
              });

              // Atualizar o valor do total na última linha da tabela
              var totalCell = document.querySelector('#productTableBody tr:last-child td:last-child b');
              totalCell.textContent = new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
              }).format(total);
          }
                        


        // Filtrar tabela com base na seleção do vendedor
        document.getElementById('vendedorFilter').addEventListener('change', function() {
            var selectedVendedor = this.value;
            var rows = document.querySelectorAll('#productTableBody .table-row');

            rows.forEach(function(row) {
                if (selectedVendedor === '' || row.dataset.vendedor === selectedVendedor) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });

          // Recalcular o total dos itens visíveis após o filtro
          atualizarTotalVisivel();

        });




  document.addEventListener('DOMContentLoaded', function() {
  var ctx = document.getElementById('doughnutChart').getContext('2d');

  var vendedorLabels = [
            <c:forEach items="${fat_tipo.rows}" var="row">
            "${row.AD_TPPROD}-${row.CODVEND}-${row.VENDEDOR}",
            </c:forEach>              
        ];

  var vendedorData = [
      <c:forEach items="${fat_tipo.rows}" var="row">
          ${row.VLRFAT},
      </c:forEach>        
  ];


  var doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: vendedorLabels,
      datasets: [{
        label: 'Faturamento',
        data: vendedorData,
        backgroundColor: [
        'rgba(255, 99, 132, 0.4)',
        'rgba(54, 162, 235, 0.4)',
        'rgba(255, 206, 86, 0.4)',
        'rgba(75, 192, 192, 0.4)',
        'rgba(153, 102, 255, 0.4)',
        'rgba(255, 159, 64, 0.4)'            
    ],
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '50%',
      plugins: {
        tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        let value = context.raw || 0;
                        let formattedValue = new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
                        return label + ': ' + formattedValue;
                    }
                }
            },        
        legend: {
            position: 'left',
            align: 'center', // Alinhamento vertical da legenda
        }
      },
      onClick: function(evt, activeElements) {
        if (activeElements.length > 0) {
            const index = activeElements[0].index;
            const grupo = vendedorLabels[index].split('-')[0];
            const grupo1 = vendedorLabels[index].split('-')[1];
            //ref_sup(grupo,grupo1);
        }
      }
    }
  });
});  
</script>

</body>
</html>
