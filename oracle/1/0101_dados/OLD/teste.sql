CREATE OR REPLACE PROCEDURE STP_REQ_MAIL_PEND_SATIS
AS
-- Procedure para enviar emails de notificação sobre liberações pendentes
    -- Cursor para percorrer os registros do SELECT
    CURSOR c_liberacoes_pendentes IS
        SELECT
            LIB.NUCHAVE,
            USU.NOMEUSU,
            SYSDATE - LIB.DHSOLICIT AS DIAS_PENDENTES,
            NVL(CAB.OBSERVACAO, 'Sem observação') AS OBSERVACAO,
            USU.EMAIL
        FROM TSILIB LIB
        INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
        INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
        WHERE LIB.DHLIB IS NULL
          AND CAB.TIPMOV = 'J'
          AND SYSDATE - LIB.DHSOLICIT BETWEEN 1 AND 13
          AND USU.EMAIL IS NOT NULL
        ORDER BY LIB.DHSOLICIT;
    
    -- Variáveis para armazenar os dados
    v_nuchave TSILIB.NUCHAVE%TYPE;
    v_nome_usuario TSIUSU.NOMEUSU%TYPE;
    v_dias_pendentes NUMBER;
    v_observacao VARCHAR2(4000);
    v_email TSIUSU.EMAIL%TYPE;
    
    -- Variáveis para o email
    v_assunto VARCHAR2(200);
    v_corpo VARCHAR2(4000);
    v_codfila NUMBER;
    
BEGIN
    -- Abrir o cursor
    OPEN c_liberacoes_pendentes;
    
    LOOP
        -- Buscar o próximo registro
        FETCH c_liberacoes_pendentes INTO v_nuchave, v_nome_usuario, v_dias_pendentes, v_observacao, v_email;
        
        -- Sair do loop quando não houver mais registros
        EXIT WHEN c_liberacoes_pendentes%NOTFOUND;
        
        -- Gerar código único para a fila (pode ser ajustado conforme necessidade)
        SELECT NVL(MAX(CODFILA), 0) + 1 INTO v_codfila FROM TMDFMG;
        
        -- Criar o assunto do email
        v_assunto := 'Notificação: Liberação Pendente - Nota ' || v_nuchave;
        
        -- Criar o corpo do email
        v_corpo := 'Prezado(a) ' || v_nome_usuario || ',' || CHR(13) || CHR(10) ||
                   CHR(13) || CHR(10) ||
                   'Informamos que a liberação da nota fiscal ' || v_nuchave || 
                   ' está pendente há ' || v_dias_pendentes || ' dia(s).' || CHR(13) || CHR(10) ||
                   CHR(13) || CHR(10) ||
                   'Observação: ' || v_observacao || CHR(13) || CHR(10) ||
                   CHR(13) || CHR(10) ||
                   'Por favor, verifique e proceda com a liberação necessária.' || CHR(13) || CHR(10) ||
                   CHR(13) || CHR(10) ||
                   'Atenciosamente,' || CHR(13) || CHR(10) ||
                   'Sistema de Notificações';
        
        -- Inserir o registro na tabela de envio de mensagens
        INSERT INTO TMDFMG (
            CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS,
            CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO,
            EMAIL, CODSMTP
        )
        VALUES (
            v_codfila, v_assunto, NULL, SYSDATE, 'Pendente',
            0, 0, v_corpo, 'E', 3,
            v_email, 11
        );
        
        -- Commit para cada inserção (opcional - pode ser movido para fora do loop)
        COMMIT;
        
    END LOOP;
    
    -- Fechar o cursor
    CLOSE c_liberacoes_pendentes;
    
    -- Log de conclusão
    DBMS_OUTPUT.PUT_LINE('Procedure executada com sucesso. Emails de notificação foram inseridos na fila.');
    
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, fazer rollback e mostrar mensagem
        ROLLBACK;
        DBMS_OUTPUT.PUT_LINE('Erro na execução da procedure: ' || SQLERRM);
        RAISE;
END PRC_ENVIAR_EMAILS_LIBERACAO_PENDENTE;
/

-- Exemplo de como executar a procedure
-- EXEC PRC_ENVIAR_EMAILS_LIBERACAO_PENDENTE;