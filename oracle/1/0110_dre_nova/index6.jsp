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
    <style>
        /* Reset e configurações base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding-top: 50px !important;
            min-height: 100vh;
        }

        /* Header fixo melhorado */
        .fixed-header {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 60px;
            background: linear-gradient(135deg, #130455, #0f0340);
            box-shadow: 0 4px 20px rgba(19, 4, 85, 0.3);
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
            width: 45px;
            height: auto;
            filter: brightness(0) invert(1);
            transition: transform 0.3s ease;
        }
        
        .header-logo:hover img {
            transform: scale(1.1);
        }
        
        .header-title {
            color: white;
            font-size: 1.8rem;
            font-weight: 600;
            margin: 0;
            text-align: center;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        /* Container principal */
        .container {
            display: flex;
            gap: 30px;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Painéis melhorados */
        .panel {
            flex: 1;
            background: #ffffff;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .panel:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }
        
        /* Títulos dos painéis */
        .title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            border-bottom: 3px solid #3498db;
            padding-bottom: 12px;
            text-align: center;
            position: relative;
        }
        
        .title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #3498db, #2980b9);
            border-radius: 2px;
        }
        
        /* Resumo destacado */
        .resumo {
            background: linear-gradient(135deg, #ecf0f1, #bdc3c7);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 25px;
            font-size: 1rem;
            border-left: 4px solid #3498db;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .resumo strong {
            color: #2c3e50;
            font-weight: 600;
        }
        
        /* Tabela DRE melhorada */
        .dre {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 0.85rem;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .dre th {
            text-align: left;
            background: linear-gradient(135deg, #34495e, #2c3e50);
            color: white;
            padding: 10px 8px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.5px;
        }
        
        .dre th:first-child {
            width: 40px;
            text-align: center;
        }
        
        .dre th:nth-child(2) {
            width: 45%;
        }
        
        .dre th:nth-child(3) {
            width: 25%;
            text-align: right;
        }
        
        .dre th:last-child {
            width: 20%;
            text-align: center;
        }
        
        .dre td {
            padding: 6px 8px;
            border-bottom: 1px solid #ecf0f1;
            transition: background-color 0.2s ease;
        }
        
        .dre tr:hover td {
            background-color: #f8f9fa;
        }
        
        .dre tr:last-child td {
            border-bottom: none;
        }
        
        /* Destaque para linhas importantes */
        .dre tr:nth-child(1) td {
            background: linear-gradient(135deg, #e8f5e8, #d4edda);
            font-weight: 600;
            color: #155724;
        }
        
        .dre tr:nth-child(3) td {
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            font-weight: 600;
            color: #0d47a1;
        }
        
        .dre tr:nth-child(5) td {
            background: linear-gradient(135deg, #fff3e0, #ffe0b2);
            font-weight: 600;
            color: #e65100;
        }
        
        .dre tr:nth-child(8) td {
            background: linear-gradient(135deg, #f3e5f5, #e1bee7);
            font-weight: 600;
            color: #4a148c;
        }
        
        .dre tr:nth-child(10) td {
            background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
            font-weight: 600;
            color: #1b5e20;
        }
        
        .dre tr:nth-child(13) td {
            background: linear-gradient(135deg, #fff8e1, #fff9c4);
            font-weight: 600;
            color: #f57f17;
        }
        
        .dre tr:nth-child(16) td {
            background: linear-gradient(135deg, #e0f2f1, #b2dfdb);
            font-weight: 600;
            color: #004d40;
        }
        
        /* Cores para valores negativos e positivos */
        .dre .negativo {
            color: #e74c3c;
            font-weight: 600;
        }
        
        .dre .positivo {
            color: #27ae60;
            font-weight: 600;
        }
        
        /* Coluna de valores com alinhamento */
        .dre td:nth-child(3) {
            text-align: right;
            font-family: 'Courier New', monospace;
            font-weight: 600;
        }
        
        /* Coluna de AV com estilo melhorado */
        .av {
            font-size: 0.75rem;
            color: #7f8c8d;
            text-align: center;
            font-weight: 500;
            background: #f8f9fa;
            border-radius: 4px;
            padding: 2px 6px;
        }
        
        /* Responsividade */
        @media (max-width: 1200px) {
            .container {
                flex-direction: column;
                gap: 20px;
            }
            
            .panel {
                padding: 20px;
            }
        }
        
        @media (max-width: 768px) {
            .header-title {
                font-size: 1.4rem;
            }
            
            .dre {
                font-size: 0.85rem;
            }
            
            .dre th,
            .dre td {
                padding: 8px 6px;
            }
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
                     <tr><td>${row.COD}</td>
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
                     <tr><td>${row.COD}</td>
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

    <script></script>
    
</body>
</html>
