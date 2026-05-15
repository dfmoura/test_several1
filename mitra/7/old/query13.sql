WITH base_bal AS (

    SELECT
        CTACTB,

        /* =====================================================
           ACUMULADO ATÉ ANO ATUAL
        ===================================================== */
        SUM(
            CASE
                WHEN REFERENCIA <= TIMESTAMP(
                        LAST_DAY(DATE(:VAR_DATA_REF_DRE))
                     )
                THEN VLRLANC
                ELSE 0
            END
        ) AS soma_ate_atu,

        /* =====================================================
           ACUMULADO ATÉ ANO ANTERIOR
        ===================================================== */
        SUM(
            CASE
                WHEN REFERENCIA <= TIMESTAMP(
                        LAST_DAY(
                            DATE_SUB(
                                DATE(:VAR_DATA_REF_DRE),
                                INTERVAL 1 YEAR
                            )
                        )
                     )
                THEN VLRLANC
                ELSE 0
            END
        ) AS soma_ate_ant,

        /* =====================================================
           ACUMULADO ATÉ 2 ANOS ANTES
        ===================================================== */
        SUM(
            CASE
                WHEN REFERENCIA <= TIMESTAMP(
                        LAST_DAY(
                            DATE_SUB(
                                DATE(:VAR_DATA_REF_DRE),
                                INTERVAL 2 YEAR
                            )
                        )
                     )
                THEN VLRLANC
                ELSE 0
            END
        ) AS soma_ate_ant2

    FROM IMP_BASE_BALANCETE

    WHERE CODEMP = :VAR_EMPRESA_DRE
      AND REFERENCIA <= TIMESTAMP(
            LAST_DAY(DATE(:VAR_DATA_REF_DRE))
          )

    GROUP BY CTACTB
),

/* =====================================================
   OUTROS_DFC
===================================================== */
outros_dfc_191 AS (

    SELECT

        SUM(
            CASE
                WHEN REFERENCIA = DATE(:VAR_DATA_REF_DRE)
                THEN VLRLANC
                ELSE 0
            END
        ) AS valor_atual,

        SUM(
            CASE
                WHEN REFERENCIA = DATE_SUB(
                        DATE(:VAR_DATA_REF_DRE),
                        INTERVAL 1 YEAR
                     )
                THEN VLRLANC
                ELSE 0
            END
        ) AS valor_anterior,

        SUM(
            CASE
                WHEN REFERENCIA = DATE_SUB(
                        DATE(:VAR_DATA_REF_DRE),
                        INTERVAL 2 YEAR
                     )
                THEN VLRLANC
                ELSE 0
            END
        ) AS valor_anterior2

    FROM OUTROS_DFC

    WHERE CODEMP = :VAR_EMPRESA_DRE
      AND REFERENCIA IN (
            DATE(:VAR_DATA_REF_DRE),
            DATE_SUB(DATE(:VAR_DATA_REF_DRE), INTERVAL 1 YEAR),
            DATE_SUB(DATE(:VAR_DATA_REF_DRE), INTERVAL 2 YEAR)
      )
),

/* =====================================================
   BASE DE VALORES (query11)
===================================================== */
base_valores AS (

    SELECT

        DET.ORDEM,
        DET.NOME_GRUPO AS DESCRICAO,
        DET.VARIACAO,

        /* =====================================================
           VALOR BASE ANO ATUAL
        ===================================================== */
        CASE

            WHEN DET.ORDEM = '1.9.1'
                 AND SUM(
                        CASE
                            WHEN DETREF.REFERENCIA = DATE(:VAR_DATA_REF_DRE)
                            THEN IFNULL(B.VLRLANC,0) * DETCTACTB.SINAL
                            ELSE 0
                        END
                     ) = 0

            THEN (
                SELECT valor_atual
                FROM outros_dfc_191
            )

            ELSE

                SUM(
                    CASE

                        /* CONTAS 1 E 2 = ACUMULADO */
                        WHEN DETREF.REFERENCIA = DATE(:VAR_DATA_REF_DRE)
                             AND (
                                 DETCTACTB.PADRAO_CTACTB LIKE '1%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '2%'
                             )

                        THEN IFNULL(BB.soma_ate_atu, 0)
                             * DETCTACTB.SINAL

                        /* CONTAS 3 4 5 = MOVIMENTO */
                        WHEN DETREF.REFERENCIA = DATE(:VAR_DATA_REF_DRE)
                             AND (
                                 DETCTACTB.PADRAO_CTACTB LIKE '3%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '4%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '5%'
                             )

                        THEN IFNULL(B.VLRLANC, 0)
                             * DETCTACTB.SINAL

                        ELSE 0

                    END
                )

        END AS valor_base_atual,

        /* =====================================================
           VALOR BASE ANO ANTERIOR
        ===================================================== */
        CASE

            WHEN DET.ORDEM = '1.9.1'
                 AND SUM(
                        CASE
                            WHEN DETREF.REFERENCIA = DATE_SUB(
                                    DATE(:VAR_DATA_REF_DRE),
                                    INTERVAL 1 YEAR
                                 )
                            THEN IFNULL(B.VLRLANC,0)
                            ELSE 0
                        END
                     ) = 0

            THEN (
                SELECT valor_anterior
                FROM outros_dfc_191
            )

            ELSE

                SUM(
                    CASE

                        /* CONTAS 1 E 2 = ACUMULADO */
                        WHEN DETREF.REFERENCIA = DATE_SUB(
                                    DATE(:VAR_DATA_REF_DRE),
                                    INTERVAL 1 YEAR
                                 )
                             AND (
                                 DETCTACTB.PADRAO_CTACTB LIKE '1%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '2%'
                             )

                        THEN IFNULL(BB.soma_ate_ant, 0)
                             * DETCTACTB.SINAL

                        /* CONTAS 3 4 5 = MOVIMENTO */
                        WHEN DETREF.REFERENCIA = DATE_SUB(
                                    DATE(:VAR_DATA_REF_DRE),
                                    INTERVAL 1 YEAR
                                 )
                             AND (
                                 DETCTACTB.PADRAO_CTACTB LIKE '3%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '4%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '5%'
                             )

                        THEN IFNULL(B.VLRLANC, 0)
                             * DETCTACTB.SINAL

                        ELSE 0

                    END
                )

        END AS valor_base_anterior,

        /* =====================================================
           VALOR BASE 2 ANOS ANTES
        ===================================================== */
        CASE

            WHEN DET.ORDEM = '1.9.1'

            THEN (
                SELECT valor_anterior2
                FROM outros_dfc_191
            )

            ELSE

                SUM(
                    CASE

                        /* CONTAS 1 E 2 = ACUMULADO */
                        WHEN DETREF.REFERENCIA = DATE_SUB(
                                    DATE(:VAR_DATA_REF_DRE),
                                    INTERVAL 2 YEAR
                                 )
                             AND (
                                 DETCTACTB.PADRAO_CTACTB LIKE '1%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '2%'
                             )

                        THEN IFNULL(BB.soma_ate_ant2, 0)
                             * DETCTACTB.SINAL

                        /* CONTAS 3 4 5 = MOVIMENTO */
                        WHEN DETREF.REFERENCIA = DATE_SUB(
                                    DATE(:VAR_DATA_REF_DRE),
                                    INTERVAL 2 YEAR
                                 )
                             AND (
                                 DETCTACTB.PADRAO_CTACTB LIKE '3%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '4%'
                                 OR DETCTACTB.PADRAO_CTACTB LIKE '5%'
                             )

                        THEN IFNULL(B.VLRLANC, 0)
                             * DETCTACTB.SINAL

                        ELSE 0

                    END
                )

        END AS valor_base_anterior2

    FROM ESTR_DEMONSTRATIVOS EST

    INNER JOIN DET_DEMONSTRATIVO DET
        ON EST.ID = DET.ID_ESTR_DEMONSTRATIVO

    INNER JOIN DET_DEMONSTRATIVO_REFERENCIA DETREF
        ON DET.ID = DETREF.ID_DET_DEMONSTRATIVO

    LEFT JOIN DET_DEMONSTRATIVO_CTACTB DETCTACTB
        ON DETREF.ID = DETCTACTB.ID_DET_DEMONSTRATIVO_REFERENCIA

    LEFT JOIN base_bal BB
        ON BB.CTACTB = DETCTACTB.PADRAO_CTACTB

    LEFT JOIN IMP_BASE_BALANCETE B
        ON B.CTACTB = DETCTACTB.PADRAO_CTACTB
       AND B.REFERENCIA = DETREF.REFERENCIA
       AND B.CODEMP = :VAR_EMPRESA_DRE

    WHERE DETREF.REFERENCIA IN (
            DATE(:VAR_DATA_REF_DRE),
            DATE_SUB(DATE(:VAR_DATA_REF_DRE), INTERVAL 1 YEAR),
            DATE_SUB(DATE(:VAR_DATA_REF_DRE), INTERVAL 2 YEAR)
    )

      AND EST.ID IN (10)

    GROUP BY
        DET.ORDEM,
        DET.NOME_GRUPO,
        DET.VARIACAO
),

