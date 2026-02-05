-- Query consolidada por MÊS/ANO para TPRIATV
-- Participação efetiva disponível por mês/ano
-- Horas efetivas de produção, horas disponíveis (8h-18h úteis) e participação efetivo/disponível
-- Considerando dias úteis (segunda a sexta) e horário comercial (8h às 18h)
-- Excluindo feriados oficiais
WITH FERIADOS AS (
    SELECT '01/01' AS dia_mes_feriado FROM DUAL
    UNION ALL SELECT '03/04' FROM DUAL
    UNION ALL SELECT '21/04' FROM DUAL
    UNION ALL SELECT '01/05' FROM DUAL
    UNION ALL SELECT '07/09' FROM DUAL
    UNION ALL SELECT '12/10' FROM DUAL
    UNION ALL SELECT '02/11' FROM DUAL
    UNION ALL SELECT '20/11' FROM DUAL
    UNION ALL SELECT '25/12' FROM DUAL
),
MESES AS (
    SELECT
        TO_NUMBER(TO_CHAR(mes_ref, 'YYYY')) AS ANO,
        TO_NUMBER(TO_CHAR(mes_ref, 'MM')) AS MES,
        TRUNC(mes_ref, 'MM') AS DATA_INICIO,
        LAST_DAY(mes_ref) AS DATA_FIM
    FROM (
        SELECT ADD_MONTHS(TO_DATE('01/01/2026','DD/MM/YYYY'), LEVEL - 1) AS mes_ref
        FROM DUAL
        CONNECT BY ADD_MONTHS(TO_DATE('01/01/2026','DD/MM/YYYY'), LEVEL - 1) <= TO_DATE('31/12/2026','DD/MM/YYYY')
    )
),
BASE AS (
    SELECT
        m.ANO,
        m.MES,
        m.DATA_INICIO,
        m.DATA_FIM,
        t.DHINICIO,
        t.DHFINAL
    FROM MESES m
    JOIN TPRIATV t
      ON t.DHINCLUSAO >= m.DATA_INICIO
     AND t.DHINCLUSAO <= m.DATA_FIM
     AND t.DHINICIO IS NOT NULL
     AND t.DHFINAL IS NOT NULL
),
CALC_EFETIVAS AS (
    SELECT
        ANO,
        MES,
        DHINICIO,
        DHFINAL,
        CASE
            WHEN DHINICIO IS NULL OR DHFINAL IS NULL THEN 0
            WHEN DHINICIO > DHFINAL THEN 0
            ELSE (
                CASE
                    WHEN TRUNC(DHINICIO) = TRUNC(DHFINAL) THEN
                        CASE
                            WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                 AND NOT EXISTS (
                                     SELECT 1 FROM FERIADOS
                                     WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')
                                 ) THEN
                                GREATEST(0,
                                    LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60)
                                    - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60)
                                )
                            ELSE 0
                        END
                    ELSE
                        CASE
                            WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6
                                 AND NOT EXISTS (
                                     SELECT 1 FROM FERIADOS
                                     WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')
                                 ) THEN
                                GREATEST(0, 18 - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                            ELSE 0
                        END +
                        CASE
                            WHEN TRUNC(DHFINAL) - TRUNC(DHINICIO) <= 1 THEN 0
                            ELSE (
                                SELECT NVL(SUM(10), 0)
                                FROM (
                                    SELECT TRUNC(DHINICIO) + LEVEL AS dia_intermediario
                                    FROM DUAL
                                    CONNECT BY LEVEL < TRUNC(DHFINAL) - TRUNC(DHINICIO)
                                )
                                WHERE TO_NUMBER(TO_CHAR(dia_intermediario, 'D')) BETWEEN 2 AND 6
                                  AND NOT EXISTS (
                                      SELECT 1 FROM FERIADOS
                                      WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dia_intermediario, 'DD/MM')
                                  )
                            )
                        END +
                        CASE
                            WHEN TO_NUMBER(TO_CHAR(DHFINAL, 'D')) BETWEEN 2 AND 6
                                 AND NOT EXISTS (
                                     SELECT 1 FROM FERIADOS
                                     WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHFINAL, 'DD/MM')
                                 ) THEN
                                GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DHFINAL, 'HH24')) + TO_NUMBER(TO_CHAR(DHFINAL, 'MI'))/60) - 8)
                            ELSE 0
                        END
                END
            )
        END AS HORAS_EFETIVAS
    FROM BASE
),
HORAS_DISPONIVEIS_CALC AS (
    SELECT
        m.ANO,
        m.MES,
        NVL((
            SELECT SUM(10)
            FROM (
                SELECT m.DATA_INICIO + LEVEL - 1 AS dia
                FROM DUAL
                CONNECT BY LEVEL <= (m.DATA_FIM - m.DATA_INICIO + 1)
            ) dias
            WHERE TO_NUMBER(TO_CHAR(dias.dia, 'D')) BETWEEN 2 AND 6
              AND NOT EXISTS (
                  SELECT 1 FROM FERIADOS
                  WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dias.dia, 'DD/MM')
              )
        ), 0) AS HORAS_DISPONIVEIS
    FROM MESES m
)
SELECT
    c.ANO,
    c.MES,
    LPAD(c.MES, 2, '0') || '/' || c.ANO AS MES_ANO,
    SUM(c.HORAS_EFETIVAS) AS HORAS_EFETIVAS_PRODUCAO,
    d.HORAS_DISPONIVEIS AS HORAS_DISPONIVEIS_PRODUCAO,
    ROUND(SUM(c.HORAS_EFETIVAS) / NULLIF(d.HORAS_DISPONIVEIS, 0) * 100, 2) || '%' AS PARTICIPACAO_EFETIVO_DISPONIVEL
FROM CALC_EFETIVAS c
JOIN HORAS_DISPONIVEIS_CALC d ON d.ANO = c.ANO AND d.MES = c.MES
GROUP BY c.ANO, c.MES, d.HORAS_DISPONIVEIS
ORDER BY c.ANO, c.MES;
