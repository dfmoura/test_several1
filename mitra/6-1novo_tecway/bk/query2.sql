WITH RECURSIVE PARAMS AS (
    SELECT
        :VAR_MES AS MES_ATUAL,
        DATE_FORMAT(
            DATE_SUB(
                STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y'),
                INTERVAL 1 YEAR
            ),
            '%m/%Y'
        ) AS MES_ANTERIOR,
        :VAR_EMPRESA AS EMPRESA
),

CALCULOS AS (

    /* =========================
       Período atual
       ========================= */
    SELECT
        'ATUAL' AS PERIODO,
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA,
        d.ORDEM AS ORDEM_ORIGEM,
        CASE
            WHEN d.TIPO = 'CONTA'
                THEN COALESCE(SUM(t.BP_TECWAY) * 1000, 0)
            ELSE 0
        END AS VALOR,
        1 AS SINAL
    FROM DET_DRE_TW d
        CROSS JOIN PARAMS p
        LEFT JOIN CAD_CONTA_DRE_TW c
            ON c.ID_DET_DRE_TW = d.ID
        LEFT JOIN BP_TECWAY t
            ON t.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL
           AND t.MES = p.MES_ATUAL
           AND (
                :VAR_EMPRESA IS NULL
                OR :VAR_EMPRESA = ''
                OR FIND_IN_SET(t.ID_EMPRESA, :VAR_EMPRESA)
           )
        LEFT JOIN ESTR_DRE_TW f
            ON d.ID_ESTR_DRE_TW = f.ID
    WHERE d.TIPO = 'CONTA'
      AND f.TIPO_DEMONSTRATIVO = 'BP'
      AND f.ID = 5
    GROUP BY
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA

    UNION ALL

    /* =========================
       Período ano anterior
       ========================= */
    SELECT
        'ANTERIOR' AS PERIODO,
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA,
        d.ORDEM AS ORDEM_ORIGEM,
        CASE
            WHEN d.TIPO = 'CONTA'
                THEN COALESCE(SUM(t.BP_TECWAY) * 1000, 0)
            ELSE 0
        END AS VALOR,
        1 AS SINAL
    FROM DET_DRE_TW d
        CROSS JOIN PARAMS p
        LEFT JOIN CAD_CONTA_DRE_TW c
            ON c.ID_DET_DRE_TW = d.ID
        LEFT JOIN BP_TECWAY t
            ON t.ID_CONTA_CONTABIL = c.ID_CONTA_CONTABIL
           AND t.MES = p.MES_ANTERIOR
           AND (
                :VAR_EMPRESA IS NULL
                OR :VAR_EMPRESA = ''
                OR FIND_IN_SET(t.ID_EMPRESA, :VAR_EMPRESA)
           )
        LEFT JOIN ESTR_DRE_TW f
            ON d.ID_ESTR_DRE_TW = f.ID
    WHERE d.TIPO = 'CONTA'
      AND f.TIPO_DEMONSTRATIVO = 'BP'
      AND f.ID = 5
    GROUP BY
        d.ID,
        d.ORDEM,
        d.DESCRICAO,
        d.TIPO,
        d.FORMATACAO,
        d.HIERARQUIA

    UNION ALL

    /* =========================
       Cálculos derivados
       ========================= */
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
            WHEN LOCATE(
                CONCAT('-', '[', c.ORDEM, ']'),
                REPLACE(d.CALCULO, ' ', '')
            ) > 0
                THEN -1
            ELSE 1
        END AS VALOR,
        1 AS SINAL
    FROM DET_DRE_TW d
        LEFT JOIN ESTR_DRE_TW f
            ON d.ID_ESTR_DRE_TW = f.ID
        JOIN CALCULOS c
            ON FIND_IN_SET(
                c.ORDEM,
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(d.CALCULO, ' ', ''),
                                '[',
                                ''
                            ),
                            ']',
                            ''
                        ),
                        '+',
                        ','
                    ),
                    '-',
                    ','
                )
            )
    WHERE d.TIPO = 'CALCULO'
      AND f.ID = 5
),

RESULTADOS AS (
    SELECT
        PERIODO,
        ORDEM,
        DESCRICAO,
        FORMATACAO,
        HIERARQUIA,
        SUM(VALOR) AS VALOR
    FROM CALCULOS
    GROUP BY
        PERIODO,
        ORDEM,
        DESCRICAO,
        FORMATACAO,
        HIERARQUIA
),

AGREGADOS AS (
    SELECT
        PERIODO,
        MAX(CASE WHEN ORDEM = 1  THEN VALOR END) AS V1,
        MAX(CASE WHEN ORDEM = 13 THEN VALOR END) AS V13,
        MAX(CASE WHEN ORDEM = 17 THEN VALOR END) AS V17,
        MAX(CASE WHEN ORDEM = 27 THEN VALOR END) AS V27,
        MAX(CASE WHEN ORDEM = 28 THEN VALOR END) AS V28,
        MAX(CASE WHEN ORDEM = 42 THEN VALOR END) AS V42
    FROM RESULTADOS
    GROUP BY PERIODO
),

RESULTADOS_FINAIS AS (
    SELECT *
    FROM RESULTADOS

    UNION ALL

    SELECT
        PERIODO,
        1001 AS ORDEM,
        'LIQUIDEZ CORRENTE' AS DESCRICAO,
        NULL AS FORMATACAO,
        '14.' AS HIERARQUIA,
        COALESCE(V1, 0) / NULLIF(V28, 0) AS VALOR
    FROM AGREGADOS

    UNION ALL

    SELECT
        PERIODO,
        1002 AS ORDEM,
        'LIQUIDEZ SECA' AS DESCRICAO,
        NULL AS FORMATACAO,
        '15.' AS HIERARQUIA,
        (COALESCE(V1, 0) - COALESCE(V13, 0)) / NULLIF(V28, 0) AS VALOR
    FROM AGREGADOS

    UNION ALL

    SELECT
        PERIODO,
        1003 AS ORDEM,
        'LIQUIDEZ GERAL' AS DESCRICAO,
        NULL AS FORMATACAO,
        '16.' AS HIERARQUIA,
        (COALESCE(V1, 0) + COALESCE(V17, 0))
        / NULLIF(COALESCE(V28, 0) + COALESCE(V42, 0), 0) AS VALOR
    FROM AGREGADOS

    UNION ALL

    SELECT
        PERIODO,
        1004 AS ORDEM,
        'SOLVÊNCIA GERAL' AS DESCRICAO,
        NULL AS FORMATACAO,
        '17.' AS HIERARQUIA,
        COALESCE(V27, 0)
        / NULLIF(COALESCE(V28, 0) + COALESCE(V42, 0), 0) AS VALOR
    FROM AGREGADOS
)

SELECT
    ORDEM,
    DESCRICAO,
    FORMATACAO,
    HIERARQUIA,
    MAX(CASE WHEN PERIODO = 'ATUAL' THEN VALOR END)    AS VALOR_ATUAL,
    MAX(CASE WHEN PERIODO = 'ANTERIOR' THEN VALOR END) AS VALOR_ANTERIOR
FROM RESULTADOS_FINAIS
GROUP BY
    ORDEM,
    DESCRICAO,
    FORMATACAO,
    HIERARQUIA
ORDER BY ORDEM;
