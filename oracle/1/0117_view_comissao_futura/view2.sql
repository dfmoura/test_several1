    SELECT
ROWNUM AS SEQUENCIA,
NUFECH,
CODVEND,
NUNOTA,
TIPO,
NUMNOTA,
CODEMP,
CODPARC,
DTNEG,
NUFIN,
DTVENC AS DTVENCIMENTO,
DHBAIXA,
VLRDESDOB_ABERTO,
VLRDESC,
VLRBAIXA,
VLRICMS_PROP AS DESCICMS,
REDUCAO_BASE AS DESCCOMISSAO,
PERCCOM,
VLRCOM

FROM (
        
    --RECEITAS RENEGOCIADAS EM ABERTO NA DATA BASE
    SELECT
            
    FECH.NUFECH
    ,
            CAB.NUNOTA
    ,
            CAB.TIPMOV AS TIPO
    ,
            CAB.CODEMP
    ,
            EMP.NOMEFANTASIA
    ,
            CAB.NUMNOTA
    ,
            CAB.CODTIPOPER
    ,
            TPO.DESCROPER
    ,
            CAB.DTNEG
    ,
            CAB.CODPARC
    ,
            PAR.NOMEPARC
    ,
            CCM.CODVEND
    ,
            VEN.APELIDO
    ,
            VEN.AD_DESLIGADO2 AS VEND_DESLIGADO
    ,
            CAB.TIPMOV
    ,
            FIN.NUFIN
    ,
            LISTAGG(V.NUFIN,
            ' - ') AS NUFIN_ORIG
    ,
            CASE 
                WHEN FIN.NURENEG IS NOT NULL THEN 'SIM' 
                ELSE 'NÃO' 
            END AS RENEG
    ,
            FIN.DTVENC
    ,
            FIN.DHBAIXA
    ,
            SUM(V.VLRPROP_ABERTO * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END) AS VLRDESDOB_ABERTO
    ,
            FIN.VLRDESC * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END AS VLRDESC
    ,
            FIN.VLRJURO * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END AS VLRJURO
    ,
            FIN.VLRMULTA * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END AS VLRMULTA
    ,
            SUM(V.VLRPROP * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END) AS VLRBAIXA
    
    ,
            SUM(V.VLRICMS * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END) AS VLRICMS_PROP
    ,
            0 AS REDUCAO_BASE
    ,
            CCM.PERCCOM
    
    ,
            SUM(ROUND(
                (CASE 
                WHEN NVL(V.VLRPROP,
                0) = 0 THEN V.VLRPROP_ABERTO - V.VLRICMS 
                ELSE V.VLRPROP - V.VLRICMS 
            END)
                * CCM.PERCCOM / 100,
            6)
                * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END) AS VLRCOM
    ,
            (SELECT
                LISTAGG('Vlr.Prov: '||F.VLRDESDOB || '-Vend: '||F.CODVEND||'-Nú.Provisão: '||F.NUFIN,
                ' / ') 
            FROM
                TGFFIN F 
            WHERE
                (
                    F.AD_NUFINPROV = FIN.NUFIN
                ) 
                AND F.CODVEND = VEN.CODVEND) AS VLRCOM_PROVFIN
    
    ,
            CASE 
                WHEN CAB.TIPMOV = 'D' THEN 'RED' 
                WHEN FIN.NURENEG <> 0 THEN 'PURPLE' 
                ELSE 'BLUE' 
            END AS FGCOLOR
    
        FROM
            TGFCAB CAB,
            TGFPAR PAR,
            TGFFIN FIN,
            TSIEMP EMP,
            TGFTOP TPO,
            TGFVEN VEN,
            TGFCCM CCM,
            VRENEG V,
            AD_DBFECHCOM FECH
    WHERE
    CAB.CODPARC = PAR.CODPARC 
    
            AND CAB.NUNOTA = V.NUNOTA
    
            AND CAB.CODEMP = EMP.CODEMP
    
            AND CAB.CODTIPOPER = TPO.CODTIPOPER
    
            AND CAB.DHTIPOPER = TPO.DHALTER
    
            AND CAB.NUNOTA = CCM.NUNOTA (+)
    
            AND CCM.CODVEND = VEN.CODVEND (+)
    
            AND FIN.NUFIN = V.NUFINNOVO
    
            AND TPO.ATUALCOM = 'C'
    
            AND NOT EXISTS ( SELECT
                1 
            FROM
                AD_DBFECHCOMNOTAS ITE,
                AD_DBFECHCOM CAB 
            WHERE
                CAB.NUFECH = ITE.NUFECH 
                AND ITE.NUFIN = FIN.NUFIN 
                AND ITE.CODVEND = CCM.CODVEND ) 
    
            AND (VEN.ATIVO = 'S')
    
            AND FIN.NURENEG IS NOT NULL
    
            AND FIN.RECDESP <> 0
    --
            AND VEN.CODVEND = 38
    --
            AND CAB.CODPARC = 1149
    
        GROUP BY
    CAB.NUNOTA
    ,
        CAB.CODEMP
    ,
        EMP.NOMEFANTASIA
    ,
        CAB.NUMNOTA
    ,
        CAB.CODTIPOPER
    ,
        TPO.DESCROPER
    ,
        CAB.DTNEG
    ,
        CAB.CODPARC
    ,
        PAR.NOMEPARC
    ,
        CCM.CODVEND
    ,
        VEN.APELIDO
    ,
        VEN.AD_DESLIGADO2
    ,
        CAB.TIPMOV
    ,
        FIN.NUFIN
    ,
        CASE 
            WHEN FIN.NURENEG IS NOT NULL THEN 'SIM' 
            ELSE 'NÃO' 
        END 
    ,
        FIN.DTVENC
    ,
        FIN.DHBAIXA
    ,
        FIN.VLRDESC * CASE 
            WHEN CAB.TIPMOV = 'D' THEN -1 
            ELSE 1 END
    ,
            FIN.VLRJURO * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 
            END 
    ,
            FIN.VLRMULTA * CASE 
                WHEN CAB.TIPMOV = 'D' THEN -1 
                ELSE 1 END
    ,
                CCM.PERCCOM
    ,
                CASE 
                    WHEN CAB.TIPMOV = 'D' THEN 'RED' 
                    WHEN FIN.NURENEG <> 0 THEN 'PURPLE' 
                    ELSE 'BLUE' END
    ,
                    VEN.CODVEND
    ,
                    FECH.NUFECH
    
    UNION
                    ALL
    
    --RECEITAS NORMAIS EM ABERTO NA DATA BASE
    SELECT
                        
    FECH.NUFECH
    ,
                        CAB.NUNOTA
    ,
                        CAB.TIPMOV AS TIPO
    ,
                        CAB.CODEMP
    ,
                        EMP.NOMEFANTASIA
    ,
                        CAB.NUMNOTA
    ,
                        CAB.CODTIPOPER
    ,
                        TPO.DESCROPER
    ,
                        CAB.DTNEG
    ,
                        CAB.CODPARC
    ,
                        PAR.NOMEPARC
    ,
                        CCM.CODVEND
    ,
                        VEN.APELIDO
    ,
                        VEN.AD_DESLIGADO2 AS VEND_DESLIGADO
    ,
                        CAB.TIPMOV
    ,
                        FIN.NUFIN
    ,
                        NULL AS NUFIN_ORIG
    ,
                        CASE 
                            WHEN FIN.NURENEG IS NOT NULL THEN 'SIM' 
                            ELSE 'NÃO' 
                        END AS RENEG
    ,
                        FIN.DTVENC
    ,
                        FIN.DHBAIXA
    ,
                        FIN.VLRDESDOB * CASE 
                            WHEN CAB.TIPMOV = 'D' THEN -1 
                            ELSE 1 
                        END AS VLRDESDOB_ABERTO
    ,
                        FIN.VLRDESC * CASE 
                            WHEN CAB.TIPMOV = 'D' THEN -1 
                            ELSE 1 
                        END AS VLRDESC
    ,
                        FIN.VLRJURO * CASE 
                            WHEN CAB.TIPMOV = 'D' THEN -1 
                            ELSE 1 
                        END AS VLRJURO
    ,
                        FIN.VLRMULTA * CASE 
                            WHEN CAB.TIPMOV = 'D' THEN -1 
                            ELSE 1 
                        END AS VLRMULTA
    ,
                        CASE 
                            WHEN NVL(FIN.VLRBAIXA,
                            0) = 0 THEN 0 
                            ELSE ((FIN.VLRBAIXA - FIN.VLRJURO - FIN.VLRMULTA) - ((CAB.VLRICMS / (SELECT
                                SUM(VLRDESDOB) 
                            FROM
                                TGFFIN 
                            WHERE
                                NUNOTA = CAB.NUNOTA)) * FIN.VLRDESDOB)) 
                        END * CASE 
                            WHEN CAB.TIPMOV = 'D' THEN -1 
                            ELSE 1 
                        END AS VLRBAIXA
    
    ,
                        ((CAB.VLRICMS / (SELECT
                            SUM(VLRDESDOB) 
                        FROM
                            TGFFIN 
                        WHERE
                            NUNOTA = CAB.NUNOTA)) * FIN.VLRDESDOB) * CASE 
                            WHEN CAB.TIPMOV = 'D' THEN -1 
                            ELSE 1 
                        END AS VLRICMS_PROP
    ,
                        NVL((CASE 
                            WHEN CCM.AD_DIMINUIBASE = 'S' THEN 0 
                            ELSE ((CAB.VLRNOTA - CAB.VLRICMS) * (SELECT
                                SUM(PERCCOM) 
                            FROM
                                TGFCCM 
                            WHERE
                                NUNOTA = CAB.NUNOTA 
                                AND AD_DIMINUIBASE = 'S')/100) / (SELECT
                                SUM(VLRDESDOB) 
                            FROM
                                TGFFIN 
                            WHERE
                                NUNOTA = CAB.NUNOTA) * FIN.VLRDESDOB 
                        END),
                        0) AS REDUCAO_BASE
    ,
                        CCM.PERCCOM
    
    ,
                        ROUND(
                    ((CASE 
                            WHEN NVL(FIN.VLRBAIXA,
                            0) = 0 THEN FIN.VLRDESDOB 
                            ELSE FIN.VLRBAIXA - FIN.VLRJURO - FIN.VLRMULTA 
                        END)
                    - ((CAB.VLRICMS / (SELECT
                            SUM(VLRDESDOB) 
                        FROM
                            TGFFIN 
                        WHERE
                            NUNOTA = CAB.NUNOTA)) * FIN.VLRDESDOB)
                    - NVL((CASE 
                            WHEN CCM.AD_DIMINUIBASE = 'S' THEN 0 
                            ELSE ((CAB.VLRNOTA - CAB.VLRICMS) * (SELECT
                                SUM(PERCCOM) 
                            FROM
                                TGFCCM 
                            WHERE
                                NUNOTA = CAB.NUNOTA 
                                AND AD_DIMINUIBASE = 'S')/100) / (SELECT
                                SUM(VLRDESDOB) 
                            FROM
                                TGFFIN 
                            WHERE
                                NUNOTA = CAB.NUNOTA) * FIN.VLRDESDOB 
                        END),
                        0)
                    ) * CCM.PERCCOM / 100
                ,
                        6) * CASE 
                            WHEN CAB.TIPMOV = 'D' THEN -1 
                            ELSE 1 
                        END AS VLRCOM
    ,
                        (SELECT
                            LISTAGG('Vlr.Prov: '||F.VLRDESDOB || '-Vend: '||F.CODVEND||'-Nú.Provisão: '||F.NUFIN,
                            ' / ') 
                        FROM
                            TGFFIN F 
                        WHERE
                            AD_NUFINPROV = FIN.NUFIN 
                            AND CODVEND = VEN.CODVEND) AS VLRCOM_PROVFIN
    
    ,
                        CASE 
                            WHEN CAB.TIPMOV = 'D' THEN 'RED' 
                            WHEN FIN.NURENEG <> 0 THEN 'PURPLE' 
                            ELSE 'BLUE' 
                        END AS FGCOLOR
    
                    FROM
                        TGFCAB CAB,
                        TGFPAR PAR,
                        TGFFIN FIN,
                        TSIEMP EMP,
                        TGFTOP TPO,
                        TGFVEN VEN,
                        TGFCCM CCM,
                        AD_DBFECHCOM FECH
    
                    WHERE
                        
    CAB.CODPARC = PAR.CODPARC 
    
                        AND CAB.NUNOTA = FIN.NUNOTA
    
                        AND CAB.CODEMP = EMP.CODEMP
    
                        AND CAB.CODTIPOPER = TPO.CODTIPOPER
    
                        AND CAB.DHTIPOPER = TPO.DHALTER
    
                        AND CAB.NUNOTA = CCM.NUNOTA (+)
    
                        AND CCM.CODVEND = VEN.CODVEND (+)
    
                        AND TPO.ATUALCOM = 'C'
    
                        AND NOT EXISTS (
                            SELECT
                                1 
                            FROM
                                AD_DBFECHCOMNOTAS ITE,
                                AD_DBFECHCOM CAB 
                            WHERE
                                CAB.NUFECH = ITE.NUFECH 
                                AND ITE.NUFIN = FIN.NUFIN 
                                AND ITE.CODVEND = CCM.CODVEND 
                        ) 
    
                        AND (
                            VEN.ATIVO = 'S'
                        )
    
                        AND FIN.NURENEG IS NULL
    --
                        AND VEN.CODVEND = 38
    --
                        AND CAB.CODPARC = 1149

                    ) X
ORDER 
                BY
                    "CODVEND",
                    CODEMP,
                    CODPARC,
                    "DHBAIXA",
                    "DTNEG"

/*
--QUERY ANTIGA

    SELECT
        ROWNUM AS SQUENCIA,
                    
        FECH.NUFECH,
                    
        CAB.NUNOTA,
                    
        CAB.CODEMP,
                    
        CAB.NUMNOTA,
                    
        CAB.DTNEG,
                    
        CAB.CODPARC,
                    
        FIN.NUFIN,
                    
        FIN.DTVENC AS DTVENC,
                    
        FIN.DHBAIXA,
                    
        
FIN.VLRDESDOB * CASE 
            
                        WHEN CAB.TIPMOV = 'D' THEN -1 
            
                        ELSE 1 
        
                    END AS VLRBAIXA,
                    
        
        ROUND(
        (FIN.VLRDESDOB
        - ((CAB.VLRICMS / (SELECT
            SUM(VLRDESDOB) 
        FROM
            TGFFIN 
        WHERE
            NUNOTA = CAB.NUNOTA)) * FIN.VLRDESDOB)
        - NVL((CASE 
            
                        WHEN CCM.AD_DIMINUIBASE = 'S' THEN 0 
            
                        ELSE ((CAB.VLRNOTA - CAB.VLRICMS) * (SELECT
                SUM(PERCCOM) 
            FROM
                TGFCCM 
            WHERE
                NUNOTA = CAB.NUNOTA 
                
                        AND AD_DIMINUIBASE = 'S')/100) / (SELECT
                SUM(VLRDESDOB) 
            FROM
                TGFFIN 
            WHERE
                NUNOTA = CAB.NUNOTA) * FIN.VLRDESDOB 
        
                    END),
                    
        0)
        ) * CCM.PERCCOM / 100,
                    
        6)
         * CASE 
            
                        WHEN CAB.TIPMOV = 'D' THEN -1 
            
                        ELSE 1 
        
                    END AS VLRCOM,
                    
        CCM.CODVEND,
                    
        CAB.TIPMOV AS TIPO,
                    
        
                  ((CAB.VLRICMS / (SELECT
            SUM(VLRDESDOB) 
        FROM
            TGFFIN 
        WHERE
            NUNOTA = CAB.NUNOTA)) * FIN.VLRDESDOB) AS DESCICMS,
                    
        
        NVL((CASE 
            
                        WHEN CCM.AD_DIMINUIBASE = 'S' THEN 0 
            
                        ELSE ((CAB.VLRNOTA - CAB.VLRICMS) * (SELECT
                SUM(PERCCOM) 
            FROM
                TGFCCM 
            WHERE
                NUNOTA = CAB.NUNOTA 
                
                        AND AD_DIMINUIBASE = 'S')/100) / (SELECT
                SUM(VLRDESDOB) 
            FROM
                TGFFIN 
            WHERE
                NUNOTA = CAB.NUNOTA) * FIN.VLRDESDOB 
        
                    END),
                    
        0) AS DESCCOMISSAO,
                    
        
        FIN.VLRDESC

    FROM
        AD_DBFECHCOM FECH,
                    
        TGFCAB CAB,
                    
        TGFPAR PAR,
                    
        TGFFIN FIN,
                    
        TSIEMP EMP,
                    
        TGFTOP TPO,
                    
        TGFVEN VEN,
                    
        TGFTPV TPV,
                    
        TGFCCM CCM
        
    WHERE
        
        CAB.CODPARC = PAR.CODPARC
           
        
                    AND CAB.NUNOTA = FIN.NUNOTA
           
        
                    AND CAB.CODEMP = EMP.CODEMP
           
        
                    AND CAB.CODTIPOPER = TPO.CODTIPOPER
           
        
                    AND CAB.DHTIPOPER = TPO.DHALTER
           
        
                    AND CAB.CODTIPVENDA = TPV.CODTIPVENDA
           
        
                    AND CAB.DHTIPVENDA = TPV.DHALTER
           
        
                    AND CAB.NUNOTA = CCM.NUNOTA
           
        
                    AND CCM.CODVEND = VEN.CODVEND
           
        
                    AND TPO.ATUALCOM = 'C'
           
        
                    AND NVL(VEN.AD_DESLIGADO,
                    'N') = 'N'
           
        
                    AND CAB.STATUSNOTA = 'L'
           
        
                    AND FIN.DTVENC >= FECH.DTINICIO
           
        
                    AND NOT EXISTS (
            SELECT
                1 
            FROM
                AD_DBFECHCOMNOTAS 
            WHERE
                NUFIN = FIN.NUFIN 
                
                    AND CODVEND = CCM.CODVEND
        )
           
        
                    AND FIN.AD_NUFECH IS NULL


*/