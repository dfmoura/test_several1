CREATE OR REPLACE PROCEDURE INS_OR_ATU_TGFNCC_GM
AS
    TYPE t_cursors IS TABLE OF VARCHAR2(100) INDEX BY VARCHAR2(10);
    v_codigos    t_cursors;
    v_codnats    t_cursors;
    v_codigo     NUMBER;
    FIELD_CODNAT NUMBER;
    FIELD_CODCTACTB NUMBER;
    v_campo_nome VARCHAR2(100);
    v_campo_valor VARCHAR2(100);

    CURSOR CUR_TGFNAT IS
        SELECT CODNAT, CODCTACTB, AD_CR23_COMERCIAL, AD_CR24_LOGISTICA, AD_CR25_INDUSTRIA, AD_CR26_ADMINISTRATIVO,
               AD_CR27_PATRIMONIAL, AD_CR28_TI, AD_CR29_JURIDICO
        FROM TGFNAT
		WHERE AD_CR23_COMERCIAL IS NOT NULL 
		   OR AD_CR24_LOGISTICA IS NOT NULL 
		   OR AD_CR25_INDUSTRIA IS NOT NULL 
		   OR AD_CR26_ADMINISTRATIVO IS NOT NULL 
		   OR AD_CR27_PATRIMONIAL IS NOT NULL 
		   OR AD_CR28_TI IS NOT NULL 
		   OR AD_CR29_JURIDICO IS NOT NULL;
    
    CURSOR CUR_CODCENCUS(p_prefix VARCHAR2) IS
        SELECT CODCENCUS FROM TSICUS WHERE ATIVO = 'S' AND ANALITICO = 'S' 
        AND (SUBSTR(CODCENCUS, 1, 2) = p_prefix OR AD_GRUPO_CR_CONTACONTAB = p_prefix)
        ORDER BY 1;
BEGIN
    FOR REC IN CUR_TGFNAT LOOP
        FIELD_CODNAT := REC.CODNAT;
        FIELD_CODCTACTB := REC.CODCTACTB;
        
        v_codigos('23') := REC.AD_CR23_COMERCIAL;
        v_codigos('24') := REC.AD_CR24_LOGISTICA;
        v_codigos('25') := REC.AD_CR25_INDUSTRIA;
        v_codigos('26') := REC.AD_CR26_ADMINISTRATIVO;
        v_codigos('27') := REC.AD_CR27_PATRIMONIAL;
        v_codigos('28') := REC.AD_CR28_TI;
        v_codigos('29') := REC.AD_CR29_JURIDICO;
        
        FOR i IN 23 .. 29 LOOP
            v_campo_valor := v_codigos(TO_CHAR(i));
            IF v_campo_valor IS NOT NULL THEN
                FOR REC_CENCUS IN CUR_CODCENCUS(TO_CHAR(i)) LOOP
                    BEGIN
                        SELECT COUNT(*) INTO v_codigo FROM TGFNCC 
                        WHERE CODCENCUS = REC_CENCUS.CODCENCUS AND CODNAT = FIELD_CODNAT;
                    EXCEPTION WHEN NO_DATA_FOUND THEN v_codigo := 0;
                    END;
                    
                    IF v_codigo > 0 THEN
                        UPDATE TGFNCC SET CODCTACTB = v_campo_valor
                        WHERE CODCENCUS = REC_CENCUS.CODCENCUS 
                          AND CODNAT = FIELD_CODNAT
                          AND CODCTACTB <> v_campo_valor;
                    ELSE
                        INSERT INTO TGFNCC (CODCENCUS, CODNAT, CODCTACTB)
                        VALUES (REC_CENCUS.CODCENCUS, FIELD_CODNAT, v_campo_valor);
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END;
