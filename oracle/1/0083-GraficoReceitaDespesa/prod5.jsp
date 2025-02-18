<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Responsivo com Gráficos</title>
  
  <!-- Link para o CSS do noUiSlider -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.0/nouislider.min.css">
  
  <!-- Link para o Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <style>
    /* Estilos Gerais */
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      display: flex;
      flex-direction: column;
      padding: 20px;
    }
    .header {
      margin-bottom: 20px;
      text-align: center;
    }
    .slider {
      margin: 20px auto;
      width: 80%;
    }
    .row {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
    }
    .quadrante {
      flex: 1;
      background-color: #fff;
      padding: 15px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      margin: 10px 0;
      border-radius: 10px; /* Borda arredondada */
    }
    .quadrante h2 {
      text-align: center; /* Centraliza o título */
    }
    canvas {
      width: 100%;
      height: 300px;
      border-radius: 10px; /* Borda arredondada */
    }
  </style>
    <snk:load/>
</head>
<body>

  <snk:query var="mes_ref">
    select :P_MES_REF AS MES_REF from dual
  </snk:query>

    <snk:query var="prev_rec">
    select
    dia,
    SUM(case when a = 'ATUAL' THEN vlrdesdob_prov_N end) vlr_prov_N_ATUAL,
    SUM(case when a = 'ATUAL' THEN vlrdesdob_prov_S end) vlr_prov_S_ATUAL,
    SUM(case when a = 'ANTERIOR' THEN vlrdesdob_prov_N end) vlr_prov_N_ANT
    FROM(
      select
      'ATUAL' a,
      to_char(nvl(dtvenc,dhbaixa),'dd') Dia,
      sum(case when dhbaixa is null and provisao = 'N' then vlrdesdob else vlrbaixa end) vlrdesdob_prov_N,
      sum(case when dhbaixa is null and provisao = 'S' then vlrdesdob else vlrbaixa end) vlrdesdob_prov_S
      from tgffin
      where recdesp = 1
      and NVL(DHBAIXA,dtvenc) BETWEEN TRUNC(SYSDATE, 'MM') AND LAST_DAY(SYSDATE) /*...OR PARAMETRO DE DATA INFORMADO...*/
      group by
      to_char(nvl(dtvenc,dhbaixa),'dd')

      union all

      select
      'ANTERIOR' a,
      to_char(DHBAIXA,'dd') Dia,
      sum(case when dhbaixa is null then vlrdesdob else vlrbaixa end) vlrdesdob_prov_N,
      null vlrdesdob_prov_S
      from tgffin
      where recdesp = 1
      and provisao = 'N'
      and DHBAIXA BETWEEN TRUNC(ADD_MONTHS(SYSDATE, -1), 'MM') AND LAST_DAY(ADD_MONTHS(SYSDATE, -1))
      group by
      to_char(DHBAIXA,'dd')
    )
    group by dia
    ORDER BY 1
    </snk:query>

  <div class="container">
    <div class="header">
      <h1>Dashboard Financeiro</h1>
      <div id="slider" class="slider"></div>
    </div>
    <div class="row">
      <div class="quadrante">
        <h2>Previsão Receita</h2>
        <canvas id="chart-receita"></canvas>
      </div>
      <div class="quadrante">
        <h2>Previsão Despesa Efetiva</h2>
        <canvas id="chart-despesa"></canvas>
      </div>
    </div>
    <div class="row">
      <div class="quadrante">
        <h2>Previsão Ordem de Compra</h2>
        <canvas id="chart-compra"></canvas>
      </div>
      <div class="quadrante">
        <h2>Fluxo de Caixa</h2>
        <canvas id="chart-fluxo"></canvas>
      </div>
    </div>
  </div>

  <!-- Script para o noUiSlider -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.0/nouislider.min.js"></script>

  <script>
    // Inicialização do Slider
    var slider = document.getElementById('slider');
    noUiSlider.create(slider, {
      start: [1],
      connect: [true, false],
      range: {
        'min': [1],
        'max': [31]
      },
      step: 1,
      format: {
        to: function (value) {
          return Math.round(value);
        },
        from: function (value) {
          return Math.round(value);
        }
      }
    });

    // Processando os dados da query prev_rec
    const receitaData = {
      labels: [], // Dias
      vlrProvN_Atual: [], // Valores ATUAL (Provisão N)
      vlrProvS_Atual: [], // Valores ATUAL (Provisão S)
      vlrProvN_Ant: [] // Valores ANTERIOR (Provisão N)
    };

    <c:forEach var="row" items="${prev_rec.rows}">
      receitaData.labels.push("${row.dia}");
      receitaData.vlrProvN_Atual.push(${row.vlr_prov_N_ATUAL});
      receitaData.vlrProvS_Atual.push(${row.vlr_prov_S_ATUAL});
      receitaData.vlrProvN_Ant.push(${row.vlr_prov_N_ANT});
    </c:forEach>

    // Dados de exemplo para despesa, compra e fluxo
    const data = {
      despesa: [90, 100, 120, 110, 100, 140, 160, 150, 145, 190, 180, 200, 220, 230, 210, 220, 200, 190, 170, 160, 150, 140, 130, 180, 175, 185, 195, 205, 210, 225, 240],
      compra: [50, 60, 70, 65, 60, 80, 90, 85, 95, 100, 105, 110, 115, 120, 110, 100, 95, 90, 80, 75, 70, 65, 60, 58, 65, 70, 72, 76, 80, 85, 90],
      fluxo: {
        receita: receitaData.vlrProvN_Atual,
        despesa: [90, 100, 120, 110, 100, 140, 160, 150, 145, 190, 180, 200, 220, 230, 210, 220, 200, 190, 170, 160, 150, 140, 130, 180, 175, 185, 195, 205, 210, 225, 240]
      }
    };

    // Funções para atualizar cada gráfico
    function updateChartReceita(dayCount) {
      let labels = receitaData.labels.slice(0, dayCount);
      let vlrProvN_Atual = receitaData.vlrProvN_Atual.slice(0, dayCount);
      let vlrProvS_Atual = receitaData.vlrProvS_Atual.slice(0, dayCount);
      let vlrProvN_Ant = receitaData.vlrProvN_Ant.slice(0, dayCount);

      receitaChart.data.labels = labels;
      receitaChart.data.datasets[0].data = vlrProvN_Atual; // ATUAL (Provisão N)
      receitaChart.data.datasets[1].data = vlrProvS_Atual; // ATUAL (Provisão S)
      receitaChart.data.datasets[2].data = vlrProvN_Ant; // ANTERIOR (Provisão N)
      receitaChart.update();
    }

    function updateChartDespesa(dayCount) {
      let chartData = data.despesa.slice(0, dayCount);
      despesaChart.data.labels = Array.from({length: dayCount}, (_, i) => i + 1);
      despesaChart.data.datasets[0].data = chartData;
      despesaChart.update();
    }

    function updateChartCompra(dayCount) {
      let chartData = data.compra.slice(0, dayCount);
      compraChart.data.labels = Array.from({length: dayCount}, (_, i) => i + 1);
      compraChart.data.datasets[0].data = chartData;
      compraChart.update();
    }

    function updateChartFluxo(dayCount) {
      let receitaData = data.fluxo.receita.slice(0, dayCount);
      let despesaData = data.fluxo.despesa.slice(0, dayCount);
      fluxoChart.data.labels = Array.from({length: dayCount}, (_, i) => i + 1);
      fluxoChart.data.datasets[0].data = receitaData;
      fluxoChart.data.datasets[1].data = despesaData;
      fluxoChart.update();
    }

    // Configuração do Gráfico de Receita com três séries
    const receitaChart = new Chart(document.getElementById('chart-receita'), {
      type: 'bar',
      data: {
        labels: receitaData.labels,
        datasets: [
          {
            label: 'ATUAL (Provisão N)',
            data: receitaData.vlrProvN_Atual,
            backgroundColor: 'rgba(0, 123, 255, 0.6)', // Azul
            stack: 'agrupado' // Definir a mesma stack
          },
          {
            label: 'ATUAL (Provisão S)',
            data: receitaData.vlrProvS_Atual,
            backgroundColor: 'rgba(0, 255, 123, 0.6)', // Verde
            stack: 'agrupado' // Definir a mesma stack
          },
          {
            label: 'ANTERIOR (Provisão N)',
            data: receitaData.vlrProvN_Ant,
            borderColor: 'rgba(255, 99, 132, 1)', // Vermelho
            borderWidth: 2,
            fill: false,
            type: 'line'
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            stacked: true // Ativar empilhamento no eixo Y
          },
          x: {
            stacked: true // Ativar empilhamento no eixo X
          }
        }
      }
    });


    // Configuração dos outros gráficos
    const despesaChart = new Chart(document.getElementById('chart-despesa'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Despesa',
          data: [],
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        }]
      }
    });

    const compraChart = new Chart(document.getElementById('chart-compra'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Ordem de Compra',
          data: [],
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }]
      }
    });

    const fluxoChart = new Chart(document.getElementById('chart-fluxo'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Receita',
            data: [],
            backgroundColor: 'rgba(0, 123, 255, 0.6)'
          },
          {
            label: 'Despesa',
            data: [],
            backgroundColor: 'rgba(255, 99, 132, 0.6)'
          }
        ]
      }
    });

    // Adicionando o evento de atualização ao slider
    slider.noUiSlider.on('update', function (values, handle) {
      let dayCount = Math.round(values[0]);
      updateCharts(dayCount);
    });

    // Função para atualizar todos os gráficos
    function updateCharts(dayCount) {
      updateChartReceita(dayCount);
      updateChartDespesa(dayCount);
      updateChartCompra(dayCount);
      updateChartFluxo(dayCount);
    }

    // Inicialização com o valor inicial do slider
    updateCharts(1);
  </script>
</body>
</html>