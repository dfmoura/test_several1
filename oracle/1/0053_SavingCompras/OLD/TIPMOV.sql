SELECT
F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV) AS TIPMOV,
SUM(ITE.VLRDESC) AS VLRDESC
FROM TGFCAB CAB
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
GROUP BY F_DESCROPC('TGFCAB','TIPMOV',CAB.TIPMOV)