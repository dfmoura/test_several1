-- =============================================
-- View: VIEW_ORIGEM_LANCAMENTO_SKW (Versão SQL Server)
-- Descrição: View que une dados de origem dos lançamentos contábeis
-- Adaptado do Oracle para SQL Server 2019
-- =============================================

CREATE OR ALTER VIEW VIEW_ORIGEM_LANCAMENTO_SKW AS
    -- Primeira parte: Dados de origem 'E' (Entrada) - TGFCAB
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
    FROM TGFCAB CAB
    INNER JOIN TCBINT I ON CAB.NUNOTA = I.NUNICO 
    WHERE I.ORIGEM = 'E'

    UNION ALL

    -- Segunda parte: Dados de origem 'F', 'B', 'R' (Financeiro, Bancário, Receita) - TGFFIN
    SELECT
        FIN.NUFIN AS NUORIGEM,
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
    FROM TGFFIN FIN
    INNER JOIN TCBINT I ON FIN.NUFIN = I.NUNICO 
    WHERE I.ORIGEM IN ('F', 'B', 'R')

    UNION ALL

    -- Terceira parte: Lançamentos sem integração (origem 'Z')
    SELECT
        0 AS NUORIGEM,
        ISNULL(AD_CODPARC, 0) AS CODPARC,
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
    FROM TCBLAN LAN
    WHERE NOT EXISTS (
        SELECT 1
        FROM TCBINT I
        WHERE I.CODEMP = LAN.CODEMP
        AND I.REFERENCIA = LAN.REFERENCIA
        AND I.NUMLANC = LAN.NUMLANC
        AND I.TIPLANC = LAN.TIPLANC
        AND I.NUMLOTE = LAN.NUMLOTE
    );
GO
