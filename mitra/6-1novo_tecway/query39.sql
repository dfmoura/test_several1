SELECT
    SUM(
        CASE
            WHEN MES = :VAR_MES
            THEN DEBITO + CREDITO
            ELSE 0
        END
    ) AS VALOR_ATUAL,
    SUM(
        CASE
            WHEN MES = DATE_FORMAT(
                     STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                     '%m/%Y'
                 )
            THEN DEBITO + CREDITO
            ELSE 0
        END
    ) AS VALOR_ANTERIOR
FROM DEBITO_CREDITO
WHERE id_conta_contabil = '2.3.04.01.000004';

