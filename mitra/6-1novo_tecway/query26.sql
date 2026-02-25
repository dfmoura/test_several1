WITH RECURSIVE PARAMS AS (
    SELECT
        :VAR_MES AS MES_REFERENCIA,
        YEAR(STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y')) AS ANO_REFERENCIA,
        :VAR_EMPRESA AS EMPRESA
),

MESES AS (
    SELECT 1 AS NUM_MES
    UNION ALL
    SELECT NUM_MES + 1
    FROM MESES
    WHERE NUM_MES < 12
),

PERIODOS AS (
    SELECT
        LPAD(m.NUM_MES, 2, '0') AS MES_NUM,
        CONCAT(LPAD(m.NUM_MES, 2, '0'), '/', p.ANO_REFERENCIA) AS PERIODO,
        p.EMPRESA
    FROM MESES m
    CROSS JOIN PARAMS p
),

CALCULOS AS (

    /* =======================
       Período: cada mês (JAN-DEZ)
       Apenas valor atual
    ======================== */

    SELECT
        per.PERIODO AS PERIODO,
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA,
        d.ORDEM AS ORDEM_ORIGEM,
        CASE
            WHEN d.TIPO = 'CONTA'
                THEN COALESCE(SUM(t.DRE_TECWAY) * 1000, 0)
            ELSE 0
        END * IFNULL(d.SINAL, 1) AS VALOR,
        1 AS SINAL
    FROM DET_DRE_TW d
    CROSS JOIN PERIODOS per
    LEFT JOIN CAD_CONTA_DRE_TW c
        ON c.ID_DET_DRE_TW = d.ID
    LEFT JOIN DRE_TECWAY t
        ON t.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL
       AND t.MES = per.PERIODO
       AND t.ID_EMPRESA = per.EMPRESA
    LEFT JOIN ESTR_DRE_TW g
        ON d.ID_ESTR_DRE_TW = g.ID
    WHERE d.TIPO IN ('CONTA')
      AND g.TIPO_DEMONSTRATIVO = 'DRE'
      AND g.ID = 1
    GROUP BY
        per.PERIODO,
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA,
        d.SINAL

    UNION ALL

    /* =======================
       Cálculos Dinâmicos
       (exceto 8 a 13)
    ======================== */

    SELECT
        c.PERIODO,
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA,
        c.ORDEM AS ORDEM_ORIGEM,
        c.VALOR *
        CASE
            WHEN d.TIPO = 'CALCULO1'
                 AND LOCATE(
                        CONCAT('-', '[', c.ORDEM, ']'),
                        REPLACE(d.CALCULO, ' ', '')
                     ) > 0
                THEN -1
            ELSE 1
        END AS VALOR,
        1 AS SINAL
    FROM DET_DRE_TW d
    JOIN CALCULOS c
        ON FIND_IN_SET(
            c.ORDEM,
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(d.CALCULO, ' ', ''),
                            '[', ''
                        ),
                        ']', ''
                    ),
                    '+', ','
                ),
                '-', ','
            )
        )
    LEFT JOIN ESTR_DRE_TW g
        ON d.ID_ESTR_DRE_TW = g.ID
    WHERE d.TIPO LIKE 'CALCULO%'
      AND d.TIPO NOT IN (
            'CALCULO8',
            'CALCULO9',
            'CALCULO10',
            'CALCULO11',
            'CALCULO12',
            'CALCULO13'
        )
      AND g.TIPO_DEMONSTRATIVO = 'DRE'
      AND g.ID = 1
),

