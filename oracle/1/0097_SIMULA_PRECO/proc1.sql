CREATE OR REPLACE PROCEDURE "STP_ORGANIZA_TABPRECO" (
    P_CODUSU     NUMBER,
    P_IDSESSAO   VARCHAR2,
    P_QTDLINHAS  NUMBER,
    P_MENSAGEM   OUT VARCHAR2
) AS
    FIELD_ID NUMBER;
    -- Variables for cursor processing
    V_NUTAB_SEQ NUMBER;
    V_CODTAB NUMBER;
    V_DTVIGOR DATE;
    V_CODPROD NUMBER;
    V_NOVO_PRECO FLOAT;
    V_NUTAB VARCHAR2(20);
    
    -- Cursor to iterate over AD_TESTEPRECO records
    CURSOR C_TESTEPRECO IS
        SELECT CODTAB, DTVIGOR, CODPROD, NOVO_PRECO, NUTAB
        FROM AD_TESTEPRECO
        ORDER BY ID;
        
BEGIN
    FOR I IN 1..P_QTDLINHAS LOOP
        FIELD_ID := ACT_INT_FIELD(P_IDSESSAO, I, 'ID');
        -- lógica para FIELD_ID
    END LOOP;

/*BLOCO DE LIMPEZA*/
    DELETE FROM AD_TESTEPRECO
    WHERE ID NOT IN (
        SELECT ID FROM (
            SELECT ID,
                   ROW_NUMBER() OVER (
                       PARTITION BY CODTAB, CODPROD, DTVIGOR
                       ORDER BY ID DESC
                   ) AS NUM_LINHA
            FROM AD_TESTEPRECO
        )
        WHERE NUM_LINHA = 1
    );
/*FIM BLOCO DE LIMPEZA*/

/*BLOCO DE PROCESSAMENTO*/
    FOR REC IN C_TESTEPRECO LOOP
        -- Convert data types
        V_CODTAB := TO_NUMBER(REC.CODTAB);
        V_DTVIGOR := TO_DATE(REC.DTVIGOR, 'DD/MM/YYYY');
        V_CODPROD := TO_NUMBER(REC.CODPROD);
        V_NOVO_PRECO := TO_NUMBER(REC.NOVO_PRECO);
        V_NUTAB := REC.NUTAB;
        
        -- A) Insertion (when NUTAB = '0')
        IF V_NUTAB = '0' THEN
            -- Generate new NUTAB based on next available sequential value
            SELECT NVL(MAX(TO_NUMBER(NUTAB)), 0) + 1
            INTO V_NUTAB_SEQ
            FROM TGFTAB;
            
            -- Insert new record into TGFTAB
            INSERT INTO TGFTAB (CODTAB, DTVIGOR, DTALTER, NUTAB)
            VALUES (V_CODTAB, V_DTVIGOR, V_DTVIGOR, TO_CHAR(V_NUTAB_SEQ));
            
            -- Insert record into TGFEXC
            INSERT INTO TGFEXC (CODPROD, VLRVEND, NUTAB, CODLOCAL, TIPO)
            VALUES (V_CODPROD, V_NOVO_PRECO, TO_CHAR(V_NUTAB_SEQ), 0, 'V');
            
        -- B) Update (when NUTAB <> '0')
        ELSE
            -- Update TGFTAB
            UPDATE TGFTAB 
            SET DTALTER = V_DTVIGOR
            WHERE NUTAB = V_NUTAB AND CODTAB = V_CODTAB;
            
            -- Update TGFEXC
            UPDATE TGFEXC 
            SET VLRVEND = V_NOVO_PRECO
            WHERE NUTAB = V_NUTAB AND CODPROD = V_CODPROD;
        END IF;
    END LOOP;
/*FIM BLOCO DE PROCESSAMENTO*/

EXCEPTION
    WHEN OTHERS THEN
        -- Removido ROLLBACK
        P_MENSAGEM := 'Erro: ' || SQLERRM;
END;
/