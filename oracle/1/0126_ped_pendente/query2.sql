-- Query para calcular tempo entre dtfatur1 (inicial) e A.DTFATUR (final)
-- Considerando dias úteis (segunda a sexta) e horário comercial (8h às 18h)
-- Excluindo feriados oficiais
WITH FERIADOS AS (
    -- Feriados oficiais a serem desconsiderados (formato DD/MM)
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
BASE_DATA AS (
    SELECT 
        A.NUNOTA,
        A.DTFATUR,
        VAR.NUNOTAORIG,
        cab1.dtfatur AS dtfatur1
    FROM a
    LEFT JOIN TGFVAR VAR ON A.NUNOTA = VAR.NUNOTA
    LEFT JOIN TGFCAB cab1 ON VAR.NUNOTAORIG = cab1.nunota
),
CALC_HORAS AS (
    SELECT 
        NUNOTA,
        DTFATUR,
        NUNOTAORIG,
        dtfatur1,
        -- Calcular horas úteis entre as duas datas
        CASE 
            WHEN dtfatur1 IS NULL OR DTFATUR IS NULL THEN NULL
            WHEN dtfatur1 > DTFATUR THEN NULL -- Data inicial maior que final
            ELSE (
                -- Se é o mesmo dia útil
                CASE 
                    WHEN TRUNC(dtfatur1) = TRUNC(DTFATUR) THEN
                        CASE 
                            -- Verificar se é dia útil (2=segunda, 3=terça, 4=quarta, 5=quinta, 6=sexta) e não é feriado
                            WHEN TO_NUMBER(TO_CHAR(dtfatur1, 'D')) BETWEEN 2 AND 6 
                                 AND NOT EXISTS (
                                     SELECT 1 FROM FERIADOS 
                                     WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dtfatur1, 'DD/MM')
                                 ) THEN
                                -- Calcular horas dentro do horário comercial (8h às 18h)
                                GREATEST(0, 
                                    LEAST(18, TO_NUMBER(TO_CHAR(DTFATUR, 'HH24')) + TO_NUMBER(TO_CHAR(DTFATUR, 'MI'))/60) 
                                    - GREATEST(8, TO_NUMBER(TO_CHAR(dtfatur1, 'HH24')) + TO_NUMBER(TO_CHAR(dtfatur1, 'MI'))/60)
                                )
                            ELSE 0
                        END
                    -- Se são dias diferentes
                    ELSE
                        -- Horas do primeiro dia (se for dia útil e não for feriado)
                        CASE 
                            WHEN TO_NUMBER(TO_CHAR(dtfatur1, 'D')) BETWEEN 2 AND 6 
                                 AND NOT EXISTS (
                                     SELECT 1 FROM FERIADOS 
                                     WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dtfatur1, 'DD/MM')
                                 ) THEN
                                GREATEST(0, 18 - GREATEST(8, TO_NUMBER(TO_CHAR(dtfatur1, 'HH24')) + TO_NUMBER(TO_CHAR(dtfatur1, 'MI'))/60))
                            ELSE 0
                        END +
                        -- Horas dos dias intermediários (apenas dias úteis completos, excluindo feriados)
                        CASE 
                            WHEN TRUNC(DTFATUR) - TRUNC(dtfatur1) <= 1 THEN 0
                            ELSE (
                                SELECT NVL(SUM(10), 0) -- 10 horas por dia útil (8h às 18h)
                                FROM (
                                    SELECT TRUNC(dtfatur1) + LEVEL AS dia_intermediario
                                    FROM DUAL
                                    CONNECT BY LEVEL < TRUNC(DTFATUR) - TRUNC(dtfatur1)
                                )
                                WHERE TO_NUMBER(TO_CHAR(dia_intermediario, 'D')) BETWEEN 2 AND 6
                                  AND NOT EXISTS (
                                      SELECT 1 FROM FERIADOS 
                                      WHERE FERIADOS.dia_mes_feriado = TO_CHAR(dia_intermediario, 'DD/MM')
                                  )
                            )
                        END +
                        -- Horas do último dia (se for dia útil e não for feriado)
                        CASE 
                            WHEN TO_NUMBER(TO_CHAR(DTFATUR, 'D')) BETWEEN 2 AND 6 
                                 AND NOT EXISTS (
                                     SELECT 1 FROM FERIADOS 
                                     WHERE FERIADOS.dia_mes_feriado = TO_CHAR(DTFATUR, 'DD/MM')
                                 ) THEN
                                GREATEST(0, LEAST(18, TO_NUMBER(TO_CHAR(DTFATUR, 'HH24')) + TO_NUMBER(TO_CHAR(DTFATUR, 'MI'))/60) - 8)
                            ELSE 0
                        END
                END
            )
        END AS HORAS_UTEIS
    FROM BASE_DATA
)
SELECT 
    NUNOTA,
    DTFATUR,
    NUNOTAORIG,
    dtfatur1,
    -- Coluna indicando se está em 4h
    CASE 
        WHEN HORAS_UTEIS IS NULL THEN NULL
        WHEN HORAS_UTEIS <= 4 THEN 'SIM'
        ELSE 'NÃO'
    END AS EM_4H,
    -- Coluna indicando se está em 7h
    CASE 
        WHEN HORAS_UTEIS IS NULL THEN NULL
        WHEN HORAS_UTEIS <= 7 THEN 'SIM'
        ELSE 'NÃO'
    END AS EM_7H,
    -- Coluna indicando se está acima de 24h
    CASE 
        WHEN HORAS_UTEIS IS NULL THEN NULL
        WHEN HORAS_UTEIS > 24 THEN 'SIM'
        ELSE 'NÃO'
    END AS ACIMA_24H,
    -- Coluna adicional mostrando as horas úteis calculadas (opcional, para debug/verificação)
    HORAS_UTEIS
FROM CALC_HORAS;
