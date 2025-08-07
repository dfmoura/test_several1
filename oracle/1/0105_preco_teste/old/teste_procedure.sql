-- Test script for STP_LIMITEFRETE_SATIS procedure
-- This script tests the procedure with various scenarios to ensure it doesn't return null values

DECLARE
    v_sucesso VARCHAR2(1);
    v_mensagem VARCHAR2(4000);
    v_codusulib NUMBER;
    v_test_nota INT := 12345; -- Replace with a valid NUNOTA for testing
BEGIN
    -- Test 1: Call the procedure
    DBMS_OUTPUT.PUT_LINE('=== Testando procedimento STP_LIMITEFRETE_SATIS ===');
    
    STP_LIMITEFRETE_SATIS(
        P_NUNOTA => v_test_nota,
        P_SUCESSO => v_sucesso,
        P_MENSAGEM => v_mensagem,
        P_CODUSULIB => v_codusulib
    );
    
    -- Display results
    DBMS_OUTPUT.PUT_LINE('Resultado do teste:');
    DBMS_OUTPUT.PUT_LINE('P_SUCESSO: ' || NVL(v_sucesso, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('P_MENSAGEM: ' || NVL(v_mensagem, 'NULL'));
    DBMS_OUTPUT.PUT_LINE('P_CODUSULIB: ' || NVL(TO_CHAR(v_codusulib), 'NULL'));
    
    -- Verify no null values are returned
    IF v_sucesso IS NULL THEN
        DBMS_OUTPUT.PUT_LINE('ERRO: P_SUCESSO está NULL');
    END IF;
    
    IF v_mensagem IS NULL THEN
        DBMS_OUTPUT.PUT_LINE('ERRO: P_MENSAGEM está NULL');
    END IF;
    
    IF v_codusulib IS NULL THEN
        DBMS_OUTPUT.PUT_LINE('ERRO: P_CODUSULIB está NULL');
    END IF;
    
    DBMS_OUTPUT.PUT_LINE('=== Teste concluído ===');
    
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Erro durante o teste: ' || SQLERRM);
END;
/ 