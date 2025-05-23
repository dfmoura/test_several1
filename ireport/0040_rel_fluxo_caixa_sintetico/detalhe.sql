WITH BASE_DADOS AS (
  SELECT 
    CODCTABCOINT AS CONTA,
    DTVENC,
    RECDESP,
    PROVISAO,
    VLRDESDOB
  FROM TGFFIN
  WHERE
    DTVENC BETWEEN TO_DATE('22/04/2025','DD/MM/YYYY') AND TO_DATE('30/04/2025','DD/MM/YYYY')
    AND DHBAIXA IS NULL

  UNION ALL

  SELECT 
    AD_SIMULACAO_CONTA AS CONTA,
    AD_SIMULACAO_DTVENC AS DTVENC,
    AD_SIMULACAO_RECDESP AS RECDESP,
    AD_SIMULACAO_PROVISAO AS PROVISAO,
    AD_SIMULACAO_VLRDESDOB AS VLRDESDOB
  FROM TGAPEA
  WHERE
    AD_SIMULACAO_DTVENC BETWEEN TO_DATE('22/04/2025','DD/MM/YYYY') AND TO_DATE('30/04/2025','DD/MM/YYYY')
    AND AD_SIMULACAO_STATUS = 1
)

SELECT 
  NVL(CONTA, 0) CONTA,
  CASE WHEN NVL(CONTA, 0) = 0 THEN 'SEM CADASTRO' ELSE CODCTABCO || '-' || DESCRICAO END DESCRICAO,
  DTVENC,
  NVL(SUM(CASE WHEN RECDESP = 1 AND PROVISAO = 'S' THEN VLRDESDOB END), 0) AS A_RECEBER_PROV_S,
  NVL(SUM(CASE WHEN RECDESP = 1 AND NVL(PROVISAO, 'N') = 'N' THEN VLRDESDOB END), 0) AS A_RECEBER_PROV_N,
  NVL(SUM(CASE WHEN RECDESP = -1 AND PROVISAO = 'S' THEN -1 * VLRDESDOB END), 0) AS A_PAGAR_PROV_S,
  NVL(SUM(CASE WHEN RECDESP = -1 AND NVL(PROVISAO, 'N') = 'N' THEN -1 * VLRDESDOB END), 0) AS A_PAGAR_PROV_N,

  -- DIFERENÇA DO DIA
  NVL(SUM(CASE WHEN RECDESP = 1 THEN VLRDESDOB END), 0) -
  NVL(SUM(CASE WHEN RECDESP = -1 THEN VLRDESDOB END), 0) AS DIFERENCA,

  -- ACUMULADO
  SUM(
    NVL(SUM(CASE WHEN RECDESP = 1 THEN VLRDESDOB END), 0) -
    NVL(SUM(CASE WHEN RECDESP = -1 THEN VLRDESDOB END), 0)
  ) OVER (ORDER BY CONTA, DTVENC ROWS UNBOUNDED PRECEDING) AS DIFERENCA_ACUMULADA

FROM BASE_DADOS BAS
LEFT JOIN TSICTA CTA ON BAS.CONTA = CTA.CODCTABCOINT
GROUP BY CONTA, CODCTABCO, DESCRICAO, DTVENC
ORDER BY CONTA, DTVENC
