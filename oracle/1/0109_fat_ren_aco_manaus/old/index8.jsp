<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tela</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
        /* Fixed header styles */
        .fixed-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 35px;
          background: linear-gradient(135deg, #130455, #0f0340);
          box-shadow: 0 2px 8px rgba(19, 4, 85, 0.2);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
        }
        
        .header-logo {
          position: absolute;
          left: 20px;
          display: flex;
          align-items: center;
        }
        
        .header-logo img {
          width: 40px;
          height: auto;
          filter: brightness(0) invert(1);
        }
        
        .header-title {
          color: white;
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0;
          text-align: center;
        }
        
        /* Adjust body padding to account for fixed header */
        body {
          padding-top: 50px !important;
        }

        .container {
        display: flex;
        gap: 20px;
    }
    .panel {
        flex: 1;
        background: #fff;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .title {
        font-size: 1.1rem;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
        border-bottom: 2px solid #eee;
        padding-bottom: 5px;
    }
    .resumo {
        background: #f9f9f9;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 15px;
        font-size: 0.95rem;
    }
    .dre {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }
    .dre th {
        text-align: left;
        background-color: #f0f0f0;
        padding: 6px;
    }
    .dre td {
        padding: 6px;
        border-bottom: 1px solid #eee;
    }
    .dre .negativo {
        color: #c0392b;
    }
    .dre .positivo {
        color: #27ae60;
    }
    .dre .av {
        font-size: 0.85rem;
        color: #666;
        text-align: right;
    }

        /* Estilos para destacar linhas importantes do DRE */
        .dre .destaque-importante {
            background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
            border-left: 4px solid #130455;
            font-weight: 600;
            position: relative;
        }
        
        .dre .destaque-importante td {
            padding: 8px 6px;
        }
        
        .dre .destaque-importante td:first-child {
            font-weight: bold;
            color: #130455;
        }
        
        .dre .destaque-importante:hover {
            background: linear-gradient(135deg, #e8f2ff 0%, #d1e7ff 100%);
            box-shadow: 0 2px 4px rgba(19, 4, 85, 0.1);
        }
        
        /* Estilo especial para Receita Bruta (primeira linha) */
        .dre .destaque-receita {
            background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
            border-left: 4px solid #27ae60;
        }
        
        .dre .destaque-receita:hover {
            background: linear-gradient(135deg, #e6f3ff 0%, #d4edff 100%);
        }
        
        /* Estilo especial para Resultado Final (última linha) */
        .dre .destaque-resultado-final {
            background: linear-gradient(135deg, #fff8f0 0%, #ffe6cc 100%);
            border-left: 4px solid #f39c12;
        }
        
        .dre .destaque-resultado-final:hover {
            background: linear-gradient(135deg, #ffe6cc 0%, #ffd699 100%);
        }

        /* Estilos para os botões do header */
        .header-actions {
            position: absolute;
            right: 20%;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .header-btn {
            background-color: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            width: 28px;
            height: 28px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            backdrop-filter: blur(4px);
            min-width: 28px;
            min-height: 28px;
            max-width: 28px;
            max-height: 28px;
            padding: 0;
            line-height: 1;
            text-align: center;
        }
        
        .header-btn:hover {
            background-color: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .header-btn i {
            font-size: 12px;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
        }

        /* Garantir que os botões do header sejam sempre do tamanho correto */
        button.header-btn {
            border-radius: 4px !important;
            padding: 0 !important;
            min-width: 28px !important;
            min-height: 28px !important;
            max-width: 28px !important;
            max-height: 28px !important;
            width: 28px !important;
            height: 28px !important;
            font-size: 12px !important;
            line-height: 1 !important;
            text-align: center !important;
        }

    </style>
<snk:load/>
</head>

    <body class="bg-light">
        <!-- Fixed Header -->
        <div class="fixed-header">
          <div class="header-logo">
            <a href="https://neuon.com.br/" target="_blank" rel="noopener noreferrer">
              <img src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg" alt="Neuon Logo">
            </a>
          </div>
          <h1 class="header-title">DRE Gerencial</h1>
          <div class="header-actions">
            <button id="visualizarGraficoBtn" class="header-btn" title="Visualizar Gráfico" onclick="abrir_fat_chart()">
              <i class="fas fa-chart-bar"></i>
            </button>
            <button id="visualizarTabelaBtn" class="header-btn" title="Visualizar Tabela" onclick="abrir_fat()">
              <i class="fas fa-table"></i>
            </button>
          </div>
        </div>


        <snk:query var="dre_atual">  
            -- Query de Demonstração de Resultados (DRE) otimizada para SQL Server
            -- Calcula Receita Bruta, Deduções, Receita Líquida, CMV, Lucro Bruto, Despesas Administrativas, Despesas Comerciais, Lucro Antes dos Juros, Despesas Financeiras, Lucro Líquido, Receita não Operacional, Derivativos, Resultado Final, Investimento, Depreciações e Resultado Final Considerando Depreciação
            WITH ReceitaBruta AS (
                SELECT 
                    1 AS COD,
                    '(+) Receita Bruta' AS Conta,
                    SUM(
                        CASE 
                            WHEN TIPMOV = 'D' THEN (TOTALLIQ - VLRIPI - VLRSUBST + VLRDESC) * -1 
                            ELSE (TOTALLIQ - VLRIPI - VLRSUBST + VLRDESC) 
                        END
                    ) AS Valor
                FROM vw_rentabilidade_aco
                WHERE DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    AND TIPMOV IN ('V', 'D') 
                    AND ATIVO_TOP = 'S' 
                    AND AD_COMPOE_FAT = 'S'
                    AND CODEMP IN (:P_EMPRESA)
            ),
            
            Deducoes AS (
                SELECT 
                    2 AS COD,
                    '(-) Deduções' AS Conta,
                    SUM(
                        CASE 
                            WHEN TIPMOV = 'D' THEN (VLRIPI + VLRSUBST - VLRDESC) * -1 
                            ELSE (VLRIPI + VLRSUBST - VLRDESC) 
                        END
                    ) AS Valor
                FROM vw_rentabilidade_aco
                WHERE DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    AND TIPMOV IN ('V', 'D') 
                    AND ATIVO_TOP = 'S' 
                    AND AD_COMPOE_FAT = 'S'
                    AND CODEMP IN (:P_EMPRESA)
            ),
            
            ReceitaLiquida AS (
                SELECT 
                    3 AS COD,
                    '(+) Receita Líquida' AS Conta,
                    (SELECT SUM(Valor) FROM ReceitaBruta) + (SELECT SUM(Valor) FROM Deducoes) AS Valor
            ),
            
            CustoMercadoriaVendida AS (
                SELECT 
                    4 AS COD,
                    '(-) CMV' AS Conta, 
                    SUM(CUSREP_TOT) * -1 AS Valor 
                FROM vw_rentabilidade_aco 
                WHERE DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    AND TIPMOV IN ('V', 'D') 
                    AND ATIVO_TOP = 'S' 
                    AND AD_COMPOE_FAT = 'S'
                    AND CODEMP IN (:P_EMPRESA)
            ),
            
            LucroBruto AS (
                SELECT 
                    5 AS COD,
                    '(=) Lucro Bruto' AS Conta,
                    (SELECT SUM(Valor) FROM ReceitaLiquida) + (SELECT SUM(Valor) FROM CustoMercadoriaVendida) AS Valor
            ),
            
            DespesasAdministrativas AS (
                SELECT 
                    6 AS COD,
                    '(-) Despesas Administrativas' AS Conta,
                    SUM(ISNULL(ROUND(VLRBAIXA, 2), 0)) * -1 AS Valor
                FROM TGFFIN FIN
                INNER JOIN TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
                INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
                INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
                WHERE FIN.RECDESP = -1 
                    AND NAT.ATIVA = 'S'
                    AND FIN.DHBAIXA IS NOT NULL
                    AND FIN.dhbaixa BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    AND FIN.codnat LIKE '3%'
                    AND FIN.CODEMP IN (:P_EMPRESA)
            ),
            
            DespesasComerciais AS (
                SELECT 
                    7 AS COD,
                    '(-) Despesas Comerciais' AS Conta,
                    0 AS Valor
            ),
            
            LucroAntesJuros AS (
                SELECT 
                    8 AS COD,
                    '(=) Lucro Antes dos Juros' AS Conta,
                    (SELECT SUM(Valor) FROM LucroBruto) + (SELECT SUM(Valor) FROM DespesasAdministrativas) + (SELECT SUM(Valor) FROM DespesasComerciais) AS Valor
            ),
            
            DespesasFinanceiras AS (
                SELECT 
                    9 AS COD,
                    '(-) Despesas Financeiras' AS Conta,
                    0 AS Valor
            ),
            
            LucroLiquido AS (
                SELECT 
                    10 AS COD,
                    '(=) Lucro Líquido' AS Conta,
                    (SELECT SUM(Valor) FROM LucroAntesJuros) + (SELECT SUM(Valor) FROM DespesasFinanceiras) AS Valor
            ),
            
            ReceitaNaoOperacional AS (
                SELECT 
                    11 AS COD,
                    '(+) Receita não Operacional' AS Conta,
                    0 AS Valor
            ),
            
            Derivativos AS (
                SELECT 
                    12 AS COD,
                    '(+) Derivativos' AS Conta,
                    0 AS Valor
            ),
            
            ResultadoFinal AS (
                SELECT 
                    13 AS COD,
                    '(=) Resultado Final' AS Conta,
                    (SELECT SUM(Valor) FROM LucroLiquido) + (SELECT SUM(Valor) FROM ReceitaNaoOperacional) + (SELECT SUM(Valor) FROM Derivativos) AS Valor
            ),
            
            Investimento AS (
                SELECT 
                    14 AS COD,
                    '(-) Investimento' AS Conta,
                    0 AS Valor
            ),
            
            Depreciacoes AS (
                SELECT 
                    15 AS COD,
                    '(-) Depreciações' AS Conta,
                    0 AS Valor
            ),
            
            ResultadoFinalConsiderandoDepreciacao AS (
                SELECT 
                    16 AS COD,
                    '(=) Resultado Final Considerando Depreciação' AS Conta,
                    (SELECT SUM(Valor) FROM ResultadoFinal) + (SELECT SUM(Valor) FROM Investimento) + (SELECT SUM(Valor) FROM Depreciacoes) AS Valor
            )
            
            -- Resultado final com ordenação por código
            SELECT COD, Conta, Valor FROM ReceitaBruta
            UNION ALL
            SELECT COD, Conta, Valor FROM Deducoes
            UNION ALL
            SELECT COD, Conta, Valor FROM ReceitaLiquida
            UNION ALL
            SELECT COD, Conta, Valor FROM CustoMercadoriaVendida
            UNION ALL
            SELECT COD, Conta, Valor FROM LucroBruto
            UNION ALL
            SELECT COD, Conta, Valor FROM DespesasAdministrativas
            UNION ALL
            SELECT COD, Conta, Valor FROM DespesasComerciais
            UNION ALL
            SELECT COD, Conta, Valor FROM LucroAntesJuros
            UNION ALL
            SELECT COD, Conta, Valor FROM DespesasFinanceiras
            UNION ALL
            SELECT COD, Conta, Valor FROM LucroLiquido
            UNION ALL
            SELECT COD, Conta, Valor FROM ReceitaNaoOperacional
            UNION ALL
            SELECT COD, Conta, Valor FROM Derivativos
            UNION ALL
            SELECT COD, Conta, Valor FROM ResultadoFinal
            UNION ALL
            SELECT COD, Conta, Valor FROM Investimento
            UNION ALL
            SELECT COD, Conta, Valor FROM Depreciacoes
            UNION ALL
            SELECT COD, Conta, Valor FROM ResultadoFinalConsiderandoDepreciacao
            ORDER BY COD
        </snk:query> 




        <snk:query var="dre_coparativo">
            -- Query de Demonstração de Resultados (DRE) otimizada para SQL Server
            -- Calcula Receita Bruta, Deduções, Receita Líquida, CMV, Lucro Bruto, Despesas Administrativas, Despesas Comerciais, Lucro Antes dos Juros, Despesas Financeiras, Lucro Líquido, Receita não Operacional, Derivativos, Resultado Final, Investimento, Depreciações e Resultado Final Considerando Depreciação
            WITH ReceitaBruta AS (
                SELECT 
                    1 AS COD,
                    '(+) Receita Bruta' AS Conta,
                    SUM(
                        CASE 
                            WHEN TIPMOV = 'D' THEN (TOTALLIQ - VLRIPI - VLRSUBST + VLRDESC) * -1 
                            ELSE (TOTALLIQ - VLRIPI - VLRSUBST + VLRDESC) 
                        END
                    ) AS Valor
                FROM vw_rentabilidade_aco
                WHERE DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
                    AND TIPMOV IN ('V', 'D') 
                    AND ATIVO_TOP = 'S' 
                    AND AD_COMPOE_FAT = 'S'
                    AND CODEMP IN (:P_EMPRESA)
            ),
            
            Deducoes AS (
                SELECT 
                    2 AS COD,
                    '(-) Deduções' AS Conta,
                    SUM(
                        CASE 
                            WHEN TIPMOV = 'D' THEN (VLRIPI + VLRSUBST - VLRDESC) * -1 
                            ELSE (VLRIPI + VLRSUBST - VLRDESC) 
                        END
                    ) AS Valor
                FROM vw_rentabilidade_aco
                WHERE DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
                    AND TIPMOV IN ('V', 'D') 
                    AND ATIVO_TOP = 'S' 
                    AND AD_COMPOE_FAT = 'S'
                    AND CODEMP IN (:P_EMPRESA)
            ),
            
            ReceitaLiquida AS (
                SELECT 
                    3 AS COD,
                    '(+) Receita Líquida' AS Conta,
                    (SELECT SUM(Valor) FROM ReceitaBruta) + (SELECT SUM(Valor) FROM Deducoes) AS Valor
            ),
            
            CustoMercadoriaVendida AS (
                SELECT 
                    4 AS COD,
                    '(-) CMV' AS Conta, 
                    SUM(CUSREP_TOT) * -1 AS Valor 
                FROM vw_rentabilidade_aco 
                WHERE DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
                    AND TIPMOV IN ('V', 'D') 
                    AND ATIVO_TOP = 'S' 
                    AND AD_COMPOE_FAT = 'S'
                    AND CODEMP IN (:P_EMPRESA)
            ),
            
            LucroBruto AS (
                SELECT 
                    5 AS COD,
                    '(=) Lucro Bruto' AS Conta,
                    (SELECT SUM(Valor) FROM ReceitaLiquida) + (SELECT SUM(Valor) FROM CustoMercadoriaVendida) AS Valor
            ),
            
            DespesasAdministrativas AS (
                SELECT 
                    6 AS COD,
                    '(-) Despesas Administrativas' AS Conta,
                    SUM(ISNULL(ROUND(VLRBAIXA, 2), 0)) * -1 AS Valor
                FROM TGFFIN FIN
                INNER JOIN TSIEMP EMP ON FIN.CODEMP = EMP.CODEMP
                INNER JOIN TGFNAT NAT ON FIN.CODNAT = NAT.CODNAT
                INNER JOIN TSICUS CUS ON FIN.CODCENCUS = CUS.CODCENCUS
                WHERE FIN.RECDESP = -1 
                    AND NAT.ATIVA = 'S'
                    AND FIN.DHBAIXA IS NOT NULL
                    AND FIN.dhbaixa BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
                    AND FIN.codnat LIKE '3%'
                    AND FIN.CODEMP IN (:P_EMPRESA)
            ),
            
            DespesasComerciais AS (
                SELECT 
                    7 AS COD,
                    '(-) Despesas Comerciais' AS Conta,
                    0 AS Valor
            ),
            
            LucroAntesJuros AS (
                SELECT 
                    8 AS COD,
                    '(=) Lucro Antes dos Juros' AS Conta,
                    (SELECT SUM(Valor) FROM LucroBruto) + (SELECT SUM(Valor) FROM DespesasAdministrativas) + (SELECT SUM(Valor) FROM DespesasComerciais) AS Valor
            ),
            
            DespesasFinanceiras AS (
                SELECT 
                    9 AS COD,
                    '(-) Despesas Financeiras' AS Conta,
                    0 AS Valor
            ),
            
            LucroLiquido AS (
                SELECT 
                    10 AS COD,
                    '(=) Lucro Líquido' AS Conta,
                    (SELECT SUM(Valor) FROM LucroAntesJuros) + (SELECT SUM(Valor) FROM DespesasFinanceiras) AS Valor
            ),
            
            ReceitaNaoOperacional AS (
                SELECT 
                    11 AS COD,
                    '(+) Receita não Operacional' AS Conta,
                    0 AS Valor
            ),
            
            Derivativos AS (
                SELECT 
                    12 AS COD,
                    '(+) Derivativos' AS Conta,
                    0 AS Valor
            ),
            
            ResultadoFinal AS (
                SELECT 
                    13 AS COD,
                    '(=) Resultado Final' AS Conta,
                    (SELECT SUM(Valor) FROM LucroLiquido) + (SELECT SUM(Valor) FROM ReceitaNaoOperacional) + (SELECT SUM(Valor) FROM Derivativos) AS Valor
            ),
            
            Investimento AS (
                SELECT 
                    14 AS COD,
                    '(-) Investimento' AS Conta,
                    0 AS Valor
            ),
            
            Depreciacoes AS (
                SELECT 
                    15 AS COD,
                    '(-) Depreciações' AS Conta,
                    0 AS Valor
            ),
            
            ResultadoFinalConsiderandoDepreciacao AS (
                SELECT 
                    16 AS COD,
                    '(=) Resultado Final Considerando Depreciação' AS Conta,
                    (SELECT SUM(Valor) FROM ResultadoFinal) + (SELECT SUM(Valor) FROM Investimento) + (SELECT SUM(Valor) FROM Depreciacoes) AS Valor
            )
            
            -- Resultado final com ordenação por código
            SELECT COD, Conta, Valor FROM ReceitaBruta
            UNION ALL
            SELECT COD, Conta, Valor FROM Deducoes
            UNION ALL
            SELECT COD, Conta, Valor FROM ReceitaLiquida
            UNION ALL
            SELECT COD, Conta, Valor FROM CustoMercadoriaVendida
            UNION ALL
            SELECT COD, Conta, Valor FROM LucroBruto
            UNION ALL
            SELECT COD, Conta, Valor FROM DespesasAdministrativas
            UNION ALL
            SELECT COD, Conta, Valor FROM DespesasComerciais
            UNION ALL
            SELECT COD, Conta, Valor FROM LucroAntesJuros
            UNION ALL
            SELECT COD, Conta, Valor FROM DespesasFinanceiras
            UNION ALL
            SELECT COD, Conta, Valor FROM LucroLiquido
            UNION ALL
            SELECT COD, Conta, Valor FROM ReceitaNaoOperacional
            UNION ALL
            SELECT COD, Conta, Valor FROM Derivativos
            UNION ALL
            SELECT COD, Conta, Valor FROM ResultadoFinal
            UNION ALL
            SELECT COD, Conta, Valor FROM Investimento
            UNION ALL
            SELECT COD, Conta, Valor FROM Depreciacoes
            UNION ALL
            SELECT COD, Conta, Valor FROM ResultadoFinalConsiderandoDepreciacao
            ORDER BY COD  
        </snk:query>

        <snk:query var="ton_cus_atual">
            SELECT 
            SUM(TON)TON, SUM(CUSREP_TOT)/SUM(TON) CMV_TON
            FROM vw_rentabilidade_aco
            WHERE DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
            AND TIPMOV IN ('V', 'D') 
            AND ATIVO_TOP = 'S' 
            AND AD_COMPOE_FAT = 'S'
            AND CODEMP IN (:P_EMPRESA)
        </snk:query>


            
        <snk:query var="ton_cus_comparativo">
            SELECT 
            SUM(TON)TON, SUM(CUSREP_TOT)/SUM(TON) CMV_TON
            FROM vw_rentabilidade_aco
            WHERE DTNEG BETWEEN :P_PERIODO1.INI AND :P_PERIODO1.FIN
            AND TIPMOV IN ('V', 'D') 
            AND ATIVO_TOP = 'S' 
            AND AD_COMPOE_FAT = 'S'
            AND CODEMP IN (:P_EMPRESA)        
        </snk:query>
    
        <snk:query var="datas">
        SELECT 
        :P_PERIODO.INI AS DataInicio,
        :P_PERIODO.FIN AS DataFim,
        :P_PERIODO1.INI AS DataInicio_comparativo,
        :P_PERIODO1.FIN AS DataFim_comparativo;

        
        </snk:query>


        <div class="container">

            <!-- Lado Esquerdo -->
            <div class="panel">
                <c:forEach items="${datas.rows}" var="row">
                <div class="title">
                    Período Considerado de <fmt:formatDate value="${row.DataInicio}" pattern="dd/MM/yyyy"/> até <fmt:formatDate value="${row.DataFim}" pattern="dd/MM/yyyy"/>
                </div>
                </c:forEach>
                <div class="resumo">
                    <c:forEach items="${ton_cus_atual.rows}" var="row">
                     <strong>Ton:</strong> <fmt:formatNumber value="${row.TON}" pattern="#,##0.00"/> <br>
                     <strong>Cus/Ton Atual:</strong> R$ <fmt:formatNumber value="${row.CMV_TON}" pattern="#,##0.00"/>
                     </c:forEach>
                </div>
                <table class="dre">
                    <tr><th>#</th><th>Descrição</th><th>Valor</th><th class="av">AV (%)</th></tr>
                                         <c:forEach items="${dre_atual.rows}" var="row">
                     <tr class="<c:choose>
                        <c:when test="${row.COD == 1}">destaque-receita</c:when>
                        <c:when test="${row.COD == 5 || row.COD == 8 || row.COD == 10}">destaque-importante</c:when>
                        <c:when test="${row.COD == 13 || row.COD == 16}">destaque-importante</c:when>
                    </c:choose>">
                        <td>${row.COD}</td>
                         <td>${row.Conta}</td>
                         <td class="${row.VALOR < 0 ? 'negativo' : 'positivo'}"> <fmt:formatNumber value="${row.VALOR}" pattern="#,##0.00"/></td>
                         <td class="av">
                             <c:choose>
                                 <c:when test="${row.COD == 1}">100,00%</c:when>
                                 <c:otherwise>
                                     <fmt:formatNumber value="${(row.VALOR / dre_atual.rows[0].VALOR) * 100}" pattern="#,##0.00"/>%
                                 </c:otherwise>
                             </c:choose>
                         </td></tr>
                     </c:forEach>
                </table>
            </div>
        
            <!-- Lado Direito -->
            <div class="panel">
                <c:forEach items="${datas.rows}" var="row">
                <div class="title">
                    Período Considerado de <fmt:formatDate value="${row.DataInicio_comparativo}" pattern="dd/MM/yyyy"/> até <fmt:formatDate value="${row.DataFim_comparativo}" pattern="dd/MM/yyyy"/>
                </div>
                </c:forEach>
                <div class="resumo">
                    <c:forEach items="${ton_cus_comparativo.rows}" var="row">
                    <strong>Ton:</strong> <fmt:formatNumber value="${row.TON}" pattern="#,##0.00"/> <br>
                    <strong>Cus/Ton Comparativo:</strong> R$ <fmt:formatNumber value="${row.CMV_TON}" pattern="#,##0.00"/>
                    </c:forEach>
                </div>
                <table class="dre">
                    <tr><th>#</th><th>Descrição</th><th>Valor</th><th class="av">AV (%)</th></tr>
                                         <c:forEach items="${dre_coparativo.rows}" var="row">
                     <tr class="<c:choose>
                        <c:when test="${row.COD == 1}">destaque-receita</c:when>
                        <c:when test="${row.COD == 5 || row.COD == 8 || row.COD == 10}">destaque-importante</c:when>
                        <c:when test="${row.COD == 13 || row.COD == 16}">destaque-importante</c:when>
                    </c:choose>">
                        <td>${row.COD}</td>
                         <td>${row.Conta}</td>
                         <td class="${row.VALOR < 0 ? 'negativo' : 'positivo'}"> <fmt:formatNumber value="${row.VALOR}" pattern="#,##0.00"/></td>
                         <td class="av">
                             <c:choose>
                                 <c:when test="${row.COD == 1}">100,00%</c:when>
                                 <c:otherwise>
                                     <fmt:formatNumber value="${(row.VALOR / dre_coparativo.rows[0].VALOR) * 100}" pattern="#,##0.00"/>%
                                 </c:otherwise>
                             </c:choose>
                         </td></tr>
                     </c:forEach>
                </table>
            </div>
        
        </div>

    <script>

    function abrir_fat(){
        var params = '';
        var level = '01Q';
        openLevel(level, params);
    }


    function abrir_fat_chart(){
        var params = '';
        var level = '02Y';
        openLevel(level, params);
    }



    </script>
    
</body>
</html>
