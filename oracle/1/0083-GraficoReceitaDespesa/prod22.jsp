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
  , 'DD/MM/YYYY'), 'Month - YYYY', 'NLS_DATE_LANGUAGE=PORTUGUESE') mes_ref,
  TO_CHAR(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), 'MM', 'NLS_DATE_LANGUAGE=PORTUGUESE') AS mes,
  TO_CHAR(TO_DATE(NVL(FUNC_OBTER_DATE(:P_MES_REF), FUNC_OBTER_DATE(SYSDATE)), 'DD/MM/YYYY'), 'YYYY', 'NLS_DATE_LANGUAGE=PORTUGUESE') AS ano  
  FROM DUAL  

  </snk:query>

    <snk:query var="prev_rec">

      WITH datas AS (
        SELECT 
            TO_DATE(FUNC_OBTER_DATE(:P_MES_REF), 'DD/MM/YYYY') AS data_ref
        FROM dual
    ),
    periodos AS (
        SELECT 
            TRUNC(data_ref, 'MM') AS inicio_mes_atual,
            LAST_DAY(data_ref) AS fim_mes_atual,
            TRUNC(ADD_MONTHS(data_ref, -1), 'MM') AS inicio_mes_anterior,
            LAST_DAY(ADD_MONTHS(data_ref, -1)) AS fim_mes_anterior
        FROM datas
    ),
    dados_atual AS (
        SELECT
            'ATUAL' AS a,
            TO_CHAR(NVL(dhbaixa,dtvenc), 'dd') AS dia,
            SUM(CASE WHEN dhbaixa IS NULL AND provisao = 'N' THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_N,
            SUM(CASE WHEN dhbaixa IS NULL AND provisao = 'S' THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_S
        FROM tgffin, periodos
        WHERE recdesp = 1
          AND NVL(dhbaixa, dtvenc) BETWEEN periodos.inicio_mes_atual AND periodos.fim_mes_atual

          AND (
            ( dhbaixa is not null and provisao = 'N' and dtvenc < trunc(sysdate) and :P_TIT_ABERTOS =  'N' ) or ( :P_TIT_ABERTOS =  'S'  and dtvenc >= trunc(sysdate) )
          )             
          
          
        GROUP BY TO_CHAR(NVL(dhbaixa,dtvenc), 'dd')
    ),
    dados_anterior AS (
        SELECT
            'ANTERIOR' AS a,
            TO_CHAR(NVL(dhbaixa,dtvenc), 'dd') AS dia,
            SUM(CASE WHEN dhbaixa IS NULL THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_N,
            NULL AS vlrdesdob_prov_S
        FROM tgffin, periodos
        WHERE recdesp = 1
          AND provisao = 'N'
          AND dhbaixa BETWEEN periodos.inicio_mes_anterior AND periodos.fim_mes_anterior
          AND ((dhbaixa is null and :P_CHECK_BAIXA =  'S') OR (dhbaixa is not null and :P_CHECK_BAIXA =  'N'))
        GROUP BY TO_CHAR(NVL(dhbaixa,dtvenc), 'dd')
    )
    SELECT
        dia,
        SUM(CASE WHEN a = 'ATUAL' THEN vlrdesdob_prov_N END) AS vlr_prov_N_ATUAL,
        SUM(CASE WHEN a = 'ATUAL' THEN vlrdesdob_prov_S END) AS vlr_prov_S_ATUAL,
        SUM(CASE WHEN a = 'ANTERIOR' THEN vlrdesdob_prov_N END) AS vlr_prov_N_ANT
    FROM (
        SELECT * FROM dados_atual
        UNION ALL
        SELECT * FROM dados_anterior
    )
    
    GROUP BY dia
    ORDER BY dia

    </snk:query>

    <snk:query var="prev_desp">

        WITH datas AS (
          SELECT 
            TO_DATE(FUNC_OBTER_DATE(:P_MES_REF), 'DD/MM/YYYY') AS data_ref
          FROM dual
      ),
      periodos AS (
          SELECT 
              TRUNC(data_ref, 'MM') AS inicio_mes_atual,
              LAST_DAY(data_ref) AS fim_mes_atual,
              TRUNC(ADD_MONTHS(data_ref, -1), 'MM') AS inicio_mes_anterior,
              LAST_DAY(ADD_MONTHS(data_ref, -1)) AS fim_mes_anterior
          FROM datas
      ),
      dados_atual AS (
          SELECT
              'ATUAL' AS a,
              TO_CHAR(NVL(dhbaixa,dtvenc), 'dd') AS dia,
              SUM(CASE WHEN dhbaixa IS NULL AND provisao = 'N' THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_N,
              SUM(CASE WHEN dhbaixa IS NULL AND provisao = 'S' THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_S
          FROM tgffin, periodos
          WHERE recdesp = -1
          AND (
            ( dhbaixa is not null and provisao = 'N' and dtvenc < trunc(sysdate) and :P_TIT_ABERTOS =  'N' ) or ( :P_TIT_ABERTOS =  'S'  and dtvenc >= trunc(sysdate) )
          )
            GROUP BY TO_CHAR(NVL(dhbaixa,dtvenc), 'dd')

      
          ),
      dados_anterior AS (
          SELECT
              'ANTERIOR' AS a,
              TO_CHAR(NVL(dhbaixa,dtvenc), 'dd') AS dia,
              SUM(CASE WHEN dhbaixa IS NULL THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_N,
              NULL AS vlrdesdob_prov_S
          FROM tgffin, periodos
          WHERE recdesp = -1
            AND provisao = 'N'
            AND dhbaixa BETWEEN periodos.inicio_mes_anterior AND periodos.fim_mes_anterior
            AND ((dhbaixa is null and :P_CHECK_BAIXA =  'S') OR (dhbaixa is not null and :P_CHECK_BAIXA =  'N'))
          GROUP BY TO_CHAR(NVL(dhbaixa,dtvenc), 'dd')
      )
      SELECT
          dia,
          SUM(CASE WHEN a = 'ATUAL' THEN vlrdesdob_prov_N END) AS vlr_prov_N_ATUAL,
          SUM(CASE WHEN a = 'ANTERIOR' THEN vlrdesdob_prov_N END) AS vlr_prov_N_ANT
      FROM (
          SELECT * FROM dados_atual
          UNION ALL
          SELECT * FROM dados_anterior
      )
      
      GROUP BY dia
      ORDER BY dia


    </snk:query>

    <snk:query var="prev_oc">

        WITH datas AS (
          SELECT 
            TO_DATE(FUNC_OBTER_DATE(:P_MES_REF), 'DD/MM/YYYY') AS data_ref
          FROM dual
      ),
      periodos AS (
          SELECT 
              TRUNC(data_ref, 'MM') AS inicio_mes_atual,
              LAST_DAY(data_ref) AS fim_mes_atual,
              TRUNC(ADD_MONTHS(data_ref, -1), 'MM') AS inicio_mes_anterior,
              LAST_DAY(ADD_MONTHS(data_ref, -1)) AS fim_mes_anterior
          FROM datas
      ),
      dados_atual AS (
          SELECT
              'ATUAL' AS a,
              TO_CHAR(NVL(dhbaixa,dtvenc), 'dd') AS dia,
              SUM(CASE WHEN dhbaixa IS NULL AND provisao = 'N' THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_N,
              SUM(CASE WHEN dhbaixa IS NULL AND provisao = 'S' THEN vlrdesdob ELSE vlrbaixa END) AS vlrdesdob_prov_S
          FROM tgffin, periodos
          WHERE recdesp = -1
          and provisao = 'S'
          AND (
            ( dhbaixa is not null and dtvenc < trunc(sysdate) and :P_TIT_ABERTOS =  'N' ) or ( :P_TIT_ABERTOS =  'S'  and dtvenc >= trunc(sysdate) )
          )
          AND NVL(dhbaixa, dtvenc) BETWEEN periodos.inicio_mes_atual AND periodos.fim_mes_atual
          GROUP BY TO_CHAR(NVL(dhbaixa,dtvenc), 'dd')
      ),
      dados_anterior AS (
          SELECT
              'ANTERIOR' AS a,
              TO_CHAR(NVL(dhbaixa,dtvenc), 'dd') AS dia,
              NULL AS vlrdesdob_prov_N,
              SUM(vlrdesdob) AS vlrdesdob_prov_S
          FROM tgffin, periodos
          WHERE recdesp = -1
            AND provisao = 'N'
            AND dtvenc BETWEEN periodos.inicio_mes_anterior AND periodos.fim_mes_anterior
            AND ((dhbaixa is null and :P_CHECK_BAIXA =  'S') OR (dhbaixa is not null and :P_CHECK_BAIXA =  'N'))
          GROUP BY TO_CHAR(NVL(dhbaixa,dtvenc), 'dd')

      )
      SELECT
          dia,
          SUM(CASE WHEN a = 'ATUAL' THEN vlrdesdob_prov_S END) AS vlr_prov_S_ATUAL,
          SUM(CASE WHEN a = 'ANTERIOR' THEN vlrdesdob_prov_S END) AS vlr_prov_S_ANT
      FROM (
          SELECT * FROM dados_atual
          UNION ALL
          SELECT * FROM dados_anterior
      )
      
      GROUP BY dia
      ORDER BY dia
    
    </snk:query>

    <snk:query var="fluxo_caixa">

        WITH datas AS (
          SELECT 
            TO_DATE(FUNC_OBTER_DATE(:P_MES_REF), 'DD/MM/YYYY') AS data_ref
          FROM dual
      ),
      periodos AS (
          SELECT 
              TRUNC(data_ref, 'MM') AS inicio_mes,
              LAST_DAY(data_ref) AS fim_mes
          FROM datas
      ),
      dados_agregados AS (
          SELECT
          TO_CHAR(NVL(dhbaixa,dtvenc), 'DD') AS dia,
              SUM(CASE WHEN recdesp = 1 THEN NVL(vlrbaixa, vlrdesdob) ELSE 0 END) AS vlr_receita,
              SUM(CASE WHEN recdesp = -1 THEN NVL(vlrbaixa, vlrdesdob) ELSE 0 END) AS vlr_despesa
          FROM tgffin, periodos
          WHERE NVL(dhbaixa, dtvenc) BETWEEN periodos.inicio_mes AND periodos.fim_mes
          AND (
            ( dhbaixa is not null and provisao = 'N' and dtvenc < trunc(sysdate) and :P_TIT_ABERTOS =  'N' ) or ( :P_TIT_ABERTOS =  'S'  and dtvenc >= trunc(sysdate) )
          )           
          GROUP BY TO_CHAR(NVL(dhbaixa,dtvenc), 'DD')
      )
      SELECT
          dia,
          SUM(vlr_receita) AS vlr_receita,
          SUM(vlr_despesa) AS vlr_despesa,
          SUM(SUM(vlr_receita) - SUM(vlr_despesa)) 
              OVER (ORDER BY TO_NUMBER(dia) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
              AS saldo_acumulado,
          (SUM(vlr_receita) * 100) / NULLIF(SUM(vlr_despesa), 0) AS perc
      FROM dados_agregados
      
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
      saldoAcumulado: [], // Valores de Saldo Acumulado
      perc: [] // Percentual de Receita em relação à Despesa
    };

    <c:forEach var="row" items="${fluxo_caixa.rows}">
      fluxoData.labels.push("${row.dia}");
      fluxoData.vlrReceita.push(${row.vlr_receita});
      fluxoData.vlrDespesa.push(${row.vlr_despesa});
      fluxoData.saldoAcumulado.push(${row.saldo_acumulado});
      fluxoData.perc.push(${row.perc}); // Adiciona o campo PERC
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
      let perc = fluxoData.perc.slice(0, dayCount);

      fluxoChart.data.labels = labels;
      fluxoChart.data.datasets[0].data = vlrReceita; // Receita
      fluxoChart.data.datasets[1].data = vlrDespesa; // Despesa
      fluxoChart.data.datasets[2].data = saldoAcumulado; // Saldo Acumulado
      fluxoChart.data.datasets[3].data = perc; // % Rec. / Desp.
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
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const clickedElement = elements[0]; // Elemento clicado
                const datasetIndex = clickedElement.datasetIndex; // Índice do dataset clicado
                const clickedElementIndex = clickedElement.index; // Índice do rótulo clicado

                const dia = receitaData.labels[clickedElementIndex]; // Obtém o dia clicado
                const mes = obterMesDaQuery(); // Obtém o mês da query mes_ref
                const ano = obterAnoDaQuery(); // Obtém o ano da query mes_ref

                // Determina o tipo de provisão com base no dataset clicado
                let provisao = '';
                let recdesp = 1;
                let movimento = '';
                if (datasetIndex === 0) {
                    provisao = 1; // Dataset "ATUAL (Provisão N)"
                    movimento = 21;
                } else if (datasetIndex === 1) {
                    provisao = 2; // Dataset "ATUAL (Provisão S)"
                    movimento = 21;
                } else if (datasetIndex === 2) {
                    provisao = 3; // Dataset "ANTERIOR (Provisão N)"
                    movimento = 22;
                }

                // Chama a função com os parâmetros
                abrir_det(dia, mes, ano, provisao,recdesp,movimento);
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
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const clickedElement = elements[0]; // Elemento clicado
                const datasetIndex = clickedElement.datasetIndex; // Índice do dataset clicado
                const clickedElementIndex = clickedElement.index; // Índice do rótulo clicado

                const dia = receitaData.labels[clickedElementIndex]; // Obtém o dia clicado
                const mes = obterMesDaQuery(); // Obtém o mês da query mes_ref
                const ano = obterAnoDaQuery(); // Obtém o ano da query mes_ref

                // Determina o tipo de provisão com base no dataset clicado
                let provisao = '';
                let recdesp = -1;
                let movimento = '';
                if (datasetIndex === 0) {
                    provisao = 1; // Dataset "ATUAL (Provisão N)"
                    movimento = 21;
                } else if (datasetIndex === 1) {
                    provisao = 2; // Dataset "ANTERIOR (Provisão N)"
                    movimento = 22;
                }

                // Chama a função com os parâmetros
                abrir_det(dia, mes, ano, provisao,recdesp,movimento);
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
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const clickedElement = elements[0]; // Elemento clicado
                const datasetIndex = clickedElement.datasetIndex; // Índice do dataset clicado
                const clickedElementIndex = clickedElement.index; // Índice do rótulo clicado

                const dia = receitaData.labels[clickedElementIndex]; // Obtém o dia clicado
                const mes = obterMesDaQuery(); // Obtém o mês da query mes_ref
                const ano = obterAnoDaQuery(); // Obtém o ano da query mes_ref

                // Determina o tipo de provisão com base no dataset clicado
                let provisao = '';
                let recdesp = -1;
                let movimento = '';
                if (datasetIndex === 0) {
                    provisao = 1; // Dataset "ATUAL (Provisão S)"
                    movimento = 21;
                } else if (datasetIndex === 1) {
                    provisao = 2; // Dataset "ANTERIOR (Provisão S)"
                    movimento = 22;
                }

                // Chama a função com os parâmetros
                abrir_det(dia, mes, ano, provisao,recdesp,movimento);
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
          },
          {
            label: '% Rec. / Desp.',
            data: fluxoData.perc,
            borderColor: 'rgba(255, 206, 86, 1)', // Amarelo
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
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const clickedElement = elements[0]; // Elemento clicado
                const datasetIndex = clickedElement.datasetIndex; // Índice do dataset clicado
                const clickedElementIndex = clickedElement.index; // Índice do rótulo clicado

                const dia = receitaData.labels[clickedElementIndex]; // Obtém o dia clicado
                const mes = obterMesDaQuery(); // Obtém o mês da query mes_ref
                const ano = obterAnoDaQuery(); // Obtém o ano da query mes_ref

                // Determina o tipo de provisão com base no dataset clicado
                let provisao = '';
                let recdesp = '';                
                let movimento = 21;
                if (datasetIndex === 0) {
                    recdesp = 1; // Dataset "Receita"
                    
                } else if (datasetIndex === 1) {
                    recdesp = -1; // Dataset "Despesa"
                    
                }

                // Chama a função com os parâmetros
                abrir_det(dia, mes, ano, provisao,recdesp,movimento);
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

    // Função para abrir o novo nível
    function abrir_det(dia, mes, ano,provisao,recdesp,movimento) {
        var params = {
            'A_DIA': parseInt(dia),
            'A_MES': parseInt(mes),
            'A_ANO': parseInt(ano),
            'A_PROVISAO': parseInt(provisao),
            'A_RECDESP': parseInt(recdesp),
            'A_MOVIMENTO': parseInt(movimento)
        };
        var level = 'lvl_e596g4';
        openLevel(level, params);
    }

    function abrir_det1(dia, mes, ano,provisao,recdesp,movimento) {
        var params = {
            'A_DIA': parseInt(dia),
            'A_MES': parseInt(mes),
            'A_ANO': parseInt(ano),
            'A_PROVISAO': parseInt(provisao),
            'A_RECDESP': parseInt(recdesp),
            'A_MOVIMENTO': parseInt(movimento)
        };
        var level = 'lvl_f1kjxf';
        openLevel(level, params);
    }    

    // Funções para obter o mês e o ano da query mes_ref
    function obterMesDaQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        const mesRef = urlParams.get('mes_ref');
        return mesRef ? mesRef.split('/')[0] : new Date().getMonth() + 1; // Retorna o mês atual se não houver query
    }


    function obterAnoDaQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        const mesRef = urlParams.get('mes_ref');
        return mesRef ? mesRef.split('/')[1] : new Date().getFullYear(); // Retorna o ano atual se não houver query
    }    

  </script>
</body>
</html>