CREATE OR REPLACE TRIGGER TRG_I_U_TESTEPRECO_SATIS
BEFORE UPDATE OR INSERT ON AD_TESTEPRECO
FOR EACH ROW
DECLARE
    -- Variáveis auxiliares
    FIELD_ID        NUMBER;
    V_NUTAB_SEQ     NUMBER;
    V_CODTAB        NUMBER;
    V_DTVIGOR       DATE;
    V_CODPROD       NUMBER;
    V_NOVO_PRECO    NUMBER;
    V_NUTAB         NUMBER;
    P_DESCPER       CHAR;
    P_COUNT         NUMBER;
    V_ERROR_MSG     VARCHAR2(4000);

BEGIN
    -- Inicialização com tratamento de erro
    BEGIN
        V_NOVO_PRECO := TO_NUMBER(:NEW.NOVO_PRECO, '9999999D99', 'NLS_NUMERIC_CHARACTERS = ''.,''');
    EXCEPTION WHEN OTHERS THEN
        V_NOVO_PRECO := NULL;
        V_ERROR_MSG := 'Erro ao converter NOVO_PRECO: ' || SQLERRM;
    END;

    BEGIN
        V_DTVIGOR := TO_DATE(:NEW.DTVIGOR, 'DD/MM/YYYY');
    EXCEPTION WHEN OTHERS THEN
        V_DTVIGOR := NULL;
        V_ERROR_MSG := V_ERROR_MSG || ' Erro ao converter DTVIGOR: ' || SQLERRM;
    END;

    BEGIN
        V_CODTAB := TO_NUMBER(:NEW.CODTAB);
    EXCEPTION WHEN OTHERS THEN
        V_CODTAB := NULL;
        V_ERROR_MSG := V_ERROR_MSG || ' Erro ao converter CODTAB: ' || SQLERRM;
    END;

    BEGIN
        V_CODPROD := TO_NUMBER(:NEW.CODPROD);
    EXCEPTION WHEN OTHERS THEN
        V_CODPROD := NULL;
        V_ERROR_MSG := V_ERROR_MSG || ' Erro ao converter CODPROD: ' || SQLERRM;
    END;

    -- Verificação de dados válidos
    IF NVL(V_CODPROD,0) <> 0 AND NVL(V_NOVO_PRECO,0) <> 0 AND V_DTVIGOR IS NOT NULL AND V_CODTAB IS NOT NULL THEN

        -- Busca NUTAB existente
        BEGIN
            SELECT NVL(NUTAB,0) INTO V_NUTAB  
            FROM TGFTAB 
            WHERE CODTAB = V_CODTAB AND DTVIGOR = V_DTVIGOR;
        EXCEPTION WHEN NO_DATA_FOUND THEN
            V_NUTAB := NULL;
        END;

        -- Verificação de NUTAB vazio ou igual a 0
        IF (V_NUTAB IS NULL OR V_NUTAB = 0) THEN
            -- Gera próximo NUTAB com tratamento de concorrência
            BEGIN
                SELECT NVL(MAX(NUTAB), 0) + 1
                INTO V_NUTAB
                FROM TGFTAB;
                
                -- Verifica se o NUTAB já existe (proteção contra race condition)
                WHILE EXISTS (SELECT 1 FROM TGFTAB WHERE NUTAB = V_NUTAB) LOOP
                    V_NUTAB := V_NUTAB + 1;
                END LOOP;
            EXCEPTION WHEN OTHERS THEN
                V_ERROR_MSG := V_ERROR_MSG || ' Erro ao gerar NUTAB: ' || SQLERRM;
                RAISE;
            END;

            -- Busca AD_DESCPER da tabela mais recente para o CODTAB
            BEGIN
                SELECT AD_DESCPER INTO P_DESCPER 
                FROM TGFTAB 
                WHERE NUTAB = (SELECT MAX(NUTAB) FROM TGFTAB WHERE CODTAB = V_CODTAB)
                AND ROWNUM = 1;
            EXCEPTION WHEN NO_DATA_FOUND THEN
                P_DESCPER := NULL;
            END;

            -- Inserção TGFTAB
            BEGIN
                INSERT INTO TGFTAB (CODTAB, DTVIGOR, DTALTER, NUTAB, AD_DESCPER)
                VALUES (V_CODTAB, V_DTVIGOR, SYSDATE, V_NUTAB, P_DESCPER);
            EXCEPTION WHEN OTHERS THEN
                V_ERROR_MSG := V_ERROR_MSG || ' Erro ao inserir TGFTAB: ' || SQLERRM;
                RAISE;
            END;

            -- Inserção TGFEXC
            BEGIN
                INSERT INTO TGFEXC (CODPROD, VLRVENDA, NUTAB, CODLOCAL, TIPO)
                VALUES (V_CODPROD, V_NOVO_PRECO, V_NUTAB, 0, 'V');
            EXCEPTION WHEN OTHERS THEN
                V_ERROR_MSG := V_ERROR_MSG || ' Erro ao inserir TGFEXC: ' || SQLERRM;
                RAISE;
            END;

            :NEW.STATUS := 'SUCESSO, PREÇO INCLUIDO';
            :NEW.DHALTER := SYSDATE;

        ELSE
            -- Atualização TGFTAB
            BEGIN
                UPDATE TGFTAB 
                SET DTALTER = SYSDATE
                WHERE NUTAB = V_NUTAB AND CODTAB = V_CODTAB;
            EXCEPTION WHEN OTHERS THEN
                V_ERROR_MSG := V_ERROR_MSG || ' Erro ao atualizar TGFTAB: ' || SQLERRM;
                RAISE;
            END;

            -- Verifica se o produto já existe na tabela de exceção
            BEGIN
                SELECT COUNT(*) INTO P_COUNT 
                FROM TGFEXC 
                WHERE NUTAB = V_NUTAB AND CODPROD = V_CODPROD;
            EXCEPTION WHEN OTHERS THEN
                P_COUNT := 0;
            END;
            
            IF P_COUNT > 0 THEN
                -- Atualização TGFEXC
                BEGIN
                    UPDATE TGFEXC 
                    SET VLRVENDA = V_NOVO_PRECO
                    WHERE NUTAB = V_NUTAB AND CODPROD = V_CODPROD;
                EXCEPTION WHEN OTHERS THEN
                    V_ERROR_MSG := V_ERROR_MSG || ' Erro ao atualizar TGFEXC: ' || SQLERRM;
                    RAISE;
                END;

                :NEW.STATUS := 'SUCESSO, PREÇO ATUALIZADO';
                :NEW.DHALTER := SYSDATE;
                
            ELSE
                -- Inserção TGFEXC
                BEGIN
                    INSERT INTO TGFEXC (CODPROD, VLRVENDA, NUTAB, CODLOCAL, TIPO)
                    VALUES (V_CODPROD, V_NOVO_PRECO, V_NUTAB, 0, 'V');
                EXCEPTION WHEN OTHERS THEN
                    V_ERROR_MSG := V_ERROR_MSG || ' Erro ao inserir TGFEXC: ' || SQLERRM;
                    RAISE;
                END;

                :NEW.STATUS := 'SUCESSO, PREÇO INCLUIDO';
                :NEW.DHALTER := SYSDATE;
            END IF;
        END IF;

    ELSE
        -- Dados inválidos
        :NEW.STATUS := 'ERRO: Dados inválidos - ' || NVL(V_ERROR_MSG, 'Valores obrigatórios não fornecidos');
        :NEW.DHALTER := SYSDATE;
    END IF;

EXCEPTION WHEN OTHERS THEN
    :NEW.STATUS := 'ERRO: ' || SUBSTR(SQLERRM, 1, 3800);
    :NEW.DHALTER := SYSDATE;
    RAISE;
END;
/