CALCULOS_INTERMEDIARIOS AS (
    SELECT
        PERIODO,
        ORDEM,
        DESCRICAO,
        TIPO,
        FORMATACAO,
        HIERARQUIA,
        SUM(VALOR) AS VALOR_BASE
    FROM CALCULOS
    GROUP BY
        PERIODO,
        ORDEM,
        DESCRICAO,
        TIPO,
        FORMATACAO,
        HIERARQUIA

    UNION ALL

    /* Placeholders para cálculos posteriores */

    SELECT
        per.PERIODO,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA,
        0 AS VALOR_BASE
    FROM DET_DRE_TW d
    CROSS JOIN PERIODOS per
    WHERE d.TIPO IN (
        'CALCULO8',
        'CALCULO9',
        'CALCULO10',
        'CALCULO11',
        'CALCULO12',
        'CALCULO13'
    )
),

VALORES_FINAIS AS (
    SELECT
        x.PERIODO,
        x.ORDEM,
        x.DESCRICAO,
        x.TIPO,
        x.FORMATACAO,
        x.HIERARQUIA,
        CASE
            WHEN x.TIPO = 'CALCULO4'
                THEN ABS(x.VALOR_BASE)
            WHEN x.TIPO = 'CALCULO5'
                THEN CASE
                        WHEN x.VALOR_BASE > 0 THEN x.VALOR_BASE * 0.15
                        ELSE 0
                     END
            WHEN x.TIPO = 'CALCULO6'
                THEN CASE
                        WHEN x.VALOR_BASE > 240000
                            THEN (x.VALOR_BASE - 240000) * 0.10
                        ELSE 0
                     END
            WHEN x.TIPO = 'CALCULO7'
                THEN CASE
                        WHEN x.VALOR_BASE > 0 THEN x.VALOR_BASE * 0.09
                        ELSE 0
                     END
            WHEN x.TIPO IN (
                'CALCULO8',
                'CALCULO9',
                'CALCULO10',
                'CALCULO11',
                'CALCULO12',
                'CALCULO13'
            )
                THEN 0
            ELSE x.VALOR_BASE
        END AS VALOR_FINAL
    FROM CALCULOS_INTERMEDIARIOS x
),

RES_FIN AS (
    SELECT
        PERIODO,
        ORDEM,
        DESCRICAO,
        FORMATACAO,
        HIERARQUIA,
        VALOR_FINAL
    FROM VALORES_FINAIS
)

SELECT
    ORDEM,
    DESCRICAO,
    FORMATACAO,
    HIERARQUIA,
    MAX(CASE WHEN PERIODO LIKE '01/%' THEN VALOR_FINAL END) AS VALOR_JAN,
    MAX(CASE WHEN PERIODO LIKE '02/%' THEN VALOR_FINAL END) AS VALOR_FEV,
    MAX(CASE WHEN PERIODO LIKE '03/%' THEN VALOR_FINAL END) AS VALOR_MAR,
    MAX(CASE WHEN PERIODO LIKE '04/%' THEN VALOR_FINAL END) AS VALOR_ABR,
    MAX(CASE WHEN PERIODO LIKE '05/%' THEN VALOR_FINAL END) AS VALOR_MAI,
    MAX(CASE WHEN PERIODO LIKE '06/%' THEN VALOR_FINAL END) AS VALOR_JUN,
    MAX(CASE WHEN PERIODO LIKE '07/%' THEN VALOR_FINAL END) AS VALOR_JUL,
    MAX(CASE WHEN PERIODO LIKE '08/%' THEN VALOR_FINAL END) AS VALOR_AGO,
    MAX(CASE WHEN PERIODO LIKE '09/%' THEN VALOR_FINAL END) AS VALOR_SET,
    MAX(CASE WHEN PERIODO LIKE '10/%' THEN VALOR_FINAL END) AS VALOR_OUT,
    MAX(CASE WHEN PERIODO LIKE '11/%' THEN VALOR_FINAL END) AS VALOR_NOV,
    MAX(CASE WHEN PERIODO LIKE '12/%' THEN VALOR_FINAL END) AS VALOR_DEZ
FROM RES_FIN
WHERE ORDEM NOT BETWEEN 52 AND 68
GROUP BY
    ORDEM,
    DESCRICAO,
    FORMATACAO,
    HIERARQUIA
ORDER BY ORDEM