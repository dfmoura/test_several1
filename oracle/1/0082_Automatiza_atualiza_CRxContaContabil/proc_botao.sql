CREATE OR REPLACE PROCEDURE "INS_OR_ATU_TGFNCC_GM" (
    P_CODUSU NUMBER,        -- Código do usuário logado
    P_IDSESSAO VARCHAR2,    -- Identificador da execução
    P_QTDLINHAS NUMBER,     -- Quantidade de registros selecionados
    P_MENSAGEM OUT VARCHAR2 -- Mensagem de retorno
) AS
    FIELD_CODNAT NUMBER;
    FIELD_CODCTACTB NUMBER;
    FIELD_AD_CR23_COMERCIAL_ VARCHAR2(100);
    FIELD_AD_CR24_LOGISTICA  VARCHAR2(100);
    FIELD_AD_CR25_INDUSTRIA  VARCHAR2(100);
    FIELD_AD_CR26_ADMINISTR  VARCHAR2(100);
    FIELD_AD_CR27_PATRIMONI  VARCHAR2(100);
    FIELD_AD_CR28_TECNOLOGI  VARCHAR2(100);
    FIELD_AD_CR29_JURIDICOS  VARCHAR2(100);


    v_codigo NUMBER;

    -- Para campo AD_CR23_COMERCIAL
    CURSOR CUR_CODCENCUS IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 3) = '603';       

    -- Para campo AD_CR24_LOGISTICA
    CURSOR CUR_CODCENCUS1 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 5) = '60903';       

    -- Para campo AD_CR25_INDUSTRIA
    CURSOR CUR_CODCENCUS2 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 5) = '90707';

    -- Para campo AD_CR26_ADMINISTRATIVO
    CURSOR CUR_CODCENCUS3 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 5) = '60902';       

    -- Para campo AD_CR27_PATRIMONIAL
    CURSOR CUR_CODCENCUS4 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 3) = '700';       

    -- Para campo AD_CR28_TI
    CURSOR CUR_CODCENCUS5 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 5) = '61001';   

    -- Para campo AD_CR29_JURIDICO
    CURSOR CUR_CODCENCUS6 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 5) = '61002';   

BEGIN
    FOR I IN 1..P_QTDLINHAS LOOP
        FIELD_CODNAT := ACT_INT_FIELD(P_IDSESSAO, I, 'CODNAT');



        -- Verificação para o campo AD_CR23_COMERCIAL
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR23_COMERCIAL_
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR23_COMERCIAL_
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR23_COMERCIAL_ não for nulo, prosseguir
        IF FIELD_AD_CR23_COMERCIAL_ IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS LOOP
                -- Verificar se já existe o registro na tabela AD_TGFNCC2
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM AD_TGFNCC2
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE AD_TGFNCC2
                    SET CODCTACTB = FIELD_AD_CR23_COMERCIAL_
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR23_COMERCIAL_;
                ELSE
                    -- Caso contrário, inserir novo registro
                    BEGIN
                        SELECT NVL(MAX(CODIGO), 0) + 1
                        INTO v_codigo
                        FROM AD_TGFNCC2;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_codigo := 1;
                    END;
                    
                    INSERT INTO AD_TGFNCC2 (CODIGO, CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (v_codigo, rec.codcencus, FIELD_CODNAT, FIELD_AD_CR23_COMERCIAL_);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM AD_TGFNCC2
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(CODCENCUS, 1, 3) = '603';
        END IF;



        -- Verificação para o campo AD_CR24_LOGISTICA
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR24_LOGISTICA
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR24_LOGISTICA
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR24_LOGISTICA não for nulo, prosseguir
        IF FIELD_AD_CR24_LOGISTICA IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS1 LOOP
                -- Verificar se já existe o registro na tabela AD_TGFNCC2
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM AD_TGFNCC2
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE AD_TGFNCC2
                    SET CODCTACTB = FIELD_AD_CR24_LOGISTICA
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR24_LOGISTICA;
                ELSE
                    -- Caso contrário, inserir novo registro
                    BEGIN
                        SELECT NVL(MAX(CODIGO), 0) + 1
                        INTO v_codigo
                        FROM AD_TGFNCC2;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_codigo := 1;
                    END;
                    
                    INSERT INTO AD_TGFNCC2 (CODIGO, CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (v_codigo, rec.codcencus, FIELD_CODNAT, FIELD_AD_CR24_LOGISTICA);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM AD_TGFNCC2
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(codcencus, 1, 5) = '60903';
        END IF;



        -- Verificação para o campo AD_CR25_INDUSTRIA
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR25_INDUSTRIA
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR25_INDUSTRIA
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR25_INDUSTRIA não for nulo, prosseguir
        IF FIELD_AD_CR25_INDUSTRIA IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS2 LOOP
                -- Verificar se já existe o registro na tabela AD_TGFNCC2
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM AD_TGFNCC2
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE AD_TGFNCC2
                    SET CODCTACTB = FIELD_AD_CR25_INDUSTRIA
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR25_INDUSTRIA;
                ELSE
                    -- Caso contrário, inserir novo registro
                    BEGIN
                        SELECT NVL(MAX(CODIGO), 0) + 1
                        INTO v_codigo
                        FROM AD_TGFNCC2;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_codigo := 1;
                    END;
                    
                    INSERT INTO AD_TGFNCC2 (CODIGO, CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (v_codigo, rec.codcencus, FIELD_CODNAT, FIELD_AD_CR25_INDUSTRIA);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM AD_TGFNCC2
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(codcencus, 1, 5) = '90707';
        END IF;






        -- Verificação para o campo AD_CR26_ADMINISTRATIVO
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR26_ADMINISTRATIVO
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR26_ADMINISTR
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR26_ADMINISTRATIVO não for nulo, prosseguir
        IF FIELD_AD_CR26_ADMINISTR IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS3 LOOP
                -- Verificar se já existe o registro na tabela AD_TGFNCC2
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM AD_TGFNCC2
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE AD_TGFNCC2
                    SET CODCTACTB = FIELD_AD_CR26_ADMINISTR
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR26_ADMINISTR;
                ELSE
                    -- Caso contrário, inserir novo registro
                    BEGIN
                        SELECT NVL(MAX(CODIGO), 0) + 1
                        INTO v_codigo
                        FROM AD_TGFNCC2;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_codigo := 1;
                    END;
                    
                    INSERT INTO AD_TGFNCC2 (CODIGO, CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (v_codigo, rec.codcencus, FIELD_CODNAT, FIELD_AD_CR26_ADMINISTR);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM AD_TGFNCC2
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(codcencus, 1, 5) = '60902';
        END IF;




        -- Verificação para o campo AD_CR27_PATRIMONIAL
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR27_PATRIMONIAL
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR27_PATRIMONI
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR27_PATRIMONIAL não for nulo, prosseguir
        IF FIELD_AD_CR27_PATRIMONI IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS4 LOOP
                -- Verificar se já existe o registro na tabela AD_TGFNCC2
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM AD_TGFNCC2
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE AD_TGFNCC2
                    SET CODCTACTB = FIELD_AD_CR27_PATRIMONI
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR27_PATRIMONI;
                ELSE
                    -- Caso contrário, inserir novo registro
                    BEGIN
                        SELECT NVL(MAX(CODIGO), 0) + 1
                        INTO v_codigo
                        FROM AD_TGFNCC2;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_codigo := 1;
                    END;
                    
                    INSERT INTO AD_TGFNCC2 (CODIGO, CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (v_codigo, rec.codcencus, FIELD_CODNAT, FIELD_AD_CR27_PATRIMONI);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM AD_TGFNCC2
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(codcencus, 1, 3) = '700';
        END IF;





        -- Verificação para o campo AD_CR28_TI
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR28_TI
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR28_TECNOLOGI
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR28_TI não for nulo, prosseguir
        IF FIELD_AD_CR28_TECNOLOGI IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS5 LOOP
                -- Verificar se já existe o registro na tabela AD_TGFNCC2
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM AD_TGFNCC2
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE AD_TGFNCC2
                    SET CODCTACTB = FIELD_AD_CR28_TECNOLOGI
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR28_TECNOLOGI;
                ELSE
                    -- Caso contrário, inserir novo registro
                    BEGIN
                        SELECT NVL(MAX(CODIGO), 0) + 1
                        INTO v_codigo
                        FROM AD_TGFNCC2;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_codigo := 1;
                    END;
                    
                    INSERT INTO AD_TGFNCC2 (CODIGO, CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (v_codigo, rec.codcencus, FIELD_CODNAT, FIELD_AD_CR28_TECNOLOGI);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM AD_TGFNCC2
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(codcencus, 1, 5) = '61001';
        END IF;



        -- Verificação para o campo AD_CR29_JURIDICO
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR29_JURIDICO
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR29_JURIDICOS
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR29_JURIDICO não for nulo, prosseguir
        IF FIELD_AD_CR29_JURIDICOS IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS5 LOOP
                -- Verificar se já existe o registro na tabela AD_TGFNCC2
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM AD_TGFNCC2
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE AD_TGFNCC2
                    SET CODCTACTB = FIELD_AD_CR29_JURIDICOS
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR29_JURIDICOS;
                ELSE
                    -- Caso contrário, inserir novo registro
                    BEGIN
                        SELECT NVL(MAX(CODIGO), 0) + 1
                        INTO v_codigo
                        FROM AD_TGFNCC2;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_codigo := 1;
                    END;
                    
                    INSERT INTO AD_TGFNCC2 (CODIGO, CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (v_codigo, rec.codcencus, FIELD_CODNAT, FIELD_AD_CR29_JURIDICOS);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM AD_TGFNCC2
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(codcencus, 1, 5) = '61002';
        END IF;




    END LOOP;

    -- Mensagem de sucesso
    P_MENSAGEM := 'Processo concluído com sucesso.';

END;
/