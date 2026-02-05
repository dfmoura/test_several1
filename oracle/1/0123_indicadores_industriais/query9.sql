-- Query para TPRIATV com coluna de horas efetivas de produção
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
BASE AS (
    SELECT *
    FROM TPRIATV
    WHERE DHINCLUSAO BETWEEN '01/01/2026' AND '31/01/2026'
      AND DHINICIO IS NOT NULL AND DHFINAL IS NOT NULL
)
SELECT 
    BASE.*,
    -- Horas efetivas de produção (dias úteis, 8h às 18h)
    CASE 
        WHEN DHINICIO IS NULL OR DHFINAL IS NULL THEN NULL
        WHEN DHINICIO > DHFINAL THEN NULL
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
                    -- Horas do primeiro dia
                    CASE 
                        WHEN TO_NUMBER(TO_CHAR(DHINICIO, 'D')) BETWEEN 2 AND 6 
                             AND NOT EXISTS (
                                 SELECT 1 FROM FERIADOS 
                                 WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DHINICIO, 'DD/MM')
                             ) THEN
                            GREATEST(0, 18 - GREATEST(8, TO_NUMBER(TO_CHAR(DHINICIO, 'HH24')) + TO_NUMBER(TO_CHAR(DHINICIO, 'MI'))/60))
                        ELSE 0
                    END +
                    -- Horas dos dias intermediários (10h por dia útil)
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
                    -- Horas do último dia
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
    END AS HORAS_EFETIVAS_PRODUCAO
FROM BASE