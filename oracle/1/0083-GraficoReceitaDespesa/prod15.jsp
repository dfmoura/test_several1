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

    .slider-container {
      display: flex;
      align-items: center;
      gap: 15px; /* Espaço entre o slider e o label */
      width: 80%;
      margin: 20px auto;
    }

    #slider-value {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff; /* Texto branco */
      background-color: #007bff; /* Fundo azul */
      padding: 8px 12px; /* Espaçamento interno */
      border-radius: 20px; /* Bordas arredondadas */
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Sombra sutil */
      min-width: 40px; /* Largura mínima para evitar mudanças de tamanho */
      text-align: center; /* Centralizar o texto */
    }   
  </style>
    <snk:load/>
</head>
<body>

  <snk:query var="mes_ref">

  SELECT 
  TO_CHAR(TO_DATE(
  NVL(
  FUNC_OBTER_DATE(:P_MES_REF),
  FUNC_OBTER_DATE(SYSDATE)
  )
  , 'DD/MM/YYYY'), 'Month - YYYY', 'NLS_DATE_LANGUAGE=PORTUGUESE') mes_ref 
  FROM DUAL  

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
      and (
      NVL(DHBAIXA,dtvenc) BETWEEN 
      TRUNC(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), 'MM')
      AND 
      LAST_DAY(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'))
      )

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
      and (DHBAIXA BETWEEN 
      TRUNC(ADD_MONTHS(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), -1), 'MM')
      AND 
      LAST_DAY(ADD_MONTHS(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), -1))
      )

      group by
      to_char(DHBAIXA,'dd')
    )
    group by dia
    ORDER BY 1
    </snk:query>

    <snk:query var="prev_desp">
      select
      dia,
      SUM(case when a = 'ATUAL' THEN vlrdesdob_prov_N end) vlr_prov_N_ATUAL,
      SUM(case when a = 'ANTERIOR' THEN vlrdesdob_prov_N end) vlr_prov_N_ANT
      FROM(
        select
        'ATUAL' a,
        to_char(nvl(dtvenc,dhbaixa),'dd') Dia,
        sum(case when dhbaixa is null and provisao = 'N' then vlrdesdob else vlrbaixa end) vlrdesdob_prov_N,
        sum(case when dhbaixa is null and provisao = 'S' then vlrdesdob else vlrbaixa end) vlrdesdob_prov_S
        from tgffin
        where recdesp = -1
        and 
        (
        NVL(DHBAIXA,dtvenc) BETWEEN 
        TRUNC(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), 'MM')
        AND 
        LAST_DAY(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'))
        )
        group by
        to_char(nvl(dtvenc,dhbaixa),'dd')
      
        union all
      
        select
        'ANTERIOR' a,
        to_char(DHBAIXA,'dd') Dia,
        sum(case when dhbaixa is null then vlrdesdob else vlrbaixa end) vlrdesdob_prov_N,
        null vlrdesdob_prov_S
        from tgffin
        where recdesp = -1
        and provisao = 'N'
        and (DHBAIXA BETWEEN 
        TRUNC(ADD_MONTHS(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), -1), 'MM')
        AND 
        LAST_DAY(ADD_MONTHS(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), -1))        
        )
        group by
        to_char(DHBAIXA,'dd')
      )
      group by dia
      ORDER BY 1
    </snk:query>

    <snk:query var="prev_oc">
    select
    dia,
    SUM(case when a = 'ATUAL' THEN vlrdesdob_prov_S end) vlr_prov_S_ATUAL,
    SUM(case when a = 'ANTERIOR' THEN vlrdesdob_prov_S end) vlr_prov_S_ANT
    FROM(
      select
      'ATUAL' a,
      to_char(nvl(dtvenc,dhbaixa),'dd') Dia,
      sum(case when dhbaixa is null and provisao = 'N' then vlrdesdob else vlrbaixa end) vlrdesdob_prov_N,
      sum(case when dhbaixa is null and provisao = 'S' then vlrdesdob else vlrbaixa end) vlrdesdob_prov_S
      from tgffin
      where recdesp = -1
      and (NVL(DHBAIXA,dtvenc) BETWEEN 
      TRUNC(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), 'MM')
      AND 
      LAST_DAY(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'))
      )

      group by
      to_char(nvl(dtvenc,dhbaixa),'dd')
    
      union all
    
      select
      'ANTERIOR' a,
      to_char(dtvenc,'dd') Dia,
      NULL vlrdesdob_prov_N,
      sum(vlrdesdob) vlrdesdob_prov_S
      from tgffin
      where recdesp = -1
      and provisao = 'S'
      and (dtvenc BETWEEN 
      TRUNC(ADD_MONTHS(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), -1), 'MM')
      AND 
      LAST_DAY(ADD_MONTHS(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), -1))           
      )
      group by
      to_char(dtvenc,'dd')
    )
    group by dia
    ORDER BY 1    
    </snk:query>

    <snk:query var="fluxo_caixa">
        SELECT
        dia,
        SUM(vlr_receita) AS vlr_receita,
        SUM(vlr_despesa) AS vlr_despesa,
        SUM(SUM(vlr_receita) - SUM(vlr_despesa)) 
            OVER (ORDER BY TO_NUMBER(dia) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) 
            AS saldo_acumulado
        FROM (
            SELECT
                TO_CHAR(NVL(dtvenc, dhbaixa), 'DD') AS dia,
                SUM(CASE WHEN recdesp = 1 THEN NVL(vlrbaixa, vlrdesdob) ELSE 0 END) AS vlr_receita,
                SUM(CASE WHEN recdesp = -1 THEN NVL(vlrbaixa, vlrdesdob) ELSE 0 END) AS vlr_despesa
            FROM tgffin
            WHERE NVL(dhbaixa, dtvenc) BETWEEN 

            TRUNC(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), 'MM')
            AND 
            LAST_DAY(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'))

            GROUP BY TO_CHAR(NVL(dtvenc, dhbaixa), 'DD')
        )
        GROUP BY dia
        ORDER BY TO_NUMBER(dia)
    </snk:query>
    

  <div class="container">
    <div class="header">
      <c:forEach var="row" items="${mes_ref.rows}">
      <h1>Dashboard Financeiro - Referência: ${row.mes_ref}</h1>
      </c:forEach>
      <div class="slider-container">
        <div id="slider" class="slider"></div>
        <span id="slider-value">1</span> <!-- Label estilizado -->
      </div>
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
    var sliderValue = document.getElementById('slider-value'); // Elemento do label

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

    // Processando os dados da query prev_desp
    const despesaData = {
      labels: [], // Dias
      vlrProvN_Atual: [], // Valores ATUAL (Provisão N)
      vlrProvN_Ant: [] // Valores ANTERIOR (Provisão N)
    };

    <c:forEach var="row" items="${prev_desp.rows}">
      despesaData.labels.push("${row.dia}");
      despesaData.vlrProvN_Atual.push(${row.vlr_prov_N_ATUAL});
      despesaData.vlrProvN_Ant.push(${row.vlr_prov_N_ANT});
    </c:forEach>

    // Processando os dados da query prev_oc
    const compraData = {
      labels: [], // Dias
      vlrProvS_Atual: [], // Valores ATUAL (Provisão S)
      vlrProvS_Ant: [] // Valores ANTERIOR (Provisão S)
    };

    <c:forEach var="row" items="${prev_oc.rows}">
      compraData.labels.push("${row.dia}");
      compraData.vlrProvS_Atual.push(${row.vlr_prov_S_ATUAL});
      compraData.vlrProvS_Ant.push(${row.vlr_prov_S_ANT});
    </c:forEach>

    // Processando os dados da query fluxo_caixa
    const fluxoData = {
      labels: [], // Dias
      vlrReceita: [], // Valores de Receita
      vlrDespesa: [], // Valores de Despesa
      saldoAcumulado: [] // Valores de Saldo Acumulado
    };

    <c:forEach var="row" items="${fluxo_caixa.rows}">
      fluxoData.labels.push("${row.dia}");
      fluxoData.vlrReceita.push(${row.vlr_receita});
      fluxoData.vlrDespesa.push(${row.vlr_despesa});
      fluxoData.saldoAcumulado.push(${row.saldo_acumulado});
    </c:forEach>

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
      let labels = despesaData.labels.slice(0, dayCount);
      let vlrProvN_Atual = despesaData.vlrProvN_Atual.slice(0, dayCount);
      let vlrProvN_Ant = despesaData.vlrProvN_Ant.slice(0, dayCount);

      despesaChart.data.labels = labels;
      despesaChart.data.datasets[0].data = vlrProvN_Atual; // ATUAL (Provisão N)
      despesaChart.data.datasets[1].data = vlrProvN_Ant; // ANTERIOR (Provisão N)
      despesaChart.update();
    }

    function updateChartCompra(dayCount) {
      let labels = compraData.labels.slice(0, dayCount);
      let vlrProvS_Atual = compraData.vlrProvS_Atual.slice(0, dayCount);
      let vlrProvS_Ant = compraData.vlrProvS_Ant.slice(0, dayCount);

      compraChart.data.labels = labels;
      compraChart.data.datasets[0].data = vlrProvS_Atual; // ATUAL (Provisão S)
      compraChart.data.datasets[1].data = vlrProvS_Ant; // ANTERIOR (Provisão S)
      compraChart.update();
    }

    function updateChartFluxo(dayCount) {
      let labels = fluxoData.labels.slice(0, dayCount);
      let vlrReceita = fluxoData.vlrReceita.slice(0, dayCount);
      let vlrDespesa = fluxoData.vlrDespesa.slice(0, dayCount);
      let saldoAcumulado = fluxoData.saldoAcumulado.slice(0, dayCount);

      fluxoChart.data.labels = labels;
      fluxoChart.data.datasets[0].data = vlrReceita; // Receita
      fluxoChart.data.datasets[1].data = vlrDespesa; // Despesa
      fluxoChart.data.datasets[2].data = saldoAcumulado; // Saldo Acumulado
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

    // Configuração do Gráfico de Despesa com duas séries
    const despesaChart = new Chart(document.getElementById('chart-despesa'), {
      type: 'bar',
      data: {
        labels: despesaData.labels,
        datasets: [
          {
            label: 'ATUAL (Provisão N)',
            data: despesaData.vlrProvN_Atual,
            backgroundColor: 'rgba(255, 99, 132, 0.6)', // Vermelho
            stack: 'agrupado' // Definir a mesma stack
          },
          {
            label: 'ANTERIOR (Provisão N)',
            data: despesaData.vlrProvN_Ant,
            borderColor: 'rgba(0, 123, 255, 1)', // Azul
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

    // Configuração do Gráfico de Compra com duas séries
    const compraChart = new Chart(document.getElementById('chart-compra'), {
      type: 'bar',
      data: {
        labels: compraData.labels,
        datasets: [
          {
            label: 'ATUAL (Provisão S)',
            data: compraData.vlrProvS_Atual,
            backgroundColor: 'rgba(75, 192, 192, 0.6)', // Verde-água
            stack: 'agrupado' // Definir a mesma stack
          },
          {
            label: 'ANTERIOR (Provisão S)',
            data: compraData.vlrProvS_Ant,
            borderColor: 'rgba(153, 102, 255, 1)', // Roxo
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

    // Configuração do Gráfico de Fluxo de Caixa
    const fluxoChart = new Chart(document.getElementById('chart-fluxo'), {
      type: 'bar',
      data: {
        labels: fluxoData.labels,
        datasets: [
          {
            label: 'Receita',
            data: fluxoData.vlrReceita,
            backgroundColor: 'rgba(0, 123, 255, 0.6)' // Azul
          },
          {
            label: 'Despesa',
            data: fluxoData.vlrDespesa,
            backgroundColor: 'rgba(255, 99, 132, 0.6)' // Vermelho
          },
          {
            label: 'Saldo Acumulado',
            data: fluxoData.saldoAcumulado,
            borderColor: 'rgba(75, 192, 192, 1)', // Verde-água
            borderWidth: 2,
            fill: false,
            type: 'line'
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Adicionando o evento de atualização ao slider
    slider.noUiSlider.on('update', function (values, handle) {
      let dayCount = Math.round(values[0]);
      sliderValue.textContent = dayCount; // Atualiza o valor do label
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