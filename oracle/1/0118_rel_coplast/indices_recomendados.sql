-- Índices recomendados para otimizar a performance da consulta
-- Estes índices devem ser criados considerando o uso e a frequência de consultas

-- ==========================================
-- ÍNDICES PRINCIPAIS PARA TGFFIN
-- ==========================================

-- Índice composto para a condição WHERE principal
CREATE NONCLUSTERED INDEX IX_TGFFIN_Performance_Principal 
ON TGFFIN (RECDESP, PROVISAO, DHBAIXA, ORIGEM)
INCLUDE (NUFIN, NUNOTA, CODPARC, DTVENC, DTVENCINIC, VLRDESDOB, VLRDESC, VLRBAIXA);

-- Índice para joins com TGFCAB
CREATE NONCLUSTERED INDEX IX_TGFFIN_NUNOTA 
ON TGFFIN (NUNOTA)
INCLUDE (NUFIN, NFCOMPLFIX);

-- Índice para operações bancárias
CREATE NONCLUSTERED INDEX IX_TGFFIN_NUBCO 
ON TGFFIN (NUBCO)
INCLUDE (NUFIN, VLRCHEQUE, VLRBAIXA);

-- Índice para antecipação bancária
CREATE NONCLUSTERED INDEX IX_TGFFIN_NUANTBANC 
ON TGFFIN (NUANTBANC)
INCLUDE (NUFIN);

-- ==========================================
-- ÍNDICES PARA TABELAS RELACIONADAS
-- ==========================================

-- TGFCAB - Para observações
CREATE NONCLUSTERED INDEX IX_TGFCAB_NUNOTA_OBSERVACAO 
ON TGFCAB (NUNOTA)
INCLUDE (OBSERVACAO, RATEADO);

-- TGFANB - Para antecipação bancária
CREATE NONCLUSTERED INDEX IX_TGFANB_NUFINTITORI 
ON TGFANB (NUFINTITORI, NUANTBANC)
INCLUDE (DTANTBANC);

-- TGFMBC - Para conciliação
CREATE NONCLUSTERED INDEX IX_TGFMBC_NUBCO 
ON TGFMBC (NUBCO)
INCLUDE (CONCILIADO, DHCONCILIACAO);

-- TCBINT - Para contabilização
CREATE NONCLUSTERED INDEX IX_TCBINT_NUNICO_ORIGEM 
ON TCBINT (NUNICO, ORIGEM);

-- TGFPIX - Para dados PIX
CREATE NONCLUSTERED INDEX IX_TGFPIX_NUFIN_SEQPIX 
ON TGFPIX (NUFIN, SEQPIX)
INCLUDE (IDTRANSACAO);

-- TGFCABVM e TGFFINVM - Para Vendamais
CREATE NONCLUSTERED INDEX IX_TGFCABVM_NUNOTA 
ON TGFCABVM (NUNOTA)
INCLUDE (CODOPERACAOVENDAMAIS, DHAPROVACAO);

CREATE NONCLUSTERED INDEX IX_TGFFINVM_NUFIN 
ON TGFFINVM (NUFIN)
INCLUDE (NUNOTA);

-- TIMDTL - Para dados TIM
CREATE NONCLUSTERED INDEX IX_TIMDTL_DTLPARCELA_HISTORICO 
ON TIMDTL (DTLPARCELA, DTLHISTORICO)
INCLUDE (DTLVALOR);

-- TGFIMF - Para impostos
CREATE NONCLUSTERED INDEX IX_TGFIMF_NUFIN 
ON TGFIMF (NUFIN)
INCLUDE (VALOR, TIPIMP);

-- ==========================================
-- ÍNDICES PARA TABELAS DE LOOKUP
-- ==========================================

-- TGFPAR - Para dados do parceiro
CREATE NONCLUSTERED INDEX IX_TGFPAR_CODPARC 
ON TGFPAR (CODPARC)
INCLUDE (CGC_CPF, CHAVEPIX, NOMEPARC);

-- TGFTIT - Para subtipo de venda
CREATE NONCLUSTERED INDEX IX_TGFTIT_CODTIPTIT 
ON TGFTIT (CODTIPTIT)
INCLUDE (SUBTIPOVENDA);

-- ==========================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ==========================================

-- Índice para cálculos de data
CREATE NONCLUSTERED INDEX IX_TGFFIN_DTVENC_DHBAIXA 
ON TGFFIN (DTVENC, DHBAIXA)
INCLUDE (NUFIN, VLRBAIXA, VLRDESC, VLRDESDOB);

-- Índice para TIM
CREATE NONCLUSTERED INDEX IX_TGFFIN_TIMORIGEM 
ON TGFFIN (TIMORIGEM)
INCLUDE (NUFIN, DTVENC, DHBAIXA, TIMDATADEJUR);

-- ==========================================
-- ESTATÍSTICAS
-- ==========================================

-- Atualizar estatísticas após criar os índices
-- EXEC sp_updatestats;

-- ==========================================
-- MONITORAMENTO
-- ==========================================

-- Script para monitorar o uso dos índices
/*
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates,
    s.last_user_seek,
    s.last_user_scan
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
WHERE i.object_id = OBJECT_ID('TGFFIN')
ORDER BY s.user_seeks + s.user_scans + s.user_lookups DESC;
*/

-- ==========================================
-- OBSERVAÇÕES IMPORTANTES
-- ==========================================

/*
1. Estes índices devem ser criados durante horário de baixo uso do sistema
2. Monitore o impacto na performance de INSERT/UPDATE/DELETE
3. Considere remover índices que não estejam sendo utilizados
4. Atualize as estatísticas regularmente
5. Use o Database Engine Tuning Advisor para análise adicional
6. Teste a performance antes e depois da implementação
*/
