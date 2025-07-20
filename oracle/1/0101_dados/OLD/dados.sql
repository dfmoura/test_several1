CREATE OR REPLACE PROCEDURE PRC_ENVIAR_EMAIL_PENDENCIAS IS
    -- Variáveis para controle e dados
    v_count_pendencias NUMBER := 0;
    v_proximo_codfila  NUMBER;
    v_assunto          VARCHAR2(256);
    v_corpo_email      VARCHAR2(4000);
    v_error_msg        VARCHAR2(4000);
    
    -- Cursor para requisições pendentes entre 1 e 13 dias
    CURSOR c_pendencias IS
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

BEGIN

    -- Processar cada pendência
    FOR rec IN c_pendencias LOOP
        BEGIN
            -- Obter próximo código de fila de forma segura
            SELECT NVL(MAX(CODFILA), 0) + 1 
            INTO v_proximo_codfila 
            FROM TMDFMG;

            -- Montar assunto
            v_assunto := 'Requisição Pendente de Liberação - Req. N°: ' || rec.NUCHAVE;

            -- Montar corpo do e-mail (versão simplificada para teste)
            v_corpo_email := 
                '<html><body>' ||
                '<p style="font-weight: normal; font-style: italic; color: blue;">Mensagem automática de teste</p>' ||
                '<br>' ||
                '<h2>A requisição n°: ' || rec.NUCHAVE || ' se encontra pendente de liberação.</h2>' ||
                '<p><strong>Usuário:</strong> ' || rec.NOMEUSU || '</p>' ||
                '<p><strong>Dias pendentes:</strong> ' || rec.DIAS_PENDENTES || '</p>' ||
                '<p><strong>Observação:</strong> ' || rec.OBSERVACAO || '</p>' ||
                '<br>' ||
                '<h3>Efetuar aprovação!</h3>' ||
                '<br>' ||
                '<p><strong>Departamento de Compras</strong></p>' ||
                '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo">' ||
                '</body></html>';

            -- Inserir o registro na tabela de envio de mensagens
            INSERT INTO TMDFMG (
                CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS,
                CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO,
                EMAIL, CODSMTP
            )
            VALUES (
                v_proximo_codfila, v_assunto, NULL, SYSDATE, 'Pendente',
                0, 0, v_corpo_email, 'E', 3,
                'diogo.moura@neuon.com.br', 11
            );


        END;
    END LOOP;

    -- Commit das inserções
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Processamento concluído com sucesso.');

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        v_error_msg := 'Erro geral na procedure: ' || SQLERRM;
        DBMS_OUTPUT.PUT_LINE('✗ ' || v_error_msg);
        RAISE_APPLICATION_ERROR(-20001, v_error_msg);
END PRC_ENVIAR_EMAIL_PENDENCIAS;

/*
-- ALTERNATIVE APPROACH: BULK OPERATIONS (Better Performance)
-- Uncomment and replace the above procedure if you want even better performance

CREATE OR REPLACE PROCEDURE PRC_ENVIAR_EMAIL_PENDENCIAS_BULK IS
    -- Type for bulk operations
    TYPE t_pendencia_rec IS RECORD (
        nuchave NUMBER,
        nomeusu VARCHAR2(100),
        dias_pendentes NUMBER,
        observacao VARCHAR2(1000),
        email VARCHAR2(500)
    );
    
    TYPE t_pendencia_table IS TABLE OF t_pendencia_rec;
    v_pendencias t_pendencia_table;
    v_count_pendencias NUMBER := 0;
    v_proximo_codfila NUMBER;
    v_assunto VARCHAR2(256);
    v_corpo_email VARCHAR2(4000);
    v_error_msg VARCHAR2(4000);
    v_success_count NUMBER := 0;
    v_error_count NUMBER := 0;

BEGIN
    -- Bulk fetch all pending items
    SELECT LIB.NUCHAVE,
           USU.NOMEUSU,
           SYSDATE - LIB.DHSOLICIT,
           NVL(CAB.OBSERVACAO, 'Sem observação'),
           USU.EMAIL
    BULK COLLECT INTO v_pendencias
    FROM TSILIB LIB
    INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
    INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
    WHERE LIB.DHLIB IS NULL
      AND CAB.TIPMOV = 'J'
      AND SYSDATE - LIB.DHSOLICIT BETWEEN 1 AND 13
      AND USU.EMAIL IS NOT NULL
    ORDER BY LIB.DHSOLICIT;

    v_count_pendencias := v_pendencias.COUNT;
    
    IF v_count_pendencias = 0 THEN
        DBMS_OUTPUT.PUT_LINE('Nenhuma pendência encontrada para processamento.');
        RETURN;
    END IF;

    DBMS_OUTPUT.PUT_LINE('Processando ' || v_count_pendencias || ' pendências...');

    -- Process each item
    FOR i IN 1..v_pendencias.COUNT LOOP
        BEGIN
            -- Get next queue code
            SELECT NVL(MAX(CODFILA), 0) + 1 
            INTO v_proximo_codfila 
            FROM TMDFMG;

            -- Build subject and email body
            v_assunto := 'Requisição Pendente de Liberação - Req. N°: ' || v_pendencias(i).nuchave;
            
            v_corpo_email := 
                '<html><body>' ||
                '<p style="font-weight: normal; font-style: italic; color: blue;">Mensagem automática de teste</p>' ||
                '<br>' ||
                '<h2>A requisição n°: ' || v_pendencias(i).nuchave || ' se encontra pendente de liberação.</h2>' ||
                '<p><strong>Usuário:</strong> ' || v_pendencias(i).nomeusu || '</p>' ||
                '<p><strong>Dias pendentes:</strong> ' || v_pendencias(i).dias_pendentes || '</p>' ||
                '<p><strong>Observação:</strong> ' || v_pendencias(i).observacao || '</p>' ||
                '<br>' ||
                '<h3>Efetuar aprovação!</h3>' ||
                '<br>' ||
                '<p><strong>Departamento de Compras</strong></p>' ||
                '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo">' ||
                '</body></html>';

            -- Insert into queue
            INSERT INTO TMDFMG (
                CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS,
                CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO,
                EMAIL, CODSMTP
            )
            VALUES (
                v_proximo_codfila, v_assunto, NULL, SYSDATE, 'Pendente',
                0, 0, v_corpo_email, 'E', 3,
                v_pendencias(i).email, 11
            );

            v_success_count := v_success_count + 1;
            DBMS_OUTPUT.PUT_LINE('✓ Email inserido para: ' || v_pendencias(i).email || ' | Req: ' || v_pendencias(i).nuchave || ' | Fila: ' || v_proximo_codfila);

        EXCEPTION
            WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                v_error_msg := 'Erro ao processar requisição ' || v_pendencias(i).nuchave || ': ' || SQLERRM;
                DBMS_OUTPUT.PUT_LINE('✗ ' || v_error_msg);
        END;
    END LOOP;

    -- Commit and report results
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Processamento concluído: ' || v_success_count || ' sucessos, ' || v_error_count || ' erros.');

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        v_error_msg := 'Erro geral na procedure: ' || SQLERRM;
        DBMS_OUTPUT.PUT_LINE('✗ ' || v_error_msg);
        RAISE_APPLICATION_ERROR(-20001, v_error_msg);
END PRC_ENVIAR_EMAIL_PENDENCIAS_BULK;
*/