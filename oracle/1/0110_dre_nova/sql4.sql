WITH BaseRentabilidade AS (
                -- Consulta única para obter todos os dados necessários da view
                SELECT 
                    SUM(
                        VLRNOTA -(CASE WHEN VLRUNIT < ULT_PRE_UN THEN (ULT_PRE_UN- VLRUNIT)*QTDNEG ELSE 0 END)       
                    ) AS ReceitaBruta,
                    SUM(
                        (VLRDEV)+
                        (VLRIPI + VLRICMS + VLRPIS + VLRCOFINS)
                    ) AS Deducoes,
                    SUM(CUSSEMICM_TOT) AS CMV
                FROM vw_rentabilidade_aco
                WHERE DTNEG BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    AND TIPMOV IN ('V', 'D') 
                    AND ATIVO_TOP = 'S'
                    AND AD_COMPOE_FAT = 'S'
                    AND CODEMP IN (:P_EMPRESA)
            ),
            
            ReceitaBruta AS (
                SELECT 
                    1 AS COD,
                    '(+) Receita Bruta' AS Conta,
                    ReceitaBruta AS Valor
                FROM BaseRentabilidade
            ),
            
            Deducoes AS (
                SELECT 
                    2 AS COD,
                    '(-) Deduções' AS Conta,
                    Deducoes AS Valor
                FROM BaseRentabilidade
            ),
            
            ReceitaLiquida AS (
                SELECT 
                    3 AS COD,
                    '(+) Receita Líquida' AS Conta,
                    ReceitaBruta + Deducoes AS Valor
                FROM BaseRentabilidade
            ),
            
            CustoMercadoriaVendida AS (
                SELECT 
                    4 AS COD,
                    '(-) CMV' AS Conta, 
                    CMV * -1 AS Valor 
                FROM BaseRentabilidade
            ),
            
            LucroBruto AS (
                SELECT 
                    5 AS COD,
                    '(=) Lucro Bruto' AS Conta,
                    (ReceitaBruta + Deducoes) + (CMV * -1) AS Valor
                FROM BaseRentabilidade
            ),
            
            DespesasAdministrativas AS (
                SELECT 
                    6 AS COD,
                    '(-) Despesas Administrativas' AS Conta,
                    SUM(ISNULL(ROUND(VLRBAIXA, 2), 0)) * -1 AS Valor
                FROM TGFFIN FIN
                WHERE FIN.RECDESP = -1 
                    AND FIN.DHBAIXA IS NOT NULL
                    AND FIN.dhbaixa BETWEEN :P_PERIODO.INI AND :P_PERIODO.FIN
                    AND FIN.codnat LIKE '3%'
                    AND FIN.CODEMP IN (:P_EMPRESA)
                    AND EXISTS (SELECT 1 FROM TGFNAT NAT WHERE NAT.CODNAT = FIN.CODNAT AND NAT.ATIVA = 'S')
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
                    (SELECT SUM(Valor) FROM LucroBruto) + (SELECT SUM(Valor) FROM DespesasAdministrativas) + 0 AS Valor
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
                    (SELECT SUM(Valor) FROM LucroAntesJuros) + 0 AS Valor
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
                    (SELECT SUM(Valor) FROM LucroLiquido) + 0 + 0 AS Valor
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
                    (SELECT SUM(Valor) FROM ResultadoFinal) + 0 + 0 AS Valor
            )
            
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
            ORDER BY COD;