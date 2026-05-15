SELECT
    TO_CHAR(lan.dtmov, 'MM/YYYY') AS mes,
    lan.numlanc AS numero_lancamento,
    lan.numlote,
    lan.codcencus AS id_cr,
    lan.codemp AS id_empresa,
    pla.ctactb AS id_conta_contabil,
    lan.tiplanc,
    lan.numlanc AS id_historico,
    lan.complhist AS historico,
    SUM(CASE WHEN lan.tiplanc = 'R' THEN -lan.vlrlanc ELSE 0 END) AS credito,
    SUM(CASE WHEN lan.tiplanc = 'D' THEN lan.vlrlanc ELSE 0 END) AS debito
FROM tcblan lan
INNER JOIN tcbpla pla
    ON pla.codctactb = lan.codctactb
LEFT JOIN tsiemp emp
    ON emp.codemp = lan.codemp
LEFT JOIN tsicus cus
    ON cus.codcencus = lan.codcencus
WHERE lan.codemp IN (999, 6, 7)
  AND lan.dtmov >= DATE '2022-01-01'
GROUP BY
    TO_CHAR(lan.dtmov, 'MM/YYYY'),
    lan.numlanc,
    lan.numlote,
    lan.codcencus,
    lan.codemp,
    pla.ctactb,
    lan.tiplanc,
    lan.complhist