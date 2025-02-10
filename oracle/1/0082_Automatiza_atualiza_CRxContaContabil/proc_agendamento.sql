CREATE OR REPLACE PROCEDURE "INS_OR_ATU_TGFNCC_GM"
AS
/*Procedure para agendamento*/


    P_QTDLINHAS NUMBER,     -- Quantidade de registros selecionados

    FIELD_CODNAT NUMBER;
    FIELD_CODCTACTB NUMBER;
    FIELD_AD_CR23_COMERCIAL  VARCHAR2(100);
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
        WHERE SUBSTR(codcencus, 1, 2) = '23' or
        SUBSTR(codcencus, 1, 5) = '30003' or
        SUBSTR(codcencus, 1, 5) = '31003' or
        SUBSTR(codcencus, 1, 5) = '32003' or
        SUBSTR(codcencus, 1, 5) = '33004'
        ORDER BY 1;       

    -- Para campo AD_CR24_LOGISTICA
    CURSOR CUR_CODCENCUS1 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '24' or
        SUBSTR(codcencus, 1, 5) = '30002' or
        SUBSTR(codcencus, 1, 5) = '31002' or
        SUBSTR(codcencus, 1, 5) = '32002' or
        SUBSTR(codcencus, 1, 5) = '33005'
        ORDER BY 1;       

    -- Para campo AD_CR25_INDUSTRIA
    CURSOR CUR_CODCENCUS2 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '25' or
        SUBSTR(codcencus, 1, 2) = '34'
        ORDER BY 1;

    -- Para campo AD_CR26_ADMINISTRATIVO
    CURSOR CUR_CODCENCUS3 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '26' or
        SUBSTR(codcencus, 1, 5) = '30001' or
        SUBSTR(codcencus, 1, 5) = '31001' or
        SUBSTR(codcencus, 1, 5) = '32001' or
        SUBSTR(codcencus, 1, 5) = '33001'
        ORDER BY 1;       

    -- Para campo AD_CR27_PATRIMONIAL
    CURSOR CUR_CODCENCUS4 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '27' or
        SUBSTR(codcencus, 1, 5) = '33003'
        ORDER BY 1;       

    -- Para campo AD_CR28_TI
    CURSOR CUR_CODCENCUS5 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '28' or
        SUBSTR(codcencus, 1, 5) = '33002'
        ORDER BY 1;   

    -- Para campo AD_CR29_JURIDICO
    CURSOR CUR_CODCENCUS6 IS
        SELECT codcencus
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '29'
        ORDER BY 1;   

    -- Cursor para percorrer todas as linhas da tabela TGFNAT
    CURSOR CUR_TGFNAT IS
        SELECT CODNAT FROM TGFNAT;

BEGIN

    

    FOR REC IN CUR_TGFNAT LOOP
        FIELD_CODNAT := REC.CODNAT;



        -- Verificação para o campo AD_CR23_COMERCIAL
        -- Obter os valores da tabela TGFNAT
        SELECT CODNAT, CODCTACTB, AD_CR23_COMERCIAL
        INTO FIELD_CODNAT, FIELD_CODCTACTB, FIELD_AD_CR23_COMERCIAL
        FROM TGFNAT
        WHERE CODNAT = FIELD_CODNAT;

        -- Se o campo AD_CR23_COMERCIAL não for nulo, prosseguir
        IF FIELD_AD_CR23_COMERCIAL IS NOT NULL THEN
            FOR rec IN CUR_CODCENCUS LOOP
                -- Verificar se já existe o registro na tabela TGFNCC
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM TGFNCC
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE TGFNCC
                    SET CODCTACTB = FIELD_AD_CR23_COMERCIAL
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR23_COMERCIAL;
                ELSE
                    -- Caso contrário, inserir novo registro

                    INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (rec.codcencus, FIELD_CODNAT, FIELD_AD_CR23_COMERCIAL);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM TGFNCC
            WHERE CODNAT = FIELD_CODNAT
            AND (SUBSTR(codcencus, 1, 2) = '23' or
            SUBSTR(codcencus, 1, 5) = '30003' or
            SUBSTR(codcencus, 1, 5) = '31003' or
            SUBSTR(codcencus, 1, 5) = '32003' or
            SUBSTR(codcencus, 1, 5) = '33004');
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
                -- Verificar se já existe o registro na tabela TGFNCC
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM TGFNCC
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE TGFNCC
                    SET CODCTACTB = FIELD_AD_CR24_LOGISTICA
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR24_LOGISTICA;
                ELSE
                    -- Caso contrário, inserir novo registro

                    INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (rec.codcencus, FIELD_CODNAT, FIELD_AD_CR24_LOGISTICA);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM TGFNCC
            WHERE CODNAT = FIELD_CODNAT
            AND (SUBSTR(codcencus, 1, 2) = '24' or
            SUBSTR(codcencus, 1, 5) = '30002' or
            SUBSTR(codcencus, 1, 5) = '31002' or
            SUBSTR(codcencus, 1, 5) = '32002' or
            SUBSTR(codcencus, 1, 5) = '33005');
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
                -- Verificar se já existe o registro na tabela TGFNCC
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM TGFNCC
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE TGFNCC
                    SET CODCTACTB = FIELD_AD_CR25_INDUSTRIA
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR25_INDUSTRIA;
                ELSE
                    -- Caso contrário, inserir novo registro

                    INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (rec.codcencus, FIELD_CODNAT, FIELD_AD_CR25_INDUSTRIA);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM TGFNCC
            WHERE CODNAT = FIELD_CODNAT
            AND (SUBSTR(codcencus, 1, 2) = '25' or
            SUBSTR(codcencus, 1, 2) = '34');
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
                -- Verificar se já existe o registro na tabela TGFNCC
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM TGFNCC
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE TGFNCC
                    SET CODCTACTB = FIELD_AD_CR26_ADMINISTR
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR26_ADMINISTR;
                ELSE
                    -- Caso contrário, inserir novo registro

                    INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (rec.codcencus, FIELD_CODNAT, FIELD_AD_CR26_ADMINISTR);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM TGFNCC
            WHERE CODNAT = FIELD_CODNAT
            AND (SUBSTR(codcencus, 1, 2) = '26' or
            SUBSTR(codcencus, 1, 5) = '30001' or
            SUBSTR(codcencus, 1, 5) = '31001' or
            SUBSTR(codcencus, 1, 5) = '32001' or
            SUBSTR(codcencus, 1, 5) = '33001');
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
                -- Verificar se já existe o registro na tabela TGFNCC
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM TGFNCC
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE TGFNCC
                    SET CODCTACTB = FIELD_AD_CR27_PATRIMONI
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR27_PATRIMONI;
                ELSE
                    -- Caso contrário, inserir novo registro

                    INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (rec.codcencus, FIELD_CODNAT, FIELD_AD_CR27_PATRIMONI);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM TGFNCC
            WHERE CODNAT = FIELD_CODNAT
            AND (SUBSTR(codcencus, 1, 2) = '27' or
        SUBSTR(codcencus, 1, 5) = '33003');
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
                -- Verificar se já existe o registro na tabela TGFNCC
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM TGFNCC
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE TGFNCC
                    SET CODCTACTB = FIELD_AD_CR28_TECNOLOGI
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR28_TECNOLOGI;
                ELSE
                    -- Caso contrário, inserir novo registro

                    INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (rec.codcencus, FIELD_CODNAT, FIELD_AD_CR28_TECNOLOGI);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM TGFNCC
            WHERE CODNAT = FIELD_CODNAT
            AND (SUBSTR(codcencus, 1, 2) = '28' or
            SUBSTR(codcencus, 1, 5) = '33002');
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
                -- Verificar se já existe o registro na tabela TGFNCC
                BEGIN
                    SELECT COUNT(*)
                    INTO v_codigo
                    FROM TGFNCC
                    WHERE CODCENCUS = rec.codcencus
                      AND CODNAT = FIELD_CODNAT;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_codigo := 0;
                END;
                
                -- Se existir, atualizar apenas se o CODCTACTB for diferente
                IF v_codigo > 0 THEN
                    UPDATE TGFNCC
                    SET CODCTACTB = FIELD_AD_CR29_JURIDICOS
                    WHERE CODCENCUS = rec.codcencus 
                      AND CODNAT = FIELD_CODNAT
                      AND CODCTACTB <> FIELD_AD_CR29_JURIDICOS;
                ELSE
                    -- Caso contrário, inserir novo registro

                    INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                    VALUES (rec.codcencus, FIELD_CODNAT, FIELD_AD_CR29_JURIDICOS);
                END IF;
            END LOOP;
        ELSE
            DELETE FROM TGFNCC
            WHERE CODNAT = FIELD_CODNAT
            AND SUBSTR(codcencus, 1, 2) = '29';
        END IF;




    END LOOP;

    -- Mensagem de sucesso


END;
/