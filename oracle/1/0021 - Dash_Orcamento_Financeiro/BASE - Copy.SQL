SELECT
    GRAU,
    CODIGO1,
    SUM(PREV) AS PREV,
    SUM(REAL) AS REAL
FROM
    (
        WITH BAS AS (
            SELECT
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY') AS ANO,
                TO_CHAR(DTREF, 'MM') AS MES,
                TO_CHAR(DTREF, 'MM-YYYY') AS MES_ANO,
                ABS(SUM(PREVREC + (PREVDESP * -1))) AS PREV,
                ABS(SUM(REALREC + (REALDESP * -1))) AS REAL
            FROM
                AD_ORCFIN ORC
                INNER JOIN AD_ORCFINDET DET ON ORC.CODIGO = DET.CODIGO
                INNER JOIN TGFMET MET ON DET.CODNAT = MET.CODNAT
            WHERE
                CODMETA = 7
            GROUP BY
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY'),
                TO_CHAR(DTREF, 'MM'),
                TO_CHAR(DTREF, 'MM-YYYY')
        ),
        GRAU1 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000' AS CODIGO1,
                'GRAU 1' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000',
                PREV,
                REAL
        ),
        GRAU2 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000' AS CODIGO1,
                'GRAU 2' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000',
                PREV,
                REAL
        ),
        GRAU3 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000' AS CODIGO1,
                'GRAU 3' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000',
                PREV,
                REAL
        ),
        GRAU4 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00' AS CODIGO1,
                'GRAU 4' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00',
                PREV,
                REAL
        ),
        GRAU5 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10) AS CODIGO1,
                'GRAU 5' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10),
                PREV,
                REAL
        )
        SELECT
            *
        FROM
            GRAU1
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU2
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU3
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU4
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU5
    ) --WHERE MES_ANO = '01-2023'
GROUP BY
    GRAU,
    CODIGO1
UNION
ALL
SELECT
    'TOTAL' AS GRAU,
    '0499999999' AS CODIGO1,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) AS PREV,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) AS REAL
FROM
    (
        WITH BAS AS (
            SELECT
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY') AS ANO,
                TO_CHAR(DTREF, 'MM') AS MES,
                TO_CHAR(DTREF, 'MM-YYYY') AS MES_ANO,
                ABS(SUM(PREVREC + (PREVDESP * -1))) AS PREV,
                ABS(SUM(REALREC + (REALDESP * -1))) AS REAL
            FROM
                AD_ORCFIN ORC
                INNER JOIN AD_ORCFINDET DET ON ORC.CODIGO = DET.CODIGO
                INNER JOIN TGFMET MET ON DET.CODNAT = MET.CODNAT
            WHERE
                CODMETA = 7
            GROUP BY
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY'),
                TO_CHAR(DTREF, 'MM'),
                TO_CHAR(DTREF, 'MM-YYYY')
        ),
        GRAU1 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000' AS CODIGO1,
                'GRAU 1' AS GRAU,
                PREV AS PREV,
                REAL AS REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000',
                PREV,
                REAL
        ),
        GRAU2 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000' AS CODIGO1,
                'GRAU 2' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000',
                PREV,
                REAL
        ),
        GRAU3 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000' AS CODIGO1,
                'GRAU 3' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000',
                PREV,
                REAL
        ),
        GRAU4 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00' AS CODIGO1,
                'GRAU 4' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00',
                PREV,
                REAL
        ),
        GRAU5 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10) AS CODIGO1,
                'GRAU 5' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10),
                PREV,
                REAL
        )
        SELECT
            *
        FROM
            GRAU1
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU2
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU3
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU4
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU5
    ) --WHERE MES_ANO = '01-2023'
UNION
ALL
SELECT
    'TOTAL' AS GRAU,
    '0599999999' AS CODIGO1,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) AS PREV,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) AS REAL
