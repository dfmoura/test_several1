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
    <title>Tela</title>
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
          padding-top: 85px !important;
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
            WITH PeriodoCalculado AS (
                SELECT 
                    CASE 
                        WHEN :P_PERIODO1.INI IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.INI)
                        ELSE :P_PERIODO1.INI
                    END AS DataInicio,
                    CASE 
                        WHEN :P_PERIODO1.FIN IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.FIN)
                        ELSE :P_PERIODO1.FIN
                    END AS DataFim
            )
            
            SELECT 
            SUM(TON)TON, SUM(CUSREP_TOT)/SUM(TON) CMV_TON
            FROM vw_rentabilidade_aco , PeriodoCalculado
            WHERE DTNEG BETWEEN PeriodoCalculado.DataInicio AND PeriodoCalculado.DataFim
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
        :P_PERIODO1.FIN AS DataFim_comparativo

        from dual
        </snk:query>



    <script></script>
    
</body>
</html>
