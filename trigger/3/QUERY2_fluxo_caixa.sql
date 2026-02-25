-- Fluxo de Caixa Gerencial - Base QUERY2 com filtro de datas
-- Parâmetros: P_DTINI (DD/MM/YYYY), P_DTFIM (DD/MM/YYYY)
-- No JSP os parâmetros são injetados via string (dtInicio, dtFim)
SELECT
  TO_CHAR(rat.dhbaixa,'YYYY')   AS ANO,
  TO_CHAR(rat.dhbaixa,'MM')     AS MES,
  TO_CHAR(rat.dhbaixa,'MM/YYYY') AS MES_ANO,
  cus.codcencus,
  cus.descrcencus,
  CRN.CODNAT,
  NAT.DESCRNAT,
  NVL(SUM(CASE WHEN rat.recdesp = -1 THEN rat.vlrbaixa * -1 ELSE rat.vlrbaixa END), 0) AS vlrbaixa
FROM tsicus cus
LEFT JOIN TGFCRN CRN ON cus.codcencus = CRN.codcencus
LEFT JOIN VGFFINRAT rat ON CRN.codnat = rat.codnat
LEFT JOIN TGFNAT NAT ON rat.CODNAT = NAT.CODNAT
WHERE cus.codcencus >= 160000
  AND TRUNC(rat.dhbaixa) BETWEEN TO_DATE(:P_DTINI,'DD/MM/YYYY') AND TO_DATE(:P_DTFIM,'DD/MM/YYYY')
GROUP BY
  TO_CHAR(rat.dhbaixa,'YYYY'),
  TO_CHAR(rat.dhbaixa,'MM'),
  TO_CHAR(rat.dhbaixa,'MM/YYYY'),
  cus.codcencus,
  cus.descrcencus,
  CRN.CODNAT,
  NAT.DESCRNAT
ORDER BY 1, 2, 4, 6;