/* =====================================================
   EXCLUSÕES POR LINHA (query12), mesma chave que base_valores:
   ORDEM + NOME_GRUPO + VARIACAO
   Valor em unidades brutas (sem /1000), alinhado ao query11.
===================================================== */
base_bal_exc AS (

    SELECT
        CODEMP,
        CTACTB,
        REFERENCIA,
        SUM(ABS(VLRLANC)) AS VLRLANC

    FROM IMP_BASE_BALANCETE

    WHERE CODEMP = :VAR_EMPRESA_DRE
      AND REFERENCIA = DATE(:VAR_DATA_REF_DRE)

    GROUP BY
        CODEMP,
        CTACTB,
        REFERENCIA
),

exclusoes_por_linha AS (

    SELECT
        DET.ORDEM,
        DET.NOME_GRUPO,
        DET.VARIACAO,
        COALESCE(SUM(BB.VLRLANC * DETCTACTB_EXC.SINAL), 0) AS vl_exc

    FROM ESTR_DEMONSTRATIVOS EST

    INNER JOIN DET_DEMONSTRATIVO DET
        ON EST.ID = DET.ID_ESTR_DEMONSTRATIVO

    INNER JOIN DET_DEMONSTRATIVO_REFERENCIA DETREF
        ON DET.ID = DETREF.ID_DET_DEMONSTRATIVO

    INNER JOIN DET_DEMONSTRATIVO_CTACTB_EXC DETCTACTB_EXC
        ON DETREF.ID = DETCTACTB_EXC.ID_DET_DEMONSTRATIVO_REFERENCIA

    LEFT JOIN base_bal_exc BB
        ON BB.CTACTB = DETCTACTB_EXC.PADRAO_CTACTB
       AND BB.CODEMP = :VAR_EMPRESA_DRE
       AND BB.REFERENCIA = DETREF.REFERENCIA

    WHERE DETREF.REFERENCIA = DATE(:VAR_DATA_REF_DRE)
      AND EST.ID IN (10)

    GROUP BY
        DET.ORDEM,
        DET.NOME_GRUPO,
        DET.VARIACAO
)

/* =====================================================
   RESULTADO: query11 menos exclusões (query12) por linha
===================================================== */
SELECT

    BV.ORDEM,
    BV.DESCRICAO,
    BV.VARIACAO,

    /* =====================================================
       COLUNAS BASE (valor atual líquido de exclusões)
    ===================================================== */
    (BV.valor_base_atual - IFNULL(EX.vl_exc, 0)) / 1000 AS valor_base_atual,
    BV.valor_base_anterior / 1000 AS valor_base_anterior,
    BV.valor_base_anterior2 / 1000 AS valor_base_anterior2,

    /* =====================================================
       VALOR ANO ATUAL (usa valor_base_atual já líquido)
    ===================================================== */
    CASE

        WHEN BV.ORDEM = '5.1'
        THEN BV.valor_base_anterior

        WHEN BV.VARIACAO = 'Sim'
        THEN BV.valor_base_anterior - (BV.valor_base_atual - IFNULL(EX.vl_exc, 0))

        ELSE (BV.valor_base_atual - IFNULL(EX.vl_exc, 0))

    END / 1000 AS VALOR_ANO_ATUAL,

    /* =====================================================
       VALOR ANO ANTERIOR (inalterado em relação ao query11)
    ===================================================== */
    CASE

        WHEN BV.ORDEM = '5.1'
        THEN BV.valor_base_anterior2

        WHEN BV.VARIACAO = 'Sim'
        THEN BV.valor_base_anterior2 - BV.valor_base_anterior

        ELSE BV.valor_base_anterior

    END / 1000 AS VALOR_ANO_ANTERIOR

FROM base_valores BV

LEFT JOIN exclusoes_por_linha EX
    ON EX.ORDEM = BV.ORDEM
   AND EX.NOME_GRUPO = BV.DESCRICAO
   AND EX.VARIACAO <=> BV.VARIACAO

ORDER BY BV.ORDEM;
