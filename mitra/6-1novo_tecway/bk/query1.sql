
SELECT 
  PAS.ORDEM,
    PAS.DFC,

    SUM(
        CASE
            WHEN DFC.MES = :VAR_MES THEN DFC.VALOR
            ELSE 0
        END
    ) AS VALOR_ATUAL,

    SUM(
        CASE
            WHEN DFC.MES = DATE_FORMAT(
                DATE_SUB(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y'),
                    INTERVAL 1 YEAR
                ),
                '%m/%Y'
            )
            THEN DFC.VALOR
            ELSE 0
        END
    ) AS VALOR_ANTERIOR

FROM DFC_TECWAY DFC
JOIN DFC_PADRAO PAS 
    ON DFC.ID_DFC_PADRAO = PAS.ID_DFC

WHERE 
    PAS.ORDEM IS NOT NULL

GROUP BY 
PAS.ORDEM,
    PAS.DFC

ORDER BY 
    PAS.ORDEM