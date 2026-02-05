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

SELECT A.NUNOTA,A.DTFATUR,VAR.NUNOTAORIG,cab1.dtfatur dtfatur1,a.codvend,a.apelido,a.codparc,a.nomeparc
FROM (
SELECT DISTINCT NUNOTA,NUMNOTA,DTFATUR,CODVEND,APELIDO,CODPARC,NOMEPARC
FROM (
    SELECT
        CAB.DTMOV,
          CAB.DTNEG,
          
          CAB.DTFATUR,
        
          CAB.NUNOTA,
        
          CAB.NUMNOTA,
        
          CAB.NUNOTA || ' / ' || CAB.NUMNOTA AS NRO,
        
          CAB.CODEMP,
        
          CAB.AD_OBSINTERNA,
        
          EMP.RAZAOSOCIAL AS EMPRESA,
        
          EMP.CODEMP || '-' || EMP.RAZAOSOCIAL AS EMP,
        
          EMP.CODEMP || '-' || EMP.RAZAOABREV AS NOMEFANTASIAEMP,
        
          EMP.CGC AS CPFCNPJ,
        
          EMP.INSCESTAD AS IE,
        
          EMP.TELEFONE AS TEL,
        
          EMP.FAX AS FAX,
        
          CAB.CODVEND,
        
          VEN.APELIDO,
        
          CAB.CODVEND || ' - ' || VEN.APELIDO AS VEND,
        
          VEN.CODGER,
        
          CAB.CODPARC,
        
          PAR.RAZAOSOCIAL AS PARCEIRO,
        
          CAB.CODPARC || ' - ' || PAR.NOMEPARC AS PARC,
        
          PAR.NOMEPARC,
        
          UFS.UF || ' - ' || UFS.DESCRICAO AS UF,
        
          ITE.CODPROD || ' - ' || PRO.DESCRPROD AS PROD,
        
          ITE.CODPROD AS CODPROD,
        
          PRO.DESCRPROD AS DESCRPROD,
        
          MAR.DESCRICAO AS MARCA,
        
          CASE
             
        WHEN MAR.DESCRICAO IS NULL THEN 'MARCA NÃO CADASTRADA'
             
        ELSE MAR.DESCRICAO
          END
             AS MARCA1,
        
          GRU.CODGRUPOPROD,
        
          GRU.DESCRGRUPOPROD,
        
          ITE.CODVOL AS VOL,
        
          CAB.CODTIPOPER,
        
          CAB.CODTIPOPER || '-' || TOP.DESCROPER AS TOP,
        
          TOP.DESCROPER,
        
          TOP.ATUALEST,
        
          TOP.ATUALFIN,
        
          TOP.TIPATUALFIN,
        
          CAB.STATUSNFE,
        
          CAB.TIPMOV,
        
          TOP.BONIFICACAO,
        
          CAB.CODCENCUS,
        
          CUS.AD_APELIDO,
        
          CUS.DESCRCENCUS,
        
          PRO.AD_QTDVOLLT,
        
          CASE
             
        WHEN CAB.TIPMOV = 'D' THEN (ITE.QTDNEG * PRO.AD_QTDVOLLT) * -1
             
        ELSE (ITE.QTDNEG * PRO.AD_QTDVOLLT)
          END
             AS QTD,
        
          CASE
             
        WHEN CAB.TIPMOV = 'D'
             THEN
                (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED) * -1
             ELSE
                (ITE.VLRTOT - ITE.VLRDESC - ITE.VLRREPRED)
          END
             AS VLR,
        
          CASE
             
        WHEN CAB.TIPMOV = 'D'
             THEN
                (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
             ELSE
                (CUS1.CUSSEMICM * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
          END
             AS VLRCUSICM1,
        
          CASE
             
        WHEN CAB.TIPMOV = 'D'
             THEN
                (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT)) * -1
             ELSE
                (CUS1.CUSGER * (ITE.QTDNEG * PRO.AD_QTDVOLLT))
          END
             AS VLRCUSGER1,
        
          CASE
             
        WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSSEMICM * ITE.QTDNEG) * -1
             
        ELSE (CUS1.CUSSEMICM * ITE.QTDNEG)
          END
             AS VLRCUSICM2,
        
          CASE
             
        WHEN CAB.TIPMOV = 'D' THEN (CUS1.CUSGER * ITE.QTDNEG) * -1
             
        ELSE (CUS1.CUSGER * ITE.QTDNEG)
          END
             AS VLRCUSGER2,
        
             
(ITE.VLRUNIT - (ITE.VLRDESC / NULLIF(ITE.QTDNEG,
        0)) - (ITE.VLRREPRED/NULLIF(ITE.QTDNEG,
        0))) AS VLRUNIT_LIQ,
        

CASE 
        WHEN NVL(SNK_PRECO(PAR.CODTAB,
        PRO.CODPROD),
        0) = 0
    THEN SNK_PRECO(0,
        PRO.CODPROD) 
    
        ELSE SNK_PRECO(PAR.CODTAB,
        PRO.CODPROD)
END AS PRECO_TAB,
        
    

ITE.VLRICMS,
        
    
ITE.QTDNEG AS QTDNEG,
        
    
    ITE.SEQUENCIA,
        
    
    ITE.VLRUNIT             
             
     
    FROM
        TSIEMP EMP
          
    INNER JOIN
        TGFCAB CAB
             
            ON (
                EMP.CODEMP = CAB.CODEMP
            )
          
    LEFT JOIN
        TGFVEN VEN
             
            ON (
                CAB.CODVEND = VEN.CODVEND
            )
          
    INNER JOIN
        TGFPAR PAR
             
            ON (
                CAB.CODPARC = PAR.CODPARC
            )
          
    INNER JOIN
        TSICID CID
             
            ON (
                PAR.CODCID = CID.CODCID
            )
          
    INNER JOIN
        TSIUFS UFS
             
            ON (
                CID.UF = UFS.CODUF
            )
          
    INNER JOIN
        TGFITE ITE
             
            ON (
                CAB.NUNOTA = ITE.NUNOTA
            )
          
    INNER JOIN
        TGFPRO PRO
             
            ON (
                ITE.CODPROD = PRO.CODPROD
            )
          
    LEFT JOIN
        TGFMAR MAR
             
            ON (
                MAR.DESCRICAO = PRO.MARCA
            )
          
    LEFT JOIN
        TGFGRU GRU
             
            ON (
                MAR.AD_GRUPOPROD = GRU.CODGRUPOPROD
            )
          
    INNER JOIN
        TSICUS CUS
             
            ON (
                CUS.CODCENCUS = CAB.CODCENCUS
            )
          
    INNER JOIN
        TGFTOP TOP
             
            ON (
                CAB.CODTIPOPER = TOP.CODTIPOPER
                 
                AND CAB.DHTIPOPER = (
                    SELECT
                        MAX (TOP.DHALTER)
                                        
                FROM
                    TGFTOP
                                       
                WHERE
                    CODTIPOPER = TOP.CODTIPOPER
            )
        )
          
    LEFT JOIN
        TGFCUS CUS1
             
            ON     CUS1.CODPROD = ITE.CODPROD
                
            AND CUS1.CODEMP = CAB.CODEMP
                
            AND CUS1.DTATUAL <= CAB.DTNEG
    /*
    LEFT JOIN
        TGFCUS CUS1 
            ON (
                CUS1.CODPROD=ITE.CODPROD 
                AND CUS1.CODEMP=CAB.CODEMP
            )*/
    
    WHERE
        (
            TOP.ATUALEST <> 'N'
        )
          
        AND (
            (
                TOP.ATUALFIN <> 0 
                AND TOP.TIPATUALFIN = 'I'
            )
               
            OR (
                TOP.CODTIPOPER IN (
                    1112, 1113
                )
            )
               
            OR TOP.BONIFICACAO = 'S'
        )
          
        AND CAB.TIPMOV IN (
            'V', 'D'
        )
          
        AND CAB.STATUSNOTA = 'L'
          
        AND (
            CAB.STATUSNFE = 'A'
               
            OR CAB.STATUSNFE = 'T'
               
            OR CAB.STATUSNFE = 'S'
               
            OR CAB.STATUSNFE IS NULL
        )
          
        AND (
            CUS1.DTATUAL =
                  (
                SELECT
                    MAX (C.DTATUAL)
                     
                FROM
                    TGFCUS C
                    
                WHERE
                    C.CODPROD = ITE.CODPROD
                          
                    AND C.DTATUAL <= CAB.DTNEG
                          
                    AND C.CODEMP = CAB.CODEMP
            )
               
            OR CUS1.DTATUAL IS NULL
        )
)

WHERE 
DTMOV BETWEEN '01/01/2026' AND '31/12/2026') A
LEFT JOIN (
    SELECT NUNOTA,
           NUNOTAORIG
    FROM (
        SELECT
            VAR.*,
            ROW_NUMBER() OVER (
                PARTITION BY VAR.NUNOTA
                ORDER BY VAR.nunota DESC
            ) RN
        FROM TGFVAR VAR
    )
    WHERE RN = 1
) VAR ON A.NUNOTA = VAR.NUNOTA
left join tgfcab cab1 on VAR.NUNOTAORIG = cab1.nunota



),
CALC_HORAS AS (
    SELECT 
        NUNOTA,
        DTFATUR,
        NUNOTAORIG,
        dtfatur1,
        CODVEND,
        APELIDO,
        CODPARC,
        NOMEPARC,
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
    CODVEND,
    APELIDO,
    CODPARC,
    NOMEPARC,
    -- Coluna indicando se está em 4h
    CASE 
        WHEN HORAS_UTEIS IS NULL THEN NULL
        WHEN HORAS_UTEIS <= 4 THEN 'SIM'
        ELSE 'NÃO'
    END AS EM_4H,

    -- Coluna indicando se está entre > 4h e <= 7h
    CASE 
        WHEN HORAS_UTEIS IS NULL THEN NULL
        WHEN HORAS_UTEIS > 4 AND HORAS_UTEIS <= 7 THEN 'SIM'
        ELSE 'NÃO'
    END AS EM_7H,

    -- Coluna indicando se está acima de 24h
    CASE 
        WHEN HORAS_UTEIS IS NULL THEN NULL
        WHEN HORAS_UTEIS > 24 THEN 'SIM'
        ELSE 'NÃO'
    END AS ACIMA_24H,

    -- Coluna adicional mostrando as horas úteis calculadas
    HORAS_UTEIS
FROM CALC_HORAS