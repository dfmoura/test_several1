SELECT
    SUM(
        CASE
            WHEN D.ID_DRE = 1 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_1,

    SUM(
        CASE
            WHEN D.ID_DRE = 2 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_2,

    SUM(
        CASE
            WHEN D.ID_DRE = 3 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_3,

    SUM(
        CASE
            WHEN D.ID_DRE = 4 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_4,

    SUM(
        CASE
            WHEN D.ID_DRE = 5 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_5,

    SUM(
        CASE
            WHEN D.ID_DRE = 6 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_6,

    SUM(
        CASE
            WHEN D.ID_DRE = 7 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_7,

    SUM(
        CASE
            WHEN D.ID_DRE = 8 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_8,

    SUM(
        CASE
            WHEN D.ID_DRE = 9 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_9,

    SUM(
        CASE
            WHEN D.ID_DRE = 10 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_10,

    SUM(
        CASE
            WHEN D.ID_DRE = 11 THEN
                CASE
                    WHEN (:VAR_MES IS NULL OR :VAR_MES = '') THEN DRE.DRE_TECWAY
                    WHEN DRE.MES = :VAR_MES THEN DRE.DRE_TECWAY
                    ELSE 0
                END
            ELSE 0
        END
    ) AS ATUAL_11,

    SUM(
        CASE
            WHEN D.ID_DRE = 1
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_1,

    SUM(
        CASE
            WHEN D.ID_DRE = 2
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_2,

    SUM(
        CASE
            WHEN D.ID_DRE = 3
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_3,

    SUM(
        CASE
            WHEN D.ID_DRE = 4
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_4,

    SUM(
        CASE
            WHEN D.ID_DRE = 5
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_5,

    SUM(
        CASE
            WHEN D.ID_DRE = 6
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_6,

    SUM(
        CASE
            WHEN D.ID_DRE = 7
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_7,

    SUM(
        CASE
            WHEN D.ID_DRE = 8
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_8,

    SUM(
        CASE
            WHEN D.ID_DRE = 9
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_9,

    SUM(
        CASE
            WHEN D.ID_DRE = 10
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_10,

    SUM(
        CASE
            WHEN D.ID_DRE = 11
             AND DRE.MES = DATE_FORMAT(
                    STR_TO_DATE(CONCAT('01/', :VAR_MES), '%d/%m/%Y') - INTERVAL 1 YEAR,
                    '%m/%Y'
                )
            THEN DRE.DRE_TECWAY
            ELSE 0
        END
    ) AS ANTERIOR_11

FROM DRE_TECWAY DRE
JOIN DEMONSTRATIVOS D
    ON DRE.ID_CONTA_CONTABIL = D.ID_CONTA_CONTABIL
WHERE
    (:VAR_EMPRESA IS NULL OR :VAR_EMPRESA = '' OR FIND_IN_SET(DRE.ID_EMPRESA, :VAR_EMPRESA))
