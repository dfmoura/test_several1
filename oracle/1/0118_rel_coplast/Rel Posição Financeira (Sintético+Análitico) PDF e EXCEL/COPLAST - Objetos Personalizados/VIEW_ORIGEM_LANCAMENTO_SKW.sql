CREATE OR REPLACE VIEW VIEW_ORIGEM_LANCAMENTO_SKW AS
    SELECT
        CAB.NUNOTA AS NUORIGEM,
        
        CAB.CODPARC AS CODPARC,
        
        I.CODEMP AS CODEMP,
        
        I.REFERENCIA AS REFERENCIA,
        
        I.NUMLANC AS NUMLANC,
        
        I.TIPLANC AS TIPLANC,
        
        I.ORIGEM AS ORIGEM,
        
        I.NUNICO AS NUNICO,
        
        I.NUMLOTE AS NUMLOTE,
        
        I.VLRLANC AS VLRLANC,
        
        I.SEQNOTA AS SEQNOTA,
        
        I.SEQUENCIA AS SEQUENCIA

FROM TGFCAB CAB,
        TCBINT I

WHERE CAB.NUNOTA = I.NUNICO 
        
    AND I.ORIGEM = 'E'

UNION ALL

SELECT    FIN.NUFIN AS NUORIGEM,
        
        FIN.CODPARC AS CODPARC,
        
        I.CODEMP AS CODEMP,
        
        I.REFERENCIA AS REFERENCIA,
        
        I.NUMLANC AS NUMLANC,
        
        I.TIPLANC AS TIPLANC,
        
        I.ORIGEM AS ORIGEM,
        
        I.NUNICO AS NUNICO,
        
        I.NUMLOTE AS NUMLOTE,
        
        I.VLRLANC AS VLRLANC,
        
        I.SEQNOTA AS SEQNOTA,
        
        I.SEQUENCIA AS SEQUENCIA

FROM TGFFIN FIN,
        TCBINT I

WHERE FIN.NUFIN = I.NUNICO 
        
    AND I.ORIGEM IN (
        'F',
        'B',
        'R'
    )

UNION ALL

SELECT    0 AS NUORIGEM,
        
        NVL(AD_CODPARC,
        0) AS CODPARC,
        
        LAN.CODEMP AS CODEMP,
        
        LAN.REFERENCIA AS REFERENCIA,
        
        LAN.NUMLANC AS NUMLANC,
        
        LAN.TIPLANC AS TIPLANC,
        
        'Z' AS ORIGEM,
        
        0 AS NUNICO,
        
        LAN.NUMLOTE AS NUMLOTE,
        
        LAN.VLRLANC AS VLRLANC,
        
        0 AS SEQNOTA,
        
        LAN.SEQUENCIA AS SEQUENCIA
        
    FROM
        TCBLAN LAN
        
    WHERE
        NOT EXISTS
        (SELECT
            1
        
        FROM
            TCBINT I
        
        WHERE
            I.CODEMP = LAN.CODEMP
        
            
    AND I.REFERENCIA = LAN.REFERENCIA
        
            
    AND I.NUMLANC = LAN.NUMLANC
        
            
    AND I.TIPLANC = LAN.TIPLANC
        
            
    AND I.NUMLOTE = LAN.NUMLOTE) 