FROM
    (
        WITH BAS AS (
            SELECT
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY') AS ANO,
                TO_CHAR(DTREF, 'MM') AS MES,
                TO_CHAR(DTREF, 'MM-YYYY') AS MES_ANO,
                ABS(SUM(PREVREC + (PREVDESP * -1))) AS PREV,
                ABS(SUM(REALREC + (REALDESP * -1))) AS REAL
            FROM
                AD_ORCFIN ORC
                INNER JOIN AD_ORCFINDET DET ON ORC.CODIGO = DET.CODIGO
                INNER JOIN TGFMET MET ON DET.CODNAT = MET.CODNAT
            WHERE
                CODMETA = 7
            GROUP BY
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY'),
                TO_CHAR(DTREF, 'MM'),
                TO_CHAR(DTREF, 'MM-YYYY')
        ),
        GRAU1 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000' AS CODIGO1,
                'GRAU 1' AS GRAU,
                PREV AS PREV,
                REAL AS REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000',
                PREV,
                REAL
        ),
        GRAU2 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000' AS CODIGO1,
                'GRAU 2' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000',
                PREV,
                REAL
        ),
        GRAU3 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000' AS CODIGO1,
                'GRAU 3' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000',
                PREV,
                REAL
        ),
        GRAU4 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00' AS CODIGO1,
                'GRAU 4' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00',
                PREV,
                REAL
        ),
        GRAU5 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10) AS CODIGO1,
                'GRAU 5' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10),
                PREV,
                REAL
        )
        SELECT
            *
        FROM
            GRAU1
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU2
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU3
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU4
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU5
    ) --WHERE MES_ANO = '01-2023'
UNION
ALL
SELECT
    'TOTAL' AS GRAU,
    '0699999998' AS CODIGO1,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) + SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) + SUM(
        CASE
            WHEN CODIGO1 LIKE '0600000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) AS PREV,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) + SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) + SUM(
        CASE
            WHEN CODIGO1 LIKE '0600000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) AS REAL
FROM
    (
        WITH BAS AS (
            SELECT
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY') AS ANO,
                TO_CHAR(DTREF, 'MM') AS MES,
                TO_CHAR(DTREF, 'MM-YYYY') AS MES_ANO,
                ABS(SUM(PREVREC + (PREVDESP * -1))) AS PREV,
                ABS(SUM(REALREC + (REALDESP * -1))) AS REAL
            FROM
                AD_ORCFIN ORC
                INNER JOIN AD_ORCFINDET DET ON ORC.CODIGO = DET.CODIGO
                INNER JOIN TGFMET MET ON DET.CODNAT = MET.CODNAT
            WHERE
                CODMETA = 7
            GROUP BY
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY'),
                TO_CHAR(DTREF, 'MM'),
                TO_CHAR(DTREF, 'MM-YYYY')
        ),
        GRAU1 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000' AS CODIGO1,
                'GRAU 1' AS GRAU,
                PREV AS PREV,
                REAL AS REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000',
                PREV,
                REAL
        ),
        GRAU2 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000' AS CODIGO1,
                'GRAU 2' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000',
                PREV,
                REAL
        ),
        GRAU3 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000' AS CODIGO1,
                'GRAU 3' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000',
                PREV,
                REAL
        ),
        GRAU4 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00' AS CODIGO1,
                'GRAU 4' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00',
                PREV,
                REAL
        ),
        GRAU5 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10) AS CODIGO1,
                'GRAU 5' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10),
                PREV,
                REAL
        )
        SELECT
            *
        FROM
            GRAU1
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU2
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU3
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU4
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU5
    ) --WHERE MES_ANO = '01-2023'
UNION
ALL
SELECT
    'TOTAL' AS GRAU,
    '0699999999' AS CODIGO1,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0600000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) AS PREV,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0600000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) AS REAL
FROM
    (
        WITH BAS AS (
            SELECT
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY') AS ANO,
                TO_CHAR(DTREF, 'MM') AS MES,
                TO_CHAR(DTREF, 'MM-YYYY') AS MES_ANO,
                ABS(SUM(PREVREC + (PREVDESP * -1))) AS PREV,
                ABS(SUM(REALREC + (REALDESP * -1))) AS REAL
            FROM
                AD_ORCFIN ORC
                INNER JOIN AD_ORCFINDET DET ON ORC.CODIGO = DET.CODIGO
                INNER JOIN TGFMET MET ON DET.CODNAT = MET.CODNAT
            WHERE
                CODMETA = 7
            GROUP BY
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY'),
                TO_CHAR(DTREF, 'MM'),
                TO_CHAR(DTREF, 'MM-YYYY')
        ),
        GRAU1 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000' AS CODIGO1,
                'GRAU 1' AS GRAU,
                PREV AS PREV,
                REAL AS REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000',
                PREV,
                REAL
        ),
        GRAU2 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000' AS CODIGO1,
                'GRAU 2' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000',
                PREV,
                REAL
        ),
        GRAU3 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000' AS CODIGO1,
                'GRAU 3' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000',
                PREV,
                REAL
        ),
        GRAU4 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00' AS CODIGO1,
                'GRAU 4' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00',
                PREV,
                REAL
        ),
        GRAU5 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10) AS CODIGO1,
                'GRAU 5' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10),
                PREV,
                REAL
        )
        SELECT
            *
        FROM
            GRAU1
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU2
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU3
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU4
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU5
    ) --WHERE MES_ANO = '01-2023'
UNION
ALL
SELECT
    'TOTAL' AS GRAU,
    '0702999999' AS CODIGO1,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0600000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) + SUM(
        CASE
            WHEN CODIGO1 LIKE '0700000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) AS PREV,
    SUM(
        CASE
            WHEN CODIGO1 LIKE '0300000000'
            AND GRAU LIKE 'GRAU 1' THEN PREV
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0400000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0500000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) - SUM(
        CASE
            WHEN CODIGO1 LIKE '0600000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) + SUM(
        CASE
            WHEN CODIGO1 LIKE '0700000000'
            AND GRAU LIKE 'GRAU 1' THEN REAL
        END
    ) AS REAL
FROM
    (
        WITH BAS AS (
            SELECT
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY') AS ANO,
                TO_CHAR(DTREF, 'MM') AS MES,
                TO_CHAR(DTREF, 'MM-YYYY') AS MES_ANO,
                ABS(SUM(PREVREC + (PREVDESP * -1))) AS PREV,
                ABS(SUM(REALREC + (REALDESP * -1))) AS REAL
            FROM
                AD_ORCFIN ORC
                INNER JOIN AD_ORCFINDET DET ON ORC.CODIGO = DET.CODIGO
                INNER JOIN TGFMET MET ON DET.CODNAT = MET.CODNAT
            WHERE
                CODMETA = 7
            GROUP BY
                ORC.CODIGO,
                TO_CHAR(DTREF, 'YYYY'),
                TO_CHAR(DTREF, 'MM'),
                TO_CHAR(DTREF, 'MM-YYYY')
        ),
        GRAU1 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000' AS CODIGO1,
                'GRAU 1' AS GRAU,
                PREV AS PREV,
                REAL AS REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 2) || '00000000',
                PREV,
                REAL
        ),
        GRAU2 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000' AS CODIGO1,
                'GRAU 2' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 4) || '000000',
                PREV,
                REAL
        ),
        GRAU3 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000' AS CODIGO1,
                'GRAU 3' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 6) || '0000',
                PREV,
                REAL
        ),
        GRAU4 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00' AS CODIGO1,
                'GRAU 4' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 8) || '00',
                PREV,
                REAL
        ),
        GRAU5 AS (
            SELECT
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10) AS CODIGO1,
                'GRAU 5' AS GRAU,
                PREV,
                REAL
            FROM
                BAS
            GROUP BY
                ANO,
                MES,
                MES_ANO,
                SUBSTR(LPAD(CODIGO, 10, '0'), 1, 10),
                PREV,
                REAL
        )
        SELECT
            *
        FROM
            GRAU1
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU2
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU3
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU4
        UNION
        ALL
        SELECT
            *
        FROM
            GRAU5
    ) --WHERE MES_ANO = '01-2023'