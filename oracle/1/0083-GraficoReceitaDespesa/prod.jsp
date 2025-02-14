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
    }
    canvas {
      width: 100%;
      height: 300px;
    }
  </style>
  <snk:load/>
</head>
<body>
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

    // Atualizando os gráficos com os dados do slider
    function updateCharts(dayCount) {
      // Atualizando os gráficos conforme o valor do slider (dayCount)
      updateChartReceita(dayCount);
      updateChartDespesa(dayCount);
      updateChartCompra(dayCount);
      updateChartFluxo(dayCount);
    }

    // Dados de exemplo (seriam normalmente provenientes de uma API)
    const data = {
      receita: [100, 120, 130, 110, 95, 160, 180, 150, 170, 200, 220, 250, 270, 280, 260, 240, 230, 210, 180, 150, 140, 160, 170, 180, 190, 210, 220, 230, 250, 260, 280],
      despesa: [90, 100, 120, 110, 100, 140, 160, 150, 145, 190, 180, 200, 220, 230, 210, 220, 200, 190, 170, 160, 150, 140, 130, 180, 175, 185, 195, 205, 210, 225, 240],
      compra: [50, 60, 70, 65, 60, 80, 90, 85, 95, 100, 105, 110, 115, 120, 110, 100, 95, 90, 80, 75, 70, 65, 60, 58, 65, 70, 72, 76, 80, 85, 90],
      fluxo: {
        receita: [100, 120, 130, 110, 95, 160, 180, 150, 170, 200, 220, 250, 270, 280, 260, 240, 230, 210, 180, 150, 140, 160, 170, 180, 190, 210, 220, 230, 250, 260, 280],
        despesa: [90, 100, 120, 110, 100, 140, 160, 150, 145, 190, 180, 200, 220, 230, 210, 220, 200, 190, 170, 160, 150, 140, 130, 180, 175, 185, 195, 205, 210, 225, 240]
      }
    };

    // Funções para atualizar cada gráfico
    function updateChartReceita(dayCount) {
      let chartData = data.receita.slice(0, dayCount);
      receitaChart.data.labels = Array.from({length: dayCount}, (_, i) => i + 1);
      receitaChart.data.datasets[0].data = chartData;
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

    // Configuração dos Gráficos usando o Chart.js
    const receitaChart = new Chart(document.getElementById('chart-receita'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Receita',
          data: [],
          backgroundColor: 'rgba(0, 123, 255, 0.6)'
        }]
      }
    });

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

    // Inicialização com o valor inicial do slider
    updateCharts(1);
  </script>
</body>
</html>
