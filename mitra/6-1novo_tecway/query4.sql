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

AGREGADOS_PIVOT AS (
    SELECT
        MAX(CASE WHEN PERIODO = 'ATUAL'    THEN V1  END) AS V1_ATUAL,
        MAX(CASE WHEN PERIODO = 'ANTERIOR' THEN V1  END) AS V1_ANTERIOR,
        MAX(CASE WHEN PERIODO = 'ATUAL'    THEN V13 END) AS V13_ATUAL,
        MAX(CASE WHEN PERIODO = 'ANTERIOR' THEN V13 END) AS V13_ANTERIOR,
        MAX(CASE WHEN PERIODO = 'ATUAL'    THEN V17 END) AS V17_ATUAL,
        MAX(CASE WHEN PERIODO = 'ANTERIOR' THEN V17 END) AS V17_ANTERIOR,
        MAX(CASE WHEN PERIODO = 'ATUAL'    THEN V27 END) AS V27_ATUAL,
        MAX(CASE WHEN PERIODO = 'ANTERIOR' THEN V27 END) AS V27_ANTERIOR,
        MAX(CASE WHEN PERIODO = 'ATUAL'    THEN V28 END) AS V28_ATUAL,
        MAX(CASE WHEN PERIODO = 'ANTERIOR' THEN V28 END) AS V28_ANTERIOR,
        MAX(CASE WHEN PERIODO = 'ATUAL'    THEN V42 END) AS V42_ATUAL,
        MAX(CASE WHEN PERIODO = 'ANTERIOR' THEN V42 END) AS V42_ANTERIOR
    FROM AGREGADOS
)

SELECT
    ORDEM,
    DESCRICAO,
    HIERARQUIA,
    VALOR_ATUAL,
    VALOR_ANTERIOR,
    V1_ATUAL,
    V1_ANTERIOR,
    V13_ATUAL,
    V13_ANTERIOR,
    V17_ATUAL,
    V17_ANTERIOR,
    V27_ATUAL,
    V27_ANTERIOR,
    V28_ATUAL,
    V28_ANTERIOR,
    V42_ATUAL,
    V42_ANTERIOR
FROM (
    SELECT
        1001 AS ORDEM,
        'LIQUIDEZ CORRENTE' AS DESCRICAO,
        '14.' AS HIERARQUIA,
        V1_ATUAL / NULLIF(V28_ATUAL, 0) AS VALOR_ATUAL,
        V1_ANTERIOR / NULLIF(V28_ANTERIOR, 0) AS VALOR_ANTERIOR,
        V1_ATUAL AS V1_ATUAL,
        V1_ANTERIOR AS V1_ANTERIOR,
        NULL AS V13_ATUAL,
        NULL AS V13_ANTERIOR,
        NULL AS V17_ATUAL,
        NULL AS V17_ANTERIOR,
        NULL AS V27_ATUAL,
        NULL AS V27_ANTERIOR,
        V28_ATUAL AS V28_ATUAL,
        V28_ANTERIOR AS V28_ANTERIOR,
        NULL AS V42_ATUAL,
        NULL AS V42_ANTERIOR
    FROM AGREGADOS_PIVOT

    UNION ALL

    SELECT
        1002 AS ORDEM,
        'LIQUIDEZ SECA' AS DESCRICAO,
        '15.' AS HIERARQUIA,
        (V1_ATUAL - COALESCE(V13_ATUAL, 0)) / NULLIF(V28_ATUAL, 0) AS VALOR_ATUAL,
        (V1_ANTERIOR - COALESCE(V13_ANTERIOR, 0)) / NULLIF(V28_ANTERIOR, 0) AS VALOR_ANTERIOR,
        V1_ATUAL AS V1_ATUAL,
        V1_ANTERIOR AS V1_ANTERIOR,
        V13_ATUAL AS V13_ATUAL,
        V13_ANTERIOR AS V13_ANTERIOR,
        NULL AS V17_ATUAL,
        NULL AS V17_ANTERIOR,
        NULL AS V27_ATUAL,
        NULL AS V27_ANTERIOR,
        V28_ATUAL AS V28_ATUAL,
        V28_ANTERIOR AS V28_ANTERIOR,
        NULL AS V42_ATUAL,
        NULL AS V42_ANTERIOR
    FROM AGREGADOS_PIVOT

    UNION ALL

    SELECT
        1003 AS ORDEM,
        'LIQUIDEZ GERAL' AS DESCRICAO,
        '16.' AS HIERARQUIA,
        (COALESCE(V1_ATUAL, 0) + COALESCE(V17_ATUAL, 0))
            / NULLIF(COALESCE(V28_ATUAL, 0) + COALESCE(V42_ATUAL, 0), 0) AS VALOR_ATUAL,
        (COALESCE(V1_ANTERIOR, 0) + COALESCE(V17_ANTERIOR, 0))
            / NULLIF(COALESCE(V28_ANTERIOR, 0) + COALESCE(V42_ANTERIOR, 0), 0) AS VALOR_ANTERIOR,
        V1_ATUAL AS V1_ATUAL,
        V1_ANTERIOR AS V1_ANTERIOR,
        NULL AS V13_ATUAL,
        NULL AS V13_ANTERIOR,
        V17_ATUAL AS V17_ATUAL,
        V17_ANTERIOR AS V17_ANTERIOR,
        NULL AS V27_ATUAL,
        NULL AS V27_ANTERIOR,
        V28_ATUAL AS V28_ATUAL,
        V28_ANTERIOR AS V28_ANTERIOR,
        V42_ATUAL AS V42_ATUAL,
        V42_ANTERIOR AS V42_ANTERIOR
    FROM AGREGADOS_PIVOT

    UNION ALL

    SELECT
        1004 AS ORDEM,
        'SOLVÊNCIA GERAL' AS DESCRICAO,
        '17.' AS HIERARQUIA,
        COALESCE(V27_ATUAL, 0)
            / NULLIF(COALESCE(V28_ATUAL, 0) + COALESCE(V42_ATUAL, 0), 0) AS VALOR_ATUAL,
        COALESCE(V27_ANTERIOR, 0)
            / NULLIF(COALESCE(V28_ANTERIOR, 0) + COALESCE(V42_ANTERIOR, 0), 0) AS VALOR_ANTERIOR,
        NULL AS V1_ATUAL,
        NULL AS V1_ANTERIOR,
        NULL AS V13_ATUAL,
        NULL AS V13_ANTERIOR,
        NULL AS V17_ATUAL,
        NULL AS V17_ANTERIOR,
        V27_ATUAL AS V27_ATUAL,
        V27_ANTERIOR AS V27_ANTERIOR,
        V28_ATUAL AS V28_ATUAL,
        V28_ANTERIOR AS V28_ANTERIOR,
        V42_ATUAL AS V42_ATUAL,
        V42_ANTERIOR AS V42_ANTERIOR
    FROM AGREGADOS_PIVOT
) AS RESULTADOS_FINAIS
ORDER BY ORDEM;

