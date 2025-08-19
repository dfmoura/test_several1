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
    WHERE DTNEG BETWEEN 
        CASE 
            WHEN :P_PERIODO1.INI IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.INI)
            ELSE :P_PERIODO1.INI
        END 
        AND 
        CASE 
            WHEN :P_PERIODO1.FIN IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.FIN)
            ELSE :P_PERIODO1.FIN
        END
        AND TIPMOV IN ('V', 'D') 
        AND ATIVO_TOP = 'S' 
        AND AD_COMPOE_FAT = 'S'
        AND CODEMP IN :P_EMPRESA
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
    WHERE DTNEG BETWEEN 
        CASE 
            WHEN :P_PERIODO1.INI IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.INI)
            ELSE :P_PERIODO1.INI
        END 
        AND 
        CASE 
            WHEN :P_PERIODO1.FIN IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.FIN)
            ELSE :P_PERIODO1.FIN
        END
        AND TIPMOV IN ('V', 'D') 
        AND ATIVO_TOP = 'S' 
        AND AD_COMPOE_FAT = 'S'
        AND CODEMP IN :P_EMPRESA
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
    WHERE DTNEG BETWEEN 
        CASE 
            WHEN :P_PERIODO1.INI IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.INI)
            ELSE :P_PERIODO1.INI
        END 
        AND 
        CASE 
            WHEN :P_PERIODO1.FIN IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.FIN)
            ELSE :P_PERIODO1.FIN
        END
        AND TIPMOV IN ('V', 'D') 
        AND ATIVO_TOP = 'S' 
        AND AD_COMPOE_FAT = 'S'
        AND CODEMP IN :P_EMPRESA
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
        AND FIN.dhbaixa BETWEEN 
            CASE 
                WHEN :P_PERIODO1.INI IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.INI)
                ELSE :P_PERIODO1.INI
            END 
            AND 
            CASE 
                WHEN :P_PERIODO1.FIN IS NULL THEN DATEADD(YEAR, -1, :P_PERIODO.FIN)
                ELSE :P_PERIODO1.FIN
            END
        AND FIN.codnat LIKE '3%'
        AND FIN.CODEMP IN :P_EMPRESA
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
ORDER BY COD;