SELECT
NUNOTA,
COUNT(*) PARCELAS,
SUM(GANHO_NEGOCIACAO) AS GANHO_NEGOCIACAO

FROM
(
SELECT 
NUNOTA,
DTNEG,
DTVENC,
DHBAIXA,
DESDOBRAMENTO,
(NVL(TGFFIN.VLRDESDOB,0) + (CASE WHEN TGFFIN.TIPMULTA = '1' THEN NVL(TGFFIN.VLRMULTA,0) ELSE 0 END) + (CASE WHEN TGFFIN.TIPJURO = '1' THEN NVL(TGFFIN.VLRJURO,0) ELSE 0 END) + NVL(TGFFIN.DESPCART,0) + NVL(TGFFIN.VLRVENDOR,0) - NVL(TGFFIN.VLRDESC,0) - (CASE WHEN TGFFIN.IRFRETIDO = 'S' THEN NVL(TGFFIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN TGFFIN.ISSRETIDO = 'S' THEN NVL(TGFFIN.VLRISS,0) ELSE 0 END) - (CASE WHEN TGFFIN.INSSRETIDO = 'S' THEN NVL(TGFFIN.VLRINSS,0) ELSE 0 END) - NVL(TGFFIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = TGFFIN.NUFIN),0) + NVL(TGFFIN.VLRMULTANEGOC,0) + NVL(TGFFIN.VLRJURONEGOC,0) - NVL(TGFFIN.VLRMULTALIB,0) - NVL(TGFFIN.VLRJUROLIB,0) + NVL(TGFFIN.VLRVARCAMBIAL,0)) * NVL(TGFFIN.RECDESP,0) VLRLIQ,
CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END AS DIAS,


(NVL(TGFFIN.VLRDESDOB,0) + 
     (CASE WHEN TGFFIN.TIPMULTA = '1' THEN NVL(TGFFIN.VLRMULTA,0) ELSE 0 END) + 
     (CASE WHEN TGFFIN.TIPJURO = '1' THEN NVL(TGFFIN.VLRJURO,0) ELSE 0 END) + 
     NVL(TGFFIN.DESPCART,0) + 
     NVL(TGFFIN.VLRVENDOR,0) - 
     NVL(TGFFIN.VLRDESC,0) - 
     (CASE WHEN TGFFIN.IRFRETIDO = 'S' THEN NVL(TGFFIN.VLRIRF,0) ELSE 0 END) - 
     (CASE WHEN TGFFIN.ISSRETIDO = 'S' THEN NVL(TGFFIN.VLRISS,0) ELSE 0 END) - 
     (CASE WHEN TGFFIN.INSSRETIDO = 'S' THEN NVL(TGFFIN.VLRINSS,0) ELSE 0 END) - 
     NVL(TGFFIN.CARTAODESC,0) + 
     NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = TGFFIN.NUFIN),0) + 
     NVL(TGFFIN.VLRMULTANEGOC,0) + 
     NVL(TGFFIN.VLRJURONEGOC,0) - 
     NVL(TGFFIN.VLRMULTALIB,0) - 
     NVL(TGFFIN.VLRJUROLIB,0) + 
     NVL(TGFFIN.VLRVARCAMBIAL,0)) * 
     NVL(TGFFIN.RECDESP,0) *
    (1 + FLOOR((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) / 30) * 0.01) AS VLRLIQ_AJUSTADO,


(
(NVL(TGFFIN.VLRDESDOB,0) + 
     (CASE WHEN TGFFIN.TIPMULTA = '1' THEN NVL(TGFFIN.VLRMULTA,0) ELSE 0 END) + 
     (CASE WHEN TGFFIN.TIPJURO = '1' THEN NVL(TGFFIN.VLRJURO,0) ELSE 0 END) + 
     NVL(TGFFIN.DESPCART,0) + 
     NVL(TGFFIN.VLRVENDOR,0) - 
     NVL(TGFFIN.VLRDESC,0) - 
     (CASE WHEN TGFFIN.IRFRETIDO = 'S' THEN NVL(TGFFIN.VLRIRF,0) ELSE 0 END) - 
     (CASE WHEN TGFFIN.ISSRETIDO = 'S' THEN NVL(TGFFIN.VLRISS,0) ELSE 0 END) - 
     (CASE WHEN TGFFIN.INSSRETIDO = 'S' THEN NVL(TGFFIN.VLRINSS,0) ELSE 0 END) - 
     NVL(TGFFIN.CARTAODESC,0) + 
     NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = TGFFIN.NUFIN),0) + 
     NVL(TGFFIN.VLRMULTANEGOC,0) + 
     NVL(TGFFIN.VLRJURONEGOC,0) - 
     NVL(TGFFIN.VLRMULTALIB,0) - 
     NVL(TGFFIN.VLRJUROLIB,0) + 
     NVL(TGFFIN.VLRVARCAMBIAL,0)) * 
     NVL(TGFFIN.RECDESP,0) *
    (1 + FLOOR((CASE WHEN DHBAIXA IS NULL THEN DTVENC - DTNEG ELSE DHBAIXA - DTNEG END) / 30) * 0.01) 
)
-
(NVL(TGFFIN.VLRDESDOB,0) + (CASE WHEN TGFFIN.TIPMULTA = '1' THEN NVL(TGFFIN.VLRMULTA,0) ELSE 0 END) + (CASE WHEN TGFFIN.TIPJURO = '1' THEN NVL(TGFFIN.VLRJURO,0) ELSE 0 END) + NVL(TGFFIN.DESPCART,0) + NVL(TGFFIN.VLRVENDOR,0) - NVL(TGFFIN.VLRDESC,0) - (CASE WHEN TGFFIN.IRFRETIDO = 'S' THEN NVL(TGFFIN.VLRIRF,0) ELSE 0 END) - (CASE WHEN TGFFIN.ISSRETIDO = 'S' THEN NVL(TGFFIN.VLRISS,0) ELSE 0 END) - (CASE WHEN TGFFIN.INSSRETIDO = 'S' THEN NVL(TGFFIN.VLRINSS,0) ELSE 0 END) - NVL(TGFFIN.CARTAODESC,0) + NVL((SELECT ROUND(SUM(I.VALOR * I.TIPIMP),2) FROM TGFIMF I WHERE I.NUFIN = TGFFIN.NUFIN),0) + NVL(TGFFIN.VLRMULTANEGOC,0) + NVL(TGFFIN.VLRJURONEGOC,0) - NVL(TGFFIN.VLRMULTALIB,0) - NVL(TGFFIN.VLRJUROLIB,0) + NVL(TGFFIN.VLRVARCAMBIAL,0)) * NVL(TGFFIN.RECDESP,0)
AS GANHO_NEGOCIACAO

FROM TGFFIN 
WHERE DTNEG BETWEEN '01-06-2024' AND '30-06-2024' AND RECDESP = -1
AND NUNOTA IS NOT NULL
)
GROUP BY NUNOTA