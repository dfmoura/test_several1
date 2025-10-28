SELECT 
    v.id_versao_orcamento,
    CASE 
        WHEN SUM(CASE WHEN ultimos.status_aprovacao = 'aprovado' THEN 1 ELSE 0 END) = COUNT(*)
        THEN 'aprovado'
        ELSE 'aguardando'
    END AS status_final
FROM (
    SELECT 
        f1.id_versao_orcamento,
        f1.id_aprovador,
        f1.status_aprovacao
    FROM fluxo_aprovacao_orcamento f1
    INNER JOIN (
        SELECT 
            id_versao_orcamento,
            id_aprovador,
            MAX(data_aprovacao) AS ultima_data
        FROM fluxo_aprovacao_orcamento
        GROUP BY id_versao_orcamento, id_aprovador
    ) f2 ON f2.id_versao_orcamento = f1.id_versao_orcamento
        AND f2.id_aprovador = f1.id_aprovador
        AND f2.ultima_data = f1.data_aprovacao
) AS ultimos
JOIN (SELECT DISTINCT id_versao_orcamento FROM fluxo_aprovacao_orcamento) v
  ON v.id_versao_orcamento = ultimos.id_versao_orcamento
GROUP BY v.id_versao_orcamento