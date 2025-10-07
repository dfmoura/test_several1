-- Quadrante 1 - Títulos de Origem Vendas - Convertido para SQL Server
-- Consulta para obter valores de títulos de vendas (não renegociados e renegociados)
SELECT  D.CODPARC, 
        D.NOMEPARC,
        D.CNPJCPF,
        SUM(D.VLRDESDOB) AS VLRDESDOB
FROM        
(
    -- Pega os Títulos de Origem V não Renegociados
    SELECT AUX.CODPARC, 
            AUX.NOMEPARC,
            AUX.CNPJCPF AS CNPJCPF,        
            SUM(AUX.VLRDESDOB) AS VLRDESDOB
    FROM
    (
        SELECT    FIN.CODPARC,
                PAR.NOMEPARC, 
                PAR.CGC_CPF AS CNPJCPF,
                SUM(FIN.VLRDESDOB) AS VLRDESDOB
        
        FROM    TGFFIN FIN
        LEFT JOIN TGFMBC MBC ON MBC.NUBCO = FIN.NUBCO
        CROSS JOIN TGFTOP OPE
        CROSS JOIN TGFPAR PAR
        WHERE   FIN.CODTIPOPER = OPE.CODTIPOPER
        AND     FIN.DHTIPOPER = OPE.DHALTER
        AND     FIN.CODPARC = PAR.CODPARC
        AND     FIN.PROVISAO = 'N'
        --AND     (CASE WHEN FIN.NUBCO IS NULL THEN FIN.DHBAIXA ELSE MBC.DHCONCILIACAO END > :DTREFERENCIA OR FIN.DHBAIXA IS NULL OR MBC.DHCONCILIACAO IS NULL)
        --AND     FIN.DTNEG <= :DTREFERENCIA
        --AND     FIN.CODEMP IN :CODEMP
        --AND     (FIN.CODPARC = :CODPARC OR :CODPARC IS NULL)
        AND     FIN.RECDESP = 1
        AND     OPE.TIPMOV = 'V'
        --AND     FIN.CODTIPOPER NOT IN (1106)
        AND     OPE.ATUALFIN = 1
        AND     FIN.NURENEG IS NULL 
        AND     FIN.NUCOMPENS IS NULL -- CLAYTON EM 10/04/2024
        AND     FIN.NUDEV IS NULL -- CLAYTON EM 10/04/2024
        
        GROUP BY     FIN.CODPARC,
                    PAR.NOMEPARC,
                    PAR.RAZAOSOCIAL,
                    PAR.CGC_CPF
    ) AUX
    
    GROUP BY     AUX.CODPARC, 
                AUX.NOMEPARC,
                AUX.CNPJCPF
                    
    UNION ALL
    
    -- Pega os Títulos de Origem V Renegociados
    SELECT     AUX1.CODPARC, 
            AUX1.NOMEPARC,
            AUX1.CNPJCPF AS CNPJCPF,        
            SUM(AUX1.VLRDESDOB) AS VLRDESDOB
    FROM
    (
        SELECT    FIN.CODPARC,
                PAR.NOMEPARC, 
                PAR.CGC_CPF AS CNPJCPF,
                SUM(FIN.VLRDESDOB) AS VLRDESDOB
        
        FROM    TGFFIN FIN
        LEFT JOIN TGFMBC MBC ON MBC.NUBCO = FIN.NUBCO
        CROSS JOIN TGFTOP OPE
        CROSS JOIN TGFPAR PAR
        INNER JOIN TGFREN REN ON FIN.NUFIN = REN.NUFIN AND FIN.NURENEG = REN.NURENEG
        
        WHERE   FIN.CODTIPOPER = OPE.CODTIPOPER
        AND     FIN.DHTIPOPER = OPE.DHALTER
        AND     FIN.CODPARC = PAR.CODPARC
        AND     FIN.PROVISAO = 'N'
        --AND     (CASE WHEN FIN.NUBCO IS NULL THEN FIN.DHBAIXA ELSE MBC.DHCONCILIACAO END > :DTREFERENCIA OR FIN.DHBAIXA IS NULL)
        --AND     FIN.DTNEG <= :DTREFERENCIA
        --AND     FIN.CODEMP IN :CODEMP
        --AND     (FIN.CODPARC = :CODPARC OR :CODPARC IS NULL)
        AND     FIN.RECDESP = 0
        AND     OPE.TIPMOV = 'V'
        AND     OPE.ATUALFIN = 1
        --AND     REN.DHALTER > :DTREFERENCIA
        GROUP BY     FIN.CODPARC,
                    PAR.NOMEPARC,
                    PAR.RAZAOSOCIAL,
                    PAR.CGC_CPF
    ) AUX1
    
    GROUP BY
        AUX1.CODPARC, 
        AUX1.NOMEPARC,
        AUX1.CNPJCPF
        
) D

GROUP BY D.CODPARC,
        D.NOMEPARC,
        D.CNPJCPF

--ORDER BY 1
