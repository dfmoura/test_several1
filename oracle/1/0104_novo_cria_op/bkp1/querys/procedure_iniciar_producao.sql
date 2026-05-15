-- ============================================================================
-- PROCEDURE: STP_INI_PROD_SATIS
-- ============================================================================
-- Descrição: Procedure para iniciar a produção de uma atividade
-- Baseado no arquivo: edicoes/iniciar_producao.md
-- 
-- Esta procedure executa as seguintes operações em sequência:
-- 1. Atualiza CODEXEC, CODUSU e DHACEITE na tabela TPRIATV
-- 2. Atualiza DHINICIO na tabela TPRIATV
-- 3. Insere um novo registro na tabela TPREIATV (Exceção de Atividade)
-- 4. Atualiza CODULTEXEC na tabela TPRIATV
--
-- ============================================================================
-- PARÂMETROS:
-- ============================================================================
-- @P_IDIATV (NUMBER, OBRIGATÓRIO)
--   Descrição: ID da instância de atividade (TPRIATV.IDIATV)
--   Exemplo: 296
--
-- @P_CODMTP (NUMBER, OPCIONAL - Default: 0)
--   Descrição: Código do motivo de parada (TPREIATV.CODMTP)
--   Exemplo: 0 (nenhum motivo de parada)
--
-- @P_OBSERVACAO (VARCHAR2, OPCIONAL - Default: NULL)
--   Descrição: Observação para a exceção de atividade (TPREIATV.OBSERVACAO)
--   Exemplo: 'Iniciado manualmente pelo usuário'
--
-- @P_TIPO (VARCHAR2, OPCIONAL - Default: 'N')
--   Descrição: Tipo da exceção de atividade (TPREIATV.TIPO)
--   Exemplo: 'N' (Normal)
--
-- @P_FORCAR_REINICIO (VARCHAR2, OPCIONAL - Default: 'N')
--   Descrição: Forçar reinício mesmo se atividade já estiver iniciada ('S' ou 'N')
--   Exemplo: 'S' para forçar reinício
--   NOTA: Se atividade já estiver iniciada e este parâmetro for 'N', a procedure aborta
--
-- ============================================================================
-- VALIDAÇÕES IMPLEMENTADAS:
-- ============================================================================
-- 1. Verifica se atividade já está iniciada (CODEXEC, CODUSU, DHACEITE, DHINICIO preenchidos)
-- 2. Verifica se já existe registro em TPREIATV para esta atividade
-- 3. Avisa se STP_GET_CODUSULOGADO retornar 0 (pode ser um problema)
-- 4. Aborta se atividade já iniciada e P_FORCAR_REINICIO = 'N'
--
-- ============================================================================
-- EXEMPLO DE EXECUÇÃO:
-- ============================================================================
-- Execução normal (só funciona se atividade não estiver iniciada):
-- EXEC STP_INI_PROD_SATIS(296);
-- 
-- Execução completa com todos os parâmetros:
-- EXEC STP_INI_PROD_SATIS(
--     P_IDIATV => 296,
--     P_CODMTP => 0,
--     P_OBSERVACAO => 'Iniciado manualmente',
--     P_TIPO => 'N',
--     P_FORCAR_REINICIO => 'N'
-- );
--
-- Forçar reinício de atividade já iniciada:
-- EXEC STP_INI_PROD_SATIS(
--     P_IDIATV => 296,
--     P_FORCAR_REINICIO => 'S'
-- );
--
-- ============================================================================

CREATE OR REPLACE PROCEDURE STP_INI_PROD_SATIS (
    -- Parâmetros obrigatórios
    P_IDIATV IN NUMBER,
    
    -- Parâmetros opcionais
    P_CODMTP IN NUMBER DEFAULT 0,
    P_OBSERVACAO IN VARCHAR2 DEFAULT NULL,
    P_TIPO IN VARCHAR2 DEFAULT 'N',
    P_FORCAR_REINICIO IN VARCHAR2 DEFAULT 'N'  -- 'S' para forçar reinício mesmo se já iniciada
)
IS
    -- Variáveis locais
    V_CODUSU NUMBER;           -- Código do usuário logado
    V_DATA_ATUAL DATE;         -- Data/hora atual do sistema
    V_IDEIATV NUMBER;          -- Próximo ID para TPREIATV.IDEIATV
    V_ROWS_AFFECTED NUMBER;    -- Contador de linhas afetadas
    V_JA_INICIADA NUMBER := 0; -- Flag para verificar se já está iniciada
    V_CODEXEC_ATUAL NUMBER;    -- CODEXEC atual da atividade
    V_CODUSU_ATUAL NUMBER;     -- CODUSU atual da atividade
    V_DHACEITE_ATUAL DATE;     -- DHACEITE atual da atividade
    V_DHINICIO_ATUAL DATE;     -- DHINICIO atual da atividade
    
BEGIN
    -- Habilitar output para debug
    DBMS_OUTPUT.PUT_LINE('========================================');
    DBMS_OUTPUT.PUT_LINE('INICIANDO STP_INI_PROD_SATIS');
    DBMS_OUTPUT.PUT_LINE('IDIATV recebido: ' || P_IDIATV);
    DBMS_OUTPUT.PUT_LINE('========================================');
    
    -- ========================================================================
    -- PASSO 1: Obter usuário logado e data atual
    -- ========================================================================
    BEGIN
        -- Obter código do usuário logado
        SELECT STP_GET_CODUSULOGADO INTO V_CODUSU FROM DUAL;
        
        -- Obter data/hora atual do sistema
        V_DATA_ATUAL := SYSDATE;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 1: Usuário obtido: ' || V_CODUSU);
        DBMS_OUTPUT.PUT_LINE('PASSO 1: Data/Hora: ' || TO_CHAR(V_DATA_ATUAL, 'DD/MM/YYYY HH24:MI:SS'));
        
        -- Validação: verificar se o usuário foi obtido
        IF V_CODUSU IS NULL THEN
            RAISE_APPLICATION_ERROR(-20001, 'Não foi possível obter o código do usuário logado');
        END IF;
        
        -- AVISO: Se o usuário retornado for 0, pode ser um problema
        IF V_CODUSU = 0 THEN
            DBMS_OUTPUT.PUT_LINE('AVISO: STP_GET_CODUSULOGADO retornou 0. Verifique se a função está funcionando corretamente.');
            DBMS_OUTPUT.PUT_LINE('AVISO: A procedure continuará com usuário 0, mas isso pode não ser o esperado.');
        END IF;
        
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20002, 'Função STP_GET_CODUSULOGADO não retornou valor');
        WHEN OTHERS THEN
            RAISE_APPLICATION_ERROR(-20003, 'Erro ao obter usuário logado: ' || SQLERRM);
    END;
    
    -- ========================================================================
    -- PASSO 2: Validar se a atividade existe e verificar estado atual
    -- ========================================================================
    BEGIN
        SELECT COUNT(*) INTO V_ROWS_AFFECTED
        FROM TPRIATV
        WHERE IDIATV = P_IDIATV;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 2: Verificando atividade...');
        DBMS_OUTPUT.PUT_LINE('PASSO 2: Registros encontrados: ' || V_ROWS_AFFECTED);
        
        IF V_ROWS_AFFECTED = 0 THEN
            RAISE_APPLICATION_ERROR(-20004, 'Atividade não encontrada. IDIATV: ' || P_IDIATV);
        END IF;
        
        -- Verificar estado atual da atividade e se já está iniciada
        FOR rec IN (SELECT CODEXEC, CODUSU, DHACEITE, DHINICIO, CODULTEXEC 
                    FROM TPRIATV 
                    WHERE IDIATV = P_IDIATV) LOOP
            V_CODEXEC_ATUAL := rec.CODEXEC;
            V_CODUSU_ATUAL := rec.CODUSU;
            V_DHACEITE_ATUAL := rec.DHACEITE;
            V_DHINICIO_ATUAL := rec.DHINICIO;
            
            DBMS_OUTPUT.PUT_LINE('PASSO 2: Estado atual - CODEXEC: ' || NVL(TO_CHAR(rec.CODEXEC), 'NULL') || 
                                 ', CODUSU: ' || NVL(TO_CHAR(rec.CODUSU), 'NULL') ||
                                 ', DHACEITE: ' || NVL(TO_CHAR(rec.DHACEITE, 'DD/MM/YYYY HH24:MI:SS'), 'NULL') ||
                                 ', DHINICIO: ' || NVL(TO_CHAR(rec.DHINICIO, 'DD/MM/YYYY HH24:MI:SS'), 'NULL'));
        END LOOP;
        
        -- Verificar se a atividade já está iniciada
        -- Considera iniciada se CODEXEC, CODUSU, DHACEITE e DHINICIO estão preenchidos
        IF V_CODEXEC_ATUAL IS NOT NULL 
           AND V_CODUSU_ATUAL IS NOT NULL 
           AND V_DHACEITE_ATUAL IS NOT NULL 
           AND V_DHINICIO_ATUAL IS NOT NULL THEN
            V_JA_INICIADA := 1;
            DBMS_OUTPUT.PUT_LINE('PASSO 2: ATENÇÃO - Atividade já está iniciada!');
            DBMS_OUTPUT.PUT_LINE('PASSO 2: CODEXEC atual: ' || V_CODEXEC_ATUAL || 
                                 ', CODUSU atual: ' || V_CODUSU_ATUAL);
            
            -- Se não forçar reinício, abortar
            IF P_FORCAR_REINICIO <> 'S' THEN
                RAISE_APPLICATION_ERROR(-20015, 
                    'Atividade já está iniciada (IDIATV: ' || P_IDIATV || 
                    ', CODEXEC: ' || V_CODEXEC_ATUAL || 
                    ', CODUSU: ' || V_CODUSU_ATUAL || 
                    '). Use P_FORCAR_REINICIO => ''S'' para forçar reinício.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('PASSO 2: Reinício forçado - continuando mesmo com atividade já iniciada');
            END IF;
        ELSE
            V_JA_INICIADA := 0;
            DBMS_OUTPUT.PUT_LINE('PASSO 2: Atividade não iniciada - procedendo normalmente');
        END IF;
        
    END;
    
    -- ========================================================================
    -- PASSO 3: Obter próximo IDEIATV para TPREIATV
    -- ========================================================================
    BEGIN
        DBMS_OUTPUT.PUT_LINE('PASSO 3: Obtendo próximo IDEIATV...');
        
        SELECT NVL(MAX(IDEIATV), 0) + 1 INTO V_IDEIATV
        FROM TPREIATV;
        
        IF V_IDEIATV IS NULL THEN
            V_IDEIATV := 1; -- Se não houver registros, começar com 1
        END IF;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 3: IDEIATV gerado: ' || V_IDEIATV);
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE_APPLICATION_ERROR(-20005, 'Erro ao obter próximo IDEIATV: ' || SQLERRM);
    END;
    
    -- ========================================================================
    -- PASSO 4: UPDATE TPRIATV - Definir CODEXEC, CODUSU e DHACEITE
    -- ========================================================================
    -- SQL: UPDATE TPRIATV SET CODEXEC = ?, CODUSU = ?, DHACEITE = ? 
    --      WHERE TPRIATV.IDIATV = ?
    BEGIN
        DBMS_OUTPUT.PUT_LINE('PASSO 4: Atualizando CODEXEC, CODUSU e DHACEITE...');
        
        -- Se já estava iniciada e não está forçando reinício, preservar valores existentes
        -- Caso contrário, atualizar com novos valores
        IF V_JA_INICIADA = 1 AND P_FORCAR_REINICIO <> 'S' THEN
            DBMS_OUTPUT.PUT_LINE('PASSO 4: Preservando valores existentes (não deve chegar aqui devido à validação anterior)');
            -- Não deveria chegar aqui, mas por segurança:
            UPDATE TPRIATV
            SET CODEXEC = V_CODEXEC_ATUAL,
                CODUSU = V_CODUSU_ATUAL,
                DHACEITE = V_DHACEITE_ATUAL
            WHERE IDIATV = P_IDIATV;
        ELSE
            -- Atualizar com novos valores (início normal ou reinício forçado)
            UPDATE TPRIATV
            SET CODEXEC = V_CODUSU,
                CODUSU = V_CODUSU,
                DHACEITE = V_DATA_ATUAL
            WHERE IDIATV = P_IDIATV;
        END IF;
        
        V_ROWS_AFFECTED := SQL%ROWCOUNT;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 4: Linhas atualizadas: ' || V_ROWS_AFFECTED);
        
        IF V_ROWS_AFFECTED = 0 THEN
            RAISE_APPLICATION_ERROR(-20006, 'Nenhuma linha atualizada na operação 1 (CODEXEC/CODUSU/DHACEITE)');
        END IF;
        
        -- Commit imediato após primeiro update
        COMMIT;
        DBMS_OUTPUT.PUT_LINE('PASSO 4: COMMIT realizado após atualização de CODEXEC/CODUSU/DHACEITE');
        
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20007, 'Erro ao atualizar CODEXEC/CODUSU/DHACEITE: ' || SQLERRM);
    END;
    
    -- ========================================================================
    -- PASSO 5: UPDATE TPRIATV - Definir DHINICIO
    -- ========================================================================
    -- SQL: UPDATE TPRIATV SET DHINICIO = ? WHERE TPRIATV.IDIATV = ?
    BEGIN
        DBMS_OUTPUT.PUT_LINE('PASSO 5: Atualizando DHINICIO...');
        
        -- Se já estava iniciada e não está forçando reinício, preservar valor existente
        IF V_JA_INICIADA = 1 AND P_FORCAR_REINICIO <> 'S' THEN
            UPDATE TPRIATV
            SET DHINICIO = V_DHINICIO_ATUAL
            WHERE IDIATV = P_IDIATV;
            DBMS_OUTPUT.PUT_LINE('PASSO 5: Preservando DHINICIO existente (não deve chegar aqui)');
        ELSE
            -- Atualizar com novo valor
            UPDATE TPRIATV
            SET DHINICIO = V_DATA_ATUAL
            WHERE IDIATV = P_IDIATV;
        END IF;
        
        V_ROWS_AFFECTED := SQL%ROWCOUNT;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 5: Linhas atualizadas: ' || V_ROWS_AFFECTED);
        
        IF V_ROWS_AFFECTED = 0 THEN
            RAISE_APPLICATION_ERROR(-20008, 'Nenhuma linha atualizada na operação 2 (DHINICIO)');
        END IF;
        
        -- Commit imediato após segundo update
        COMMIT;
        DBMS_OUTPUT.PUT_LINE('PASSO 5: COMMIT realizado após atualização de DHINICIO');
        
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20009, 'Erro ao atualizar DHINICIO: ' || SQLERRM);
    END;
    
    -- ========================================================================
    -- PASSO 6: INSERT TPREIATV - Inserir exceção de atividade
    -- ========================================================================
    -- SQL: INSERT INTO TPREIATV (CODEXEC, CODMTP, CODUSU, DHFINAL, DHINICIO, 
    --      IDEIATV, IDIATV, OBSERVACAO, TIPO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    -- NOTA: Só insere se não houver registro existente para esta atividade
    BEGIN
        -- Verificar se já existe registro em TPREIATV para esta atividade
        SELECT COUNT(*) INTO V_ROWS_AFFECTED
        FROM TPREIATV
        WHERE IDIATV = P_IDIATV
        AND TIPO = P_TIPO
        AND DHFINAL IS NULL;
        
        IF V_ROWS_AFFECTED > 0 THEN
            DBMS_OUTPUT.PUT_LINE('PASSO 6: ATENÇÃO - Já existe registro em TPREIATV para esta atividade');
            DBMS_OUTPUT.PUT_LINE('PASSO 6: IDIATV: ' || P_IDIATV || ', TIPO: ' || P_TIPO);
            
            IF P_FORCAR_REINICIO <> 'S' THEN
                RAISE_APPLICATION_ERROR(-20016, 
                    'Já existe registro em TPREIATV para esta atividade (IDIATV: ' || P_IDIATV || 
                    ', TIPO: ' || P_TIPO || '). Use P_FORCAR_REINICIO => ''S'' para forçar novo registro.');
            ELSE
                DBMS_OUTPUT.PUT_LINE('PASSO 6: Reinício forçado - inserindo novo registro mesmo com existente');
            END IF;
        END IF;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 6: Inserindo registro em TPREIATV...');
        DBMS_OUTPUT.PUT_LINE('PASSO 6: IDEIATV gerado: ' || V_IDEIATV);
        
        INSERT INTO TPREIATV (
            CODEXEC,
            CODMTP,
            CODUSU,
            DHFINAL,
            DHINICIO,
            IDEIATV,
            IDIATV,
            OBSERVACAO,
            TIPO
        ) VALUES (
            V_CODUSU,           -- CODEXEC: código do executante (usuário logado)
            P_CODMTP,           -- CODMTP: código do motivo de parada (parâmetro)
            V_CODUSU,           -- CODUSU: código do usuário (usuário logado)
            NULL,               -- DHFINAL: data/hora final (NULL - ainda não finalizada)
            V_DATA_ATUAL,       -- DHINICIO: data/hora de início (SYSDATE)
            V_IDEIATV,          -- IDEIATV: ID da exceção de atividade (gerado)
            P_IDIATV,           -- IDIATV: ID da instância de atividade (parâmetro)
            P_OBSERVACAO,       -- OBSERVACAO: observação (parâmetro opcional)
            P_TIPO              -- TIPO: tipo da exceção (parâmetro, default 'N')
        );
        
        V_ROWS_AFFECTED := SQL%ROWCOUNT;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 6: Linhas inseridas: ' || V_ROWS_AFFECTED);
        
        IF V_ROWS_AFFECTED = 0 THEN
            RAISE_APPLICATION_ERROR(-20010, 'Nenhuma linha inserida na operação 3 (INSERT TPREIATV)');
        END IF;
        
        -- Commit imediato após insert
        COMMIT;
        DBMS_OUTPUT.PUT_LINE('PASSO 6: COMMIT realizado após INSERT em TPREIATV');
        
    EXCEPTION
        WHEN DUP_VAL_ON_INDEX THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20011, 'Violação de chave única ao inserir em TPREIATV. IDEIATV: ' || V_IDEIATV);
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20012, 'Erro ao inserir em TPREIATV: ' || SQLERRM);
    END;
    
    -- ========================================================================
    -- PASSO 7: UPDATE TPRIATV - Definir CODULTEXEC
    -- ========================================================================
    -- SQL: UPDATE TPRIATV SET CODULTEXEC = ? WHERE TPRIATV.IDIATV = ?
    BEGIN
        DBMS_OUTPUT.PUT_LINE('PASSO 7: Atualizando CODULTEXEC...');
        
        UPDATE TPRIATV
        SET CODULTEXEC = V_CODUSU
        WHERE IDIATV = P_IDIATV;
        
        V_ROWS_AFFECTED := SQL%ROWCOUNT;
        
        DBMS_OUTPUT.PUT_LINE('PASSO 7: Linhas atualizadas: ' || V_ROWS_AFFECTED);
        
        IF V_ROWS_AFFECTED = 0 THEN
            RAISE_APPLICATION_ERROR(-20013, 'Nenhuma linha atualizada na operação 4 (CODULTEXEC)');
        END IF;
        
        -- Commit imediato após último update
        COMMIT;
        DBMS_OUTPUT.PUT_LINE('PASSO 7: COMMIT realizado após atualização de CODULTEXEC');
        
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20014, 'Erro ao atualizar CODULTEXEC: ' || SQLERRM);
    END;
    
    -- ========================================================================
    -- COMMIT FINAL: Confirmar todas as alterações (redundante, mas seguro)
    -- ========================================================================
    COMMIT;
    
    -- Log de sucesso
    DBMS_OUTPUT.PUT_LINE('========================================');
    DBMS_OUTPUT.PUT_LINE('SUCESSO: Produção iniciada com sucesso!');
    DBMS_OUTPUT.PUT_LINE('IDIATV: ' || P_IDIATV);
    DBMS_OUTPUT.PUT_LINE('IDEIATV criado: ' || V_IDEIATV);
    DBMS_OUTPUT.PUT_LINE('Usuário: ' || V_CODUSU);
    DBMS_OUTPUT.PUT_LINE('Data/Hora: ' || TO_CHAR(V_DATA_ATUAL, 'DD/MM/YYYY HH24:MI:SS'));
    DBMS_OUTPUT.PUT_LINE('========================================');
    
EXCEPTION
    -- Tratamento geral de erros
    WHEN OTHERS THEN
        -- Rollback em caso de erro
        ROLLBACK;
        
        -- Log do erro
        DBMS_OUTPUT.PUT_LINE('ERRO: ' || SQLERRM);
        DBMS_OUTPUT.PUT_LINE('Código do erro: ' || SQLCODE);
        
        -- Re-lançar o erro para o chamador
        RAISE;
END STP_INI_PROD_SATIS;
/

-- ============================================================================
-- GRANT: Conceder permissões de execução (se necessário)
-- ============================================================================
-- GRANT EXECUTE ON STP_INI_PROD_SATIS TO PUBLIC;
-- ou
-- GRANT EXECUTE ON STP_INI_PROD_SATIS TO nome_usuario;

-- ============================================================================
-- TESTE: Exemplo de como testar a procedure
-- ============================================================================
-- Habilitar output do DBMS_OUTPUT
-- SET SERVEROUTPUT ON;
--
-- Executar a procedure
-- EXEC STP_INI_PROD_SATIS(296);
--
-- Verificar se as alterações foram aplicadas
-- SELECT * FROM TPRIATV WHERE IDIATV = 296;
-- SELECT * FROM TPREIATV WHERE IDIATV = 296 AND TIPO = 'N' AND DHFINAL IS NULL;
-- ============================================================================

