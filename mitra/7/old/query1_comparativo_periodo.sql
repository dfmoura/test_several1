-- VLRLANC        = valor atual: soma em que REFERENCIA <= data de referência.
-- VLRLANC_ANTERIOR = mesmo critério no ano anterior: REFERENCIA <= mesmo dia/mês do ano anterior
--   (Oracle: ADD_MONTHS(data_ref, -12)).
--
-- Ex.: data_ref = 01/12/2025 -> atual <= 01/12/2025 ; anterior <= 01/12/2024
--
-- Se REFERENCIA for VARCHAR2, troque LAN.REFERENCIA por TO_DATE(LAN.REFERENCIA, 'DD/MM/YYYY')
-- nas comparações e no WHERE (ajuste a máscara ao layout real da coluna).

WITH params AS (
    SELECT TO_DATE('01/12/2025', 'DD/MM/YYYY') AS data_ref FROM dual
)
SELECT
    PLA.CTACTB,
    SUM(
        CASE
            WHEN LAN.REFERENCIA <= p.data_ref
            THEN CASE WHEN LAN.TIPLANC = 'R' THEN LAN.VLRLANC * -1 ELSE LAN.VLRLANC END
            ELSE 0
        END
    ) AS VLRLANC,
    SUM(
        CASE
            WHEN LAN.REFERENCIA <= ADD_MONTHS(p.data_ref, -12)
            THEN CASE WHEN LAN.TIPLANC = 'R' THEN LAN.VLRLANC * -1 ELSE LAN.VLRLANC END
            ELSE 0
        END
    ) AS VLRLANC_ANTERIOR
FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON LAN.CODCTACTB = PLA.CODCTACTB
CROSS JOIN params p
WHERE LAN.CODEMP = 999
  AND LAN.REFERENCIA <= p.data_ref
GROUP BY
    PLA.CTACTB;

/*
-- Versão com bind (substitua :DATA_REF ao executar):
WITH params AS (
    SELECT :DATA_REF AS data_ref FROM dual
)
SELECT
    PLA.CTACTB,
    SUM(
        CASE
            WHEN LAN.REFERENCIA <= p.data_ref
            THEN CASE WHEN LAN.TIPLANC = 'R' THEN LAN.VLRLANC * -1 ELSE LAN.VLRLANC END
            ELSE 0
        END
    ) AS VLRLANC,
    SUM(
        CASE
            WHEN LAN.REFERENCIA <= ADD_MONTHS(p.data_ref, -12)
            THEN CASE WHEN LAN.TIPLANC = 'R' THEN LAN.VLRLANC * -1 ELSE LAN.VLRLANC END
            ELSE 0
        END
    ) AS VLRLANC_ANTERIOR
FROM TCBLAN LAN
INNER JOIN TCBPLA PLA ON LAN.CODCTACTB = PLA.CODCTACTB
CROSS JOIN params p
WHERE LAN.CODEMP = 999
  AND LAN.REFERENCIA <= p.data_ref
GROUP BY
    PLA.CTACTB;
*/
