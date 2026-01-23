    SELECT
        DISTINCT
          X.NUNOTA,
        
          CASE
             
        WHEN X.PED_BRINDE = 0
             THEN
                CASE
                   
        WHEN X.STATUS = 'R'
                        
        AND TRUNC (SYSDATE)
                            - (SELECT
            TRUNC (
                                         MAX (
                                            DHLIB))
                                 
        FROM
            TSILIB
                                
        WHERE
            NUCHAVE =
                                         X.
                                          NUNOTA) > 5 THEN 'ENC'
                   
        WHEN X.STATUS = 'C'
                        
        AND TRUNC (SYSDATE)
                            - (SELECT
            TRUNC (DTALTER)
                                 
        FROM
            TGFCAB
                                
        WHERE
            NUNOTA = X.NUNOTA) > 5 THEN 'ENC'
                   
        ELSE X.STATUS
                END
             
        WHEN     X.PED_BRINDE > 0
                  
        AND (SELECT
            AD_DTENTREGAEFETIVA
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA)
                         IS NOT NULL
                  
        AND TRUNC (SYSDATE)
                      - TRUNC ( (SELECT
            AD_DTENTREGAEFETIVA
                                   
        FROM
            TGFCAB
                                  
        WHERE
            NUNOTA = X.NUNOTA)) > 5
             THEN
                'ENC'                                       --PEDIDO ENCERRADO
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            AD_DTENTREGAEFETIVA
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA)
                         IS NOT NULL
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TGFVAR
                        
        WHERE
            NUNOTAORIG = X.NUNOTA) > 0
             THEN
                'ME'                                     --MERCADORIA ENTREGUE
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            AD_DTENTREGAPREV
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA)
                         IS NOT NULL
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TGFVAR
                        
        WHERE
            NUNOTAORIG = X.NUNOTA) > 0
             THEN
                'MA'                                    --MERCADORIA A CAMINHO
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            AD_DTENTREGAPREV
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA)
                         IS NOT NULL
                  
        AND (SELECT
            ORDEMCARGA
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) <> 0
                  
        AND (SELECT
            PENDENTE
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) = 'N'
             THEN
                'PE'                                     --PREVISÃO DE ENTREGA
             
        WHEN     X.PED_BRINDE > 0
                  
        AND (SELECT
            ORDEMCARGA
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) <> 0
                  
        AND (SELECT
            PENDENTE
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) = 'S'
             THEN
                'ANF'                                          --AGUARDANDO NF
             
        WHEN     X.PED_BRINDE > 0
                  
        AND (SELECT
            ORDEMCARGA
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) <> 0
                  
        AND (SELECT
            PENDENTE
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) = 'N'
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TGFVAR
                        
        WHERE
            NUNOTAORIG = X.NUNOTA) = 0
             THEN
                'ANF'                                          --AGUARDANDO NF
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TGFVAR
                        
        WHERE
            NUNOTAORIG = X.NUNOTA) > 0
             THEN
                'NFE'
             
        WHEN     X.PED_BRINDE > 0
                  
        AND (SELECT
            ORDEMCARGA
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) <> 0
                  
        AND (SELECT
            PENDENTE
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) = 'S'
             THEN
                'PS'                                     --PEDIDO EM SEPARAÇÃO
             
        WHEN     X.PED_BRINDE > 0
                  
        AND (SELECT
            PENDENTE
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA) = 'N'
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TSILIB
                        
        WHERE
            NUCHAVE = X.NUNOTA 
            AND REPROVADO = 'S') > 0
             THEN
                'R'                                                --REJEITADO
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TSILIB
                        
        WHERE
            NUCHAVE = X.NUNOTA) =
                         (SELECT
            COUNT (*)
                            
        FROM
            TSILIB
                           
        WHERE
            NUCHAVE = X.NUNOTA
                                 
            AND VLRLIBERADO >= VLRATUAL
                                 
            AND NVL (REPROVADO, 'N') = 'N')
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TSILIB
                        
        WHERE
            NUCHAVE = X.NUNOTA) > 0
             THEN
                'A'                                                  --APROVAD
             ELSE
                'EE'
          END
             AS STATUS,
        
          CASE
             
        WHEN X.PED_BRINDE = 0 
        AND X.STATUS <> 'R'
             THEN
                X.COMENTARIO
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            AD_DTENTREGAEFETIVA
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA)
                         IS NOT NULL
             THEN
                'Dt.Entrega Efetiva: '
                || TO_CHAR ( (SELECT
            AD_DTENTREGAEFETIVA
                                
        FROM
            TGFCAB
                               
        WHERE
            NUNOTA = X.NUNOTA),
        'DD/MM/YYYY') --ENTREGA EFETIVA
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            AD_DTENTREGAPREV
                         
        FROM
            TGFCAB
                        
        WHERE
            NUNOTA = X.NUNOTA)
                         IS NOT NULL
             THEN
                'Dt.Entrega Prevista: '
                || TO_CHAR ( (SELECT
            AD_DTENTREGAPREV
                                
        FROM
            TGFCAB
                               
        WHERE
            NUNOTA = X.NUNOTA),
        'DD/MM/YYYY') --PREVISÃO DE ENTREGA
             
        WHEN X.PED_BRINDE > 0
                  
        AND (SELECT
            COUNT (*)
                         
        FROM
            TGFVAR
                        
        WHERE
            NUNOTAORIG = X.NUNOTA) > 0
             THEN
                'Dt.Emissão NFe: '
                || TO_CHAR ( (SELECT
            DTMOV
                                
        FROM
            TGFCAB
                               
        WHERE
            NUNOTA = X.NUNOTA),
        'DD/MM/YYYY') --NFE EMITIDA
             
        WHEN X.STATUS = 'R'                     --COMENTÁRIO NF REJEITADA
             THEN
                (SELECT
            LISTAGG (
                              'Dt. Rejeição: '
                           || TO_CHAR (LIB.DHLIB,
            'DD/MM/YYYY HH24:MI')
                           || ' - Usuário Reprovador: '
                           || USU.NOMEUSU
                           || ' - Obs. Reprovação: '
                           || LIB.OBSLIB,
            
                           CHR (10))
                        WITHIN 
        GROUP (ORDER BY
            LIB.DHLIB)
                   
        FROM
            TSILIB LIB
                        JOIN
                           TSIUSU USU
                        
                ON USU.CODUSU = LIB.CODUSULIB
                  
        WHERE
            LIB.NUCHAVE = X.NUNOTA 
            AND LIB.REPROVADO = 'S')
          END
             AS COMENTARIO,
        
          X.PERC_FATURADO
     
    FROM
        (SELECT
            -- O TRATAMENTO FOI FEITO PARA A APURAÇÃO E APRESENTAÇÃO DE PEDIDOS COM PARCIAIS E PEDIDOS SEM PARCIAIS.
                 VGF_2.NUNOTA,
            
                  (SELECT
                COUNT (*)
                     
            FROM
                TGFCAB
                    
            WHERE
                NUNOTA = VGF_2.NUNOTA 
                AND CODTIPOPER = 10010)
                     AS PED_BRINDE,
            
                  CASE
                     
            WHEN (VGF_2.STATUS = 'ME' 
            OR VGF_2.STATUS = 'ENC')
                          
            AND VGF_3.NUPED_ORIG IS NOT NULL -- TRATAMENTO DO STATUS PARA QUANDO O PEDIDO HOUVE PEDIDO PARCIAL,
            PARA QUE QUANDO O PEDIDO ORIGINAL FOR FINALIZADO,
            AO INVES DE FINALIZAR O STATUS,
            ELE IRA APRESENTAR OS STATUS DO PEDIDO PARCIAL.
                     THEN
                        (CASE
                            
            WHEN VGF_3.STATUS = 'ME'
                                 
            AND (SELECT
                (TRUNC (SYSDATE)
                                              - AD_DTENTREGAEFETIVA)
                                        
            FROM
                TGFCAB
                                       
            WHERE
                NUNOTA = VGF_3.NUNOTA) > 5
                            THEN
                               'ENC'
                            ELSE
                               VGF_3.STATUS
                         
        END)
                     ELSE
                        VGF_2.STATUS
                  END
                     AS STATUS,
        
                  CASE -- O CAMPO DE COMENTARIO IRA VERIFICAR SE O PEDIDO FOI FINALIZADO E SE POSSUI UM PEDIDO PARCIAL LIGADO A ELE,
            CASO HAJA,
            ELE NÃO IRA APRESENTAR O COMENTARIO DE FINANLIZAÇÃO DO PEDIDO ORIGINAL E SIM OS COMENTARIOS AGREGADOS DO ORIGINAL E PARCIAL.
                     
            WHEN (VGF_2.STATUS = 'ME' 
            OR VGF_2.STATUS = 'ENC')
                          
            AND VGF_3.NUPED_ORIG IS NOT NULL
                     THEN
                        (CASE
                            
            WHEN VGF_3.COMENTARIO IS NULL
                            THEN
                                  (SELECT
                AD_REFFORCA
                                     
            FROM
                TGFCAB
                                    
            WHERE
                NUNOTA = VGF_3.NUNOTA)
                               || '-'
                               || 'Aguardando pedido parcial Nro:'
                               || VGF_3.NUNOTA
                            ELSE
                                  (SELECT
                AD_REFFORCA
                                     
            FROM
                TGFCAB
                                    
            WHERE
                NUNOTA = VGF_3.NUNOTA)
                               || ' - '
                               || VGF_3.COMENTARIO
                         
        END)
                     ELSE
                        VGF_2.COMENTARIO
                  END
                     AS COMENTARIO,
        
                  -- A PORCENTAGEM ESTA COM CASE QUE VERIFICA SE O PEDIDO POSSUI UM PEDIDO PARCIAL,
            PARA SE CASO HOUVER,
            AO FINALIZAR O PEDIDO ORIGINAL,
            ELE IRA APRESENTAR QUE METADE DO PERCENTUAL FATURADO FOI FEITO. E ASSIM QUE PROSSEGUIR COM O PARCIAL ELE IRA MOSTRAR A PORCENTAGEM DO PARCIAL,
            POIS AO FINALIZAR ELE SERÁ A COMPOSIÇÃO QUE ESTA COMLETO.
                  CASE
                     
            WHEN (VGF_2.STATUS = 'ME' 
            OR VGF_2.STATUS = 'ENC')
                          
            AND VGF_3.NUPED_ORIG IS NOT NULL
                     THEN
                        (CASE
                            
            WHEN VGF_3.PERC_FATURADO = 0 THEN 50.0
                            
            ELSE VGF_3.PERC_FATURADO
                         
        END)
                     ELSE
                        VGF_2.PERC_FATURADO
                  END
                     AS PERC_FATURADO
             
    FROM
        (SELECT
            DISTINCT
                             X.NU_PEDFIRME AS NUNOTA,
            
                             NVL (
                                (SELECT
                MAX (AD_NUPEDORIG)
                                   
            FROM
                TGFCAB
                                  
            WHERE
                NUNOTA = X.NU_PEDFIRME
                                        
                AND ORDEMCARGA <> 0),
            
                                0)
                                AS NUPED_ORIG,
            -- PUXAR O NUMERO DO PEDIDO DE ORIGEM QUANDO HOUVER UM PARCIAL.
                             CASE
                                
            WHEN     X.AD_DTENTREGAEFETIVA IS NOT NULL
                                     
            AND X.QTDLIB_REPROVADA = 0
                                     
            AND X.NU_NF IS NOT NULL
                                     
            AND TRUNC (SYSDATE)
                                         - TRUNC (X.AD_DTENTREGAEFETIVA) > 5
                                THEN
                                   'ENC'
                                
            WHEN X.AD_DTENTREGAEFETIVA IS NOT NULL
                                     
            AND X.QTDLIB_REPROVADA = 0
                                     
            AND X.NU_NF IS NOT NULL
                                THEN
                                   'ME'                  --MERCADORIA ENTREGUE
                                
            WHEN X.AD_DTCOLETAEFETIVA IS NOT NULL
                                     
            AND X.QTDLIB_REPROVADA = 0
                                     
            AND X.NU_NF IS NOT NULL
                                THEN
                                   'MA'                 --MERCADORIA A CAMINHO
                                
            WHEN X.AD_DTENTREGAPREV IS NOT NULL
                                     
            AND X.QTDLIB_REPROVADA = 0
                                     
            AND X.ORDEMCARGA <> 0
                                     
            AND X.PENDENTE = 'N'
                                THEN
                                   'PE'                  --PREVISÃO DE ENTREGA
                                
            WHEN X.NU_NF IS NOT NULL 
            AND X.PENDENTE = 'N'
                                THEN
                                   'NFE'                 --NOTA FISCAL EMITIDA
                                
            WHEN X.NU_NF IS NOT NULL 
            AND X.PENDENTE = 'S'
                                THEN
                                   'PFP'             --PEDIDO FATURADO PARCIAL
                                
            WHEN     X.NU_PEDCONF IS NOT NULL
                                     
            AND X.NU_NF IS NULL
                                     
            AND X.PEDCONF_PENDENTE = 'S'
                                THEN
                                   'ANF'                       --AGUARDANDO NF
                                
            WHEN     X.NU_PEDCONF IS NOT NULL
                                     
            AND X.NU_NF IS NULL
                                     
            AND X.PEDCONF_PENDENTE = 'S'
                                THEN
                                   'ANF'                       --AGUARDANDO NF
                                
            WHEN X.ORDEMCARGA <> 0 
            AND X.PENDENTE = 'S'
                                THEN
                                   'PS'                  --PEDIDO EM SEPARAÇÃO
                                
            WHEN X.PENDENTE = 'N'
                                     
            AND X.QTDLIB_REPROVADA > 0
                                THEN
                                   'R'                             --REJEITADO
                                
            WHEN X.PENDENTE = 'N'
                                     
            AND (X.NU_PEDCONF IS NULL
                                          
            OR (X.NU_PEDCONF IS NOT NULL
                                              
            AND X.PEDCONF_PENDENTE = 'N'))
                                THEN
                                   'C'                             --CANCELADO
                                
            WHEN X.QTDLIB_TOT = X.QTDLIB_APROV
                                     
            AND X.QTDLIB_TOT > 0
                                THEN
                                   'A'                              --APROVADO
                                ELSE
                                   'EE'                           --EM ANALISE
                             END
                                AS STATUS,
            
                             CASE
                                
            WHEN X.AD_DTENTREGAEFETIVA IS NOT NULL
                                THEN
                                   'Dt.Entrega Efetiva: '
                                   || TO_CHAR (X.AD_DTENTREGAEFETIVA,
            
                                               'DD/MM/YYYY') --ENTREGA EFETIVA
                                
            WHEN X.AD_DTENTREGAPREV IS NOT NULL
                                THEN
                                   'Dt.Entrega Prevista: '
                                   || TO_CHAR (X.AD_DTENTREGAPREV,
            
                                               'DD/MM/YYYY') --PREVISÃO DE ENTREGA
                                /*
            WHEN X.AD_DTCOLETAEFETIVA IS NOT NULL
                                THEN
                                   X.AD_DTCOLETAEFETIVA                       --PRODUTO A CAMINHO*/
                                
            WHEN X.NU_NF IS NOT NULL
                                THEN
                                   'Dt.Emissão NFe: '
                                   || TO_CHAR (X.DTMOV,
            'DD/MM/YYYY') --NFE EMITIDA
                             END
                                AS COMENTARIO,
            
                             CASE
                                
            WHEN (QTDITE_NF = 0 
            OR QTDITE_PED = 0) THEN 0
                                
            ELSE ROUND (QTDITE_NF * 100 / QTDITE_PED,
            2)
                             END
                                AS PERC_FATURADO
                        
        FROM
            (  SELECT
                NU_PEDFIRME,
                
                                       PENDENTE,
                
                                       STATUSNOTA,
                
                                       ORDEMCARGA,
                
                                       AD_DTENTREGAPREV,
                
                                       AD_DTCOLETAEFETIVA,
                
                                       AD_DTENTREGAEFETIVA,
                
                                       QTDLIB_TOT,
                
                                       QTDLIB_APROV,
                
                                       QTDLIB_REPROVADA,
                
                                       PEDCONF_PENDENTE,
                
                                       LISTAGG (DISTINCT NU_PEDCONF,
                ', ')
                                          AS NU_PEDCONF,
                
                                       LISTAGG (DISTINCT NU_NF,
                ', ') AS NU_NF,
                
                                       MAX (DTMOV) AS DTMOV,
                
                                       QTDITE_PED,
                
                                       SUM (QTDITE_NF) AS QTDITE_NF
                                  
            FROM
                (SELECT
                    DISTINCT
                                               CAB.NUNOTA AS NU_PEDFIRME,
                    
                                               CAB.PENDENTE,
                    
                                               CAB.STATUSNOTA,
                    
                                               CAB.ORDEMCARGA,
                    
                                               CAB.AD_DTENTREGAPREV,
                    
                                               CAB.AD_DTCOLETAEFETIVA,
                    
                                               CAB.AD_DTENTREGAEFETIVA,
                    
                                               (SELECT
                        COUNT (*)
                                                  
                    FROM
                        TSILIB
                                                 
                    WHERE
                        NUCHAVE = CAB.NUNOTA)
                                                  AS QTDLIB_TOT,
                    
                                               (SELECT
                        COUNT (*)
                                                  
                    FROM
                        TSILIB
                                                 
                    WHERE
                        NUCHAVE = CAB.NUNOTA
                                                       
                        AND VLRLIBERADO >=
                                                              VLRATUAL
                                                       
                        AND NVL (REPROVADO, 'N') =
                                                              'N')
                                                  AS QTDLIB_APROV,
                    
                                               (SELECT
                        COUNT (*)
                                                  
                    FROM
                        TSILIB
                                                 
                    WHERE
                        NUCHAVE = CAB.NUNOTA
                                                       
                        AND REPROVADO = 'S')
                                                  AS QTDLIB_REPROVADA,
                    
                                               CAB2.NUNOTA AS NU_PEDCONF,
                    
                                               CAB2.PENDENTE
                                                  AS PEDCONF_PENDENTE,
                    
                                               CAB3.NUNOTA AS NU_NF,
                    
                                               CAB3.DTMOV,
                    
                                               NVL (
                                                  (SELECT
                        SUM (QTDNEG)
                                                          - SUM (QTDCONFERIDA)
                                                     
                    FROM
                        TGFITE
                                                    
                    WHERE
                        NUNOTA = CAB.NUNOTA),
                    
                                                  0)
                                                  AS QTDITE_PED,
                    
                                               NVL (
                                                  (SELECT
                        SUM (QTDNEG)
                                                     
                    FROM
                        TGFITE
                                                    
                    WHERE
                        NUNOTA = CAB3.NUNOTA
                                                          
                        AND CODPROD IN
                                                                 (SELECT
                            I.
                                                                          CODPROD
                                                                    
                        FROM
                            TGFITE I
                                                                   
                        WHERE
                            I.
                                                                          NUNOTA =
                                                                            CAB.
                                                                             NUNOTA)),
                                                  0)
                                                  AS QTDITE_NF
                                          
                FROM
                    TGFCAB CAB
                                               
                INNER JOIN
                    TGFTOP TPO
                                                  
                        ON TPO.CODTIPOPER =
                                                        CAB.CODTIPOPER
                                                     
                        AND CAB.DHTIPOPER =
                                                            TPO.DHALTER
                                               
                LEFT JOIN
                    TGFVAR VAR
                                                  
                        ON CAB.NUNOTA =
                                                        VAR.NUNOTAORIG
                                               
                LEFT JOIN
                    TGFCAB CAB2
                                                  
                        ON CAB2.NUNOTA = VAR.NUNOTA
                                               
                LEFT JOIN
                    TGFVAR VAR2
                                                  
                        ON CAB2.NUNOTA =
                                                        VAR2.NUNOTAORIG
                                               
                LEFT JOIN
                    TGFCAB CAB3
                                                  
                        ON CAB3.NUNOTA = VAR2.NUNOTA
                                         
                WHERE
                    TPO.TIPMOV IN (
                        'P', 'D', 'V'
                    )
                                               
                    AND NVL (TPO.AD_TIPOPED, 0) IN
                                                      (1, 2)
                )
                              --
            WHERE
                NU_PEDFIRME = 133566
                              
            GROUP BY
                NU_PEDFIRME,
                
                                       PENDENTE,
                
                                       STATUSNOTA,
                
                                       ORDEMCARGA,
                
                                       QTDLIB_TOT,
                
                                       QTDLIB_APROV,
                
                                       QTDLIB_REPROVADA,
                
                                       PEDCONF_PENDENTE,
                
                                       QTDITE_PED,
                
                                       AD_DTENTREGAPREV,
                
                                       AD_DTCOLETAEFETIVA,
                
                                       AD_DTENTREGAEFETIVA) X --
            WHERE
                X.NU_PEDFIRME = 108506
                                                             
            ) VGF_2
                  
        LEFT JOIN
                     (SELECT
            *
                        FROM
                (SELECT
                    DISTINCT
                                     X.NU_PEDFIRME AS NUNOTA,
                    
                                     NVL (
                                        (SELECT
                        MAX (AD_NUPEDORIG)
                                           
                    FROM
                        TGFCAB
                                          
                    WHERE
                        NUNOTA = X.NU_PEDFIRME
                                                
                        AND ORDEMCARGA IS NOT NULL),
                    
                                        0)
                                        AS NUPED_ORIG,
                    
                                     CASE
                                        
                    WHEN X.AD_DTENTREGAEFETIVA
                                                IS NOT NULL
                                             
                    AND X.QTDLIB_REPROVADA = 0
                                             
                    AND X.NU_NF IS NOT NULL
                                        THEN
                                           'ME'          --MERCADORIA ENTREGUE
                                        
                    WHEN X.AD_DTCOLETAEFETIVA IS NOT NULL
                                             
                    AND X.QTDLIB_REPROVADA = 0
                                             
                    AND X.NU_NF IS NOT NULL
                                        THEN
                                           'MA'         --MERCADORIA A CAMINHO
                                        
                    WHEN X.AD_DTENTREGAPREV IS NOT NULL
                                             
                    AND X.QTDLIB_REPROVADA = 0
                                             
                    AND X.ORDEMCARGA <> 0
                                             
                    AND X.PENDENTE = 'N'
                                        THEN
                                           'PE'          --PREVISÃO DE ENTREGA
                                        
                    WHEN X.NU_NF IS NOT NULL
                                             
                    AND X.PENDENTE = 'N'
                                        THEN
                                           'NFE'         --NOTA FISCAL EMITIDA
                                        
                    WHEN X.NU_NF IS NOT NULL
                                             
                    AND X.PENDENTE = 'S'
                                        THEN
                                           'PFP'     --PEDIDO FATURADO PARCIAL
                                        
                    WHEN     X.NU_PEDCONF IS NOT NULL
                                             
                    AND X.NU_NF IS NULL
                                             
                    AND X.PEDCONF_PENDENTE = 'S'
                                        THEN
                                           'ANF'               --AGUARDANDO NF
                                        
                    WHEN     X.NU_PEDCONF IS NOT NULL
                                             
                    AND X.NU_NF IS NULL
                                             
                    AND X.PEDCONF_PENDENTE = 'S'
                                        THEN
                                           'ANF'               --AGUARDANDO NF
                                        
                    WHEN X.ORDEMCARGA <> 0
                                             
                    AND X.PENDENTE = 'S'
                                        THEN
                                           'PS'          --PEDIDO EM SEPARAÇÃO
                                        
                    WHEN X.PENDENTE = 'N'
                                             
                    AND X.QTDLIB_REPROVADA > 0
                                        THEN
                                           'R'                     --REJEITADO
                                        
                    WHEN X.PENDENTE = 'N'
                                             
                    AND (X.NU_PEDCONF IS NULL
                                                  
                    OR (X.NU_PEDCONF
                                                         IS NOT NULL
                                                      
                    AND X.PEDCONF_PENDENTE =
                                                             'N'))
                                        THEN
                                           'C'                     --CANCELADO
                                        
                    WHEN X.QTDLIB_TOT = X.QTDLIB_APROV
                                             
                    AND X.QTDLIB_TOT > 0
                                        THEN
                                           'A'                      --APROVADO
                                        ELSE
                                           'EE'                   --EM ANALISE
                                     END
                                        AS STATUS,
                    
                                     CASE
                                        
                    WHEN X.AD_DTENTREGAEFETIVA
                                                IS NOT NULL
                                        THEN
                                           'Dt.Entrega Efetiva: '
                                           || TO_CHAR (X.AD_DTENTREGAEFETIVA,
                    
                                                       'DD/MM/YYYY') --ENTREGA EFETIVA
                                        
                    WHEN X.AD_DTENTREGAPREV IS NOT NULL
                                        THEN
                                           'Dt.Entrega Prevista: '
                                           || TO_CHAR (X.AD_DTENTREGAPREV,
                    
                                                       'DD/MM/YYYY') --PREVISÃO DE ENTREGA
                                        /*
                    WHEN X.AD_DTCOLETAEFETIVA IS NOT NULL
                                        THEN
                                           X.AD_DTCOLETAEFETIVA                       --PRODUTO A CAMINHO*/
                                        
                    WHEN X.NU_NF IS NOT NULL
                                        THEN
                                           'Dt.Emissão NFe: '
                                           || TO_CHAR (X.DTMOV,
                    'DD/MM/YYYY') --NFE EMITIDA
                                     END
                                        AS COMENTARIO,
                    
                                     CASE
                                        
                    WHEN (QTDITE_NF = 0 
                    OR QTDITE_PED = 0)
                                        THEN
                                           0
                                        ELSE
                                           ROUND (
                                              QTDITE_NF * 100 / QTDITE_PED,
                    
                                              2)
                                     END
                                        AS PERC_FATURADO
                                
                FROM
                    (  SELECT
                        NU_PEDFIRME,
                        
                                               PENDENTE,
                        
                                               STATUSNOTA,
                        
                                               ORDEMCARGA,
                        
                                               AD_DTENTREGAPREV,
                        
                                               AD_DTCOLETAEFETIVA,
                        
                                               AD_DTENTREGAEFETIVA,
                        
                                               QTDLIB_TOT,
                        
                                               QTDLIB_APROV,
                        
                                               QTDLIB_REPROVADA,
                        
                                               PEDCONF_PENDENTE,
                        
                                               LISTAGG (DISTINCT NU_PEDCONF,
                        
                                                        ', ')
                                                  AS NU_PEDCONF,
                        
                                               LISTAGG (DISTINCT NU_NF,
                        ', ')
                                                  AS NU_NF,
                        
                                               MAX (DTMOV) AS DTMOV,
                        
                                               QTDITE_PED,
                        
                                               SUM (QTDITE_NF) AS QTDITE_NF
                                          
                    FROM
                        (SELECT
                            DISTINCT
                                                       CAB.NUNOTA
                                                          AS NU_PEDFIRME,
                            
                                                       CAB.PENDENTE,
                            
                                                       CAB.STATUSNOTA,
                            
                                                       CAB.ORDEMCARGA,
                            
                                                       CAB.AD_DTENTREGAPREV,
                            
                                                       CAB.AD_DTCOLETAEFETIVA,
                            
                                                       CAB.AD_DTENTREGAEFETIVA,
                            
                                                       (SELECT
                                COUNT (*)
                                                          
                            FROM
                                TSILIB
                                                         
                            WHERE
                                NUCHAVE =
                                                                  CAB.NUNOTA)
                                                          AS QTDLIB_TOT,
                            
                                                       (SELECT
                                COUNT (*)
                                                          
                            FROM
                                TSILIB
                                                         
                            WHERE
                                NUCHAVE =
                                                                  CAB.NUNOTA
                                                               
                                AND VLRLIBERADO >=
                                                                      VLRATUAL
                                                               
                                AND NVL (
                                                                      REPROVADO,
                                                                      'N') =
                                                                      'N')
                                                          AS QTDLIB_APROV,
                            
                                                       (SELECT
                                COUNT (*)
                                                          
                            FROM
                                TSILIB
                                                         
                            WHERE
                                NUCHAVE =
                                                                  CAB.NUNOTA
                                                               
                                AND REPROVADO =
                                                                      'S')
                                                          AS QTDLIB_REPROVADA,
                            
                                                       CAB2.NUNOTA
                                                          AS NU_PEDCONF,
                            
                                                       CAB2.PENDENTE
                                                          AS PEDCONF_PENDENTE,
                            
                                                       CAB3.NUNOTA AS NU_NF,
                            
                                                       CAB3.DTMOV,
                            
                                                       NVL (
                                                          (SELECT
                                SUM (QTDNEG)
                                                                  - SUM (
                                                                       QTDCONFERIDA)
                                                             
                            FROM
                                TGFITE
                                                            
                            WHERE
                                NUNOTA =
                                                                     CAB.NUNOTA),
                            
                                                          0)
                                                          AS QTDITE_PED,
                            
                                                       NVL (
                                                          (SELECT
                                SUM (QTDNEG)
                                                             
                            FROM
                                TGFITE
                                                            
                            WHERE
                                NUNOTA =
                                                                     CAB3.
                                                                      NUNOTA
                                                                  
                                AND CODPROD IN
                                                                         (SELECT
                                    I.
                                                                                  CODPROD
                                                                            
                                FROM
                                    TGFITE I
                                                                           
                                WHERE
                                    I.
                                                                                  NUNOTA =
                                                                                    CAB.
                                                                                     NUNOTA)),
                                                          0)
                                                          AS QTDITE_NF
                                                  
                        FROM
                            TGFCAB CAB
                                                       
                        INNER JOIN
                            TGFTOP TPO
                                                          
                                ON TPO.CODTIPOPER =
                                                                CAB.CODTIPOPER
                                                             
                                AND CAB.DHTIPOPER =
                                                                    TPO.DHALTER
                                                       
                        LEFT JOIN
                            TGFVAR VAR
                                                          
                                ON CAB.NUNOTA =
                                                                VAR.NUNOTAORIG
                                                       
                        LEFT JOIN
                            TGFCAB CAB2
                                                          
                                ON CAB2.NUNOTA =
                                                                VAR.NUNOTA
                                                       
                        LEFT JOIN
                            TGFVAR VAR2
                                                          
                                ON CAB2.NUNOTA =
                                                                VAR2.NUNOTAORIG
                                                       
                        LEFT JOIN
                            TGFCAB CAB3
                                                          
                                ON CAB3.NUNOTA =
                                                                VAR2.NUNOTA
                                                 
                        WHERE
                            TPO.TIPMOV IN
                                                          ('P', 'D', 'V')
                                                       
                            AND NVL (TPO.AD_TIPOPED,
                                                                0) IN
                                                              (1, 2))
                                      --
                        WHERE
                            NU_PEDFIRME = 138707
                                      
                        GROUP BY
                            NU_PEDFIRME,
                            
                                               PENDENTE,
                            
                                               STATUSNOTA,
                            
                                               ORDEMCARGA,
                            
                                               QTDLIB_TOT,
                            
                                               QTDLIB_APROV,
                            
                                               QTDLIB_REPROVADA,
                            
                                               PEDCONF_PENDENTE,
                            
                                               QTDITE_PED,
                            
                                               AD_DTENTREGAPREV,
                            
                                               AD_DTCOLETAEFETIVA,
                            
                                               AD_DTENTREGAEFETIVA) X)) VGF_3
                  
                                ON VGF_2.NUNOTA = VGF_3.NUPED_ORIG) X
   
                        UNION
                        ALL
   SELECT
                            EXC.NUNOTA,
                            
          'C' AS STATUS,
                            
             'Excluido em: '
          || TO_CHAR (EXC.DHEXCLUSAO,
                            'DD/MM/YYYY HH24:MI:SS')
          || ' | Motivo: '
          || DBMS_LOB.SUBSTR (EXC.AD_MOTEXCLUSAO,
                            4000,
                            1)
             AS COMENTARIO,
                            
          0 AS PERC_FATURADOd
     
                        FROM
                            TGFCAB_EXC EXC
          
                        INNER JOIN
             TGFTOP TPO
          
                            ON TPO.CODTIPOPER = EXC.CODTIPOPER 
                            AND EXC.DHTIPOPER = TPO.DHALTER
    WHERE
                                TPO.TIPMOV IN (
                                    'P',
                                'D',
                                'V') 
                                AND NVL (TPO.AD_TIPOPED,
                                0) IN (1,
                                2)