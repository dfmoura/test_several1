
    SELECT  SUM(VLRBAIXA_CALC) AS VLTOTANT
    FROM
    (-- PROVISÃO DO QUE É RECEITAS E DESPESAS
    WITH BASE AS (
        SELECT
            FIN.NUFIN,
            FIN.DTVENC,
            TO_CHAR(FIN.DTVENC, 'YYYY') AS ANO,
            TO_CHAR(FIN.DTVENC, 'MM') AS MES,
            TO_CHAR(FIN.DTVENC, 'MM-DD') AS MES_ANO,
            FIN.DTNEG,
            FIN.ORIGEM,
            FIN.CODPARC,
            FIN.CODPROJ,
            FIN.VLRDESDOB,
            FIN.RECDESP,
            FIN.VLRBAIXA,
            FIN.CODNAT,
            FIN.PROVISAO,
            FIN.NUBCO,
            FIN.DHBAIXA,
            FIN.VLRDESDOB * FIN.RECDESP AS VLRDESDO,
            FIN.VLRBAIXA * FIN.RECDESP AS VLRBAIXA_CALC
        FROM TGFFIN FIN
        WHERE FIN.PROVISAO = 'N'
          AND FIN.DTVENC BETWEEN :P_BAIXA.INI AND :P_BAIXA.FIN
          AND FIN.RECDESP = 1
    ),
    CONTA_BAIXA AS (
        SELECT 
            F.NUFIN,
            C.CODCTABCOINT,
            C.DESCRICAO
        FROM TGFFIN F
        JOIN TGFMBC B ON F.NUBCO = B.NUBCO
        JOIN TSICTA C ON B.CODCTABCOINT = C.CODCTABCOINT
        WHERE C.CODCTABCOINT <> 0
    ),
    MULT_RECEITA_ANT AS (
        SELECT 
            FIN_SUB.PROVISAO,
            SUM(FIN_SUB.VLRBAIXA) AS SUM_VLRBAIXA
        FROM TGFFIN FIN_SUB
        JOIN TGFMBC B ON FIN_SUB.NUBCO = B.NUBCO
        JOIN TSICTA C ON B.CODCTABCOINT = C.CODCTABCOINT
        WHERE FIN_SUB.DTVENC BETWEEN '01/06/2024' AND '30/06/2024'
        GROUP BY FIN_SUB.PROVISAO
    )
    SELECT
        B.ANO,
        B.MES,
        B.MES_ANO,
        NAT.DESCRNAT,
        B.DTNEG,
        B.ORIGEM,
        B.NUFIN,
        B.CODPARC,
        PAR.NOMEPARC,
        B.CODPROJ,
        B.DTVENC,
        B.VLRDESDO,
        B.RECDESP,
        B.VLRBAIXA_CALC,
        B.CODNAT,
        B.PROVISAO,
        NVL(CB.CODCTABCOINT,0) AS CONTA_BAIXA,
        NVL(CB.DESCRICAO,'SEM REGISTRO') AS NOME_CONTA_BAIXA,
        CASE 
            WHEN B.DHBAIXA IS NULL THEN 'Provisão'
            ELSE 'Real'
        END AS FINANCEIRO,
        VFIN.VLRLIQUIDO,
        'Receita' AS TIPO,
        NVL(MR.SUM_VLRBAIXA, 0) + B.VLRBAIXA AS MULTIPLICACAO_RECEITA_ANTERIOR
    FROM BASE B
    LEFT JOIN TGFNAT NAT ON B.CODNAT = NAT.CODNAT
    LEFT JOIN VGFFIN VFIN ON B.NUFIN = VFIN.NUFIN
    LEFT JOIN TGFPAR PAR ON B.CODPARC = PAR.CODPARC
    LEFT JOIN CONTA_BAIXA CB ON B.NUFIN = CB.NUFIN
    LEFT JOIN MULT_RECEITA_ANT MR ON B.PROVISAO = MR.PROVISAO
    ) 
   