SELECT DISTINCT
COUNT(*)
FROM tgfcab cab
INNER JOIN TGFTOP top ON cab.codtipoper = top.codtipoper AND cab.dhtipoper = (SELECT MAX(t2.dhalter) FROM TGFTOP t2 WHERE t2.codtipoper = top.codtipoper)
WHERE top.nfe <> 'M' /* Convencional (Não Usa NF-e) */
  AND NOT EXISTS ( /* NAO EXISTIR NA TABELA TGFINU*/
    SELECT 1
    FROM TGFINU u
    WHERE u.codemp = cab.codemp 
      AND u.numnota = cab.numnota 
      AND u.serienota = cab.serienota
  )
  AND cab.nunota = :P_NUNOTA;