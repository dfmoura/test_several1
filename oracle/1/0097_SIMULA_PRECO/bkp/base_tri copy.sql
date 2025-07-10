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
    P_COUNT     NUMBER;

BEGIN

    V_NOVO_PRECO := TO_NUMBER(:NEW.NOVO_PRECO, '9999999D99', 'NLS_NUMERIC_CHARACTERS = ''.,''');   --          TO_NUMBER(REPLACE(REPLACE(:NEW.NOVO_PRECO, '.', ''), ',', '.'));
    V_DTVIGOR := TO_DATE(:NEW.DTVIGOR,' DD/MM/YYYY');
    V_CODTAB    := TO_NUMBER(:NEW.CODTAB);
    V_CODPROD   := TO_NUMBER(:NEW.CODPROD);

IF NVL(V_CODPROD,0) <> 0 AND NVL(V_NOVO_PRECO,0) <> 0 THEN


      BEGIN
            SELECT NVL(NUTAB,0) INTO V_NUTAB  FROM TGFTAB WHERE CODTAB = :NEW.CODTAB AND DTVIGOR = :NEW.DTVIGOR;
      EXCEPTION WHEN NO_DATA_FOUND THEN
        V_NUTAB := NULL;
      END;

            -- Verificação de NUTAB vazio ou igual a 0
            IF (V_NUTAB IS NULL OR V_NUTAB = 0) THEN
                -- Gera próximo NUTAB
                SELECT NVL(MAX(NUTAB), 0) + 1
                INTO V_NUTAB
                FROM TGFTAB;

                  BEGIN
                        SELECT AD_DESCPER   INTO P_DESCPER FROM TGFTAB WHERE NUTAB = (SELECT MAX(NUTAB) FROM TGFTAB WHERE CODTAB = V_CODTAB);
                  EXCEPTION WHEN NO_DATA_FOUND THEN
                    P_DESCPER := NULL;
                  END;
                

                -- Inserção TGFTAB
                INSERT INTO TGFTAB (CODTAB, DTVIGOR, DTALTER, NUTAB, AD_DESCPER)
                VALUES (V_CODTAB, V_DTVIGOR, SYSDATE, V_NUTAB, P_DESCPER);

                -- Inserção TGFEXC
                INSERT INTO TGFEXC (CODPROD, VLRVENDA, NUTAB, CODLOCAL, TIPO)
                VALUES (V_CODPROD, V_NOVO_PRECO, V_NUTAB, 0, 'V');

                :NEW.STATUS := 'SUCESSO, PREÇO INCLUIDO';
                :NEW.DHALTER := SYSDATE;

            ELSE
                -- Atualização TGFTAB
                UPDATE TGFTAB 
                SET DTALTER = SYSDATE
                WHERE NUTAB = V_NUTAB AND CODTAB = V_CODTAB;

                SELECT COUNT(*) INTO P_COUNT FROM TGFEXC WHERE NUTAB = V_NUTAB AND CODPROD = V_CODPROD;
                
                IF P_COUNT > 0 THEN
                    -- Atualização TGFEXC
                    UPDATE TGFEXC 
                    SET VLRVENDA = V_NOVO_PRECO
                    WHERE NUTAB = V_NUTAB AND CODPROD = V_CODPROD;

                    :NEW.STATUS := 'SUCESSO, PREÇO ATUALIZADO';
                    :NEW.DHALTER := SYSDATE;
                    
               ELSE
               
                    -- Inserção TGFEXC
                    INSERT INTO TGFEXC (CODPROD, VLRVENDA, NUTAB, CODLOCAL, TIPO)
                    VALUES (V_CODPROD, V_NOVO_PRECO, V_NUTAB, 0, 'V');

                    :NEW.STATUS := 'SUCESSO, PREÇO INCLUIDO';
                    :NEW.DHALTER := SYSDATE;
               
               END IF;

            END IF;


END IF;

END;
/