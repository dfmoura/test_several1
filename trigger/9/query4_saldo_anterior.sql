SELECT
    TO_CHAR(sal.referencia, 'MM/YYYY') AS mes,
    -999 AS numero_lancamento,
    sal.codcencus AS id_cr,
    sal.codemp AS id_empresa,
    pla.ctactb AS id_conta_contabil,
    'S' AS tiplanc,
    -999 AS id_historico,
    '-' AS historico,
    SUM(sal.saldoinicmes) AS saldo_anterior
FROM tcbsal sal
JOIN tcbpla pla
    ON pla.codctactb = sal.codctactb
LEFT JOIN tsiemp emp
    ON emp.codemp = sal.codemp
LEFT JOIN tsicus cus
    ON cus.codcencus = sal.codcencus
WHERE sal.codemp = 999
  AND sal.referencia >= DATE '2022-01-01'
GROUP BY
    TO_CHAR(sal.referencia, 'MM/YYYY'),
    sal.codcencus,
    sal.codproj,
    sal.codemp,
    pla.ctactb;
