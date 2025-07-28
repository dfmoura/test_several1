-- Script para criar todas as views modulares
-- Execute este script na ordem apresentada

-- 1. View para custo de satisfação
@view_custo_satisfacao.sql

-- 2. View para custo de satisfação atual
@view_custo_satisfacao_atual.sql

-- 3. View para ponderação por marca
@view_ponderacao_marca.sql

-- 4. View para metas e ticket médio
@view_metas_ticket_medio.sql

-- 5. View para faturamento dos últimos 12 meses
@view_faturamento_ult_12_meses.sql

-- 6. View para faturamento da safra
@view_faturamento_safra.sql

-- 7. View para preços atuais
@view_precos_atuais.sql

-- 8. View base principal (deve ser criada por último)
@view_base_principal.sql

-- Verificação das views criadas
SELECT VIEW_NAME, STATUS 
FROM USER_VIEWS 
WHERE VIEW_NAME LIKE 'VW_%'
ORDER BY VIEW_NAME; 