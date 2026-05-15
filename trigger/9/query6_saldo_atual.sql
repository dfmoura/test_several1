/* Saldo consolidado: saldo inicial (TCBSAL) + movimentos (TCBLAN) — Oracle */
SELECT
    mes,
    numero_lancamento,
    numlote,
    cr_id            AS id_cr,
    empresa_id       AS id_empresa,
    conta            AS id_conta_contabil,
    tiplanc,
    historico_id     AS id_historico,
    historico,
    SUM(valor)       AS saldo_atual
FROM (
    /* Saldo inicial do mês */
    SELECT
        TO_CHAR(sal.referencia, 'MM/YYYY') AS mes,
        -999                               AS numero_lancamento,
        8888                               AS numlote,
        sal.codcencus                      AS cr_id,
        cus.descrcencus                    AS cr,
        sal.codemp                         AS empresa_id,
        emp.nomefantasia                   AS empresa,
        pla.ctactb                         AS conta,
        'S'                                AS tiplanc,
        -999                               AS historico_id,
        '-'                                AS historico,
        SUM(sal.saldoinicmes)              AS valor
    FROM tcbsal sal
    INNER JOIN tcbpla pla
        ON sal.codctactb = pla.codctactb
    LEFT JOIN tsiemp emp
        ON sal.codemp = emp.codemp
    LEFT JOIN tsicus cus
        ON sal.codcencus = cus.codcencus
    WHERE sal.codemp IN (999, 6, 7)
      AND TO_CHAR(sal.referencia, 'YYYYMM') >= '202201'
    GROUP BY
        TO_CHAR(sal.referencia, 'MM/YYYY'),
        sal.codcencus,
        sal.codproj,
        sal.codemp,
        pla.ctactb,
        cus.descrcencus,
        emp.nomefantasia

    UNION ALL

    /* Lançamentos */
    SELECT
        TO_CHAR(lan.dtmov, 'MM/YYYY')      AS mes,
        lan.numlanc                        AS numero_lancamento,
        lan.numlote,
        lan.codcencus                      AS cr_id,
        cus.descrcencus                    AS cr,
        lan.codemp                         AS empresa_id,
        emp.nomefantasia                   AS empresa,
        pla.ctactb                         AS conta,
        lan.tiplanc,
        lan.numlanc                        AS historico_id,
        lan.complhist                      AS historico,
        SUM(CASE
                WHEN lan.tiplanc = 'R' THEN -lan.vlrlanc
                ELSE lan.vlrlanc
            END)                           AS valor
    FROM tcblan lan
    INNER JOIN tcbpla pla
        ON lan.codctactb = pla.codctactb
    LEFT JOIN tsiemp emp
        ON lan.codemp = emp.codemp
    LEFT JOIN tsicus cus
        ON lan.codcencus = cus.codcencus
    WHERE lan.codemp IN (999, 6, 7)
      AND TO_CHAR(lan.dtmov, 'YYYYMM') >= '202201'
      AND pla.codctactb <> 2726
      AND (lan.codconpar IS NULL OR lan.codconpar <> 2726)
    GROUP BY
        TO_CHAR(lan.dtmov, 'MM/YYYY'),
        lan.numlanc,
        lan.numlote,
        lan.codcencus,
        cus.descrcencus,
        lan.codemp,
        emp.nomefantasia,
        pla.ctactb,
        lan.tiplanc,
        lan.complhist
) x
GROUP BY
    mes,
    numero_lancamento,
    numlote,
    cr_id,
    empresa_id,
    conta,
    tiplanc,
    historico_id,
    historico
