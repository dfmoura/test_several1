create or replace PROCEDURE STP_CRIA_VIAGEM_GUI_1 (
    P_CODUSU NUMBER,        -- Código do usuário logado
    P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
    P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
    P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
    FIELD_ORDEMCARGA NUMBER;
    FIELD_NUNOTA NUMBER;
    P_ORDEMCARGA NUMBER;
BEGIN

    -- Colher o número da ordem de carga antes do loop
    SELECT MAX(ORDEMCARGA) + 1 INTO P_ORDEMCARGA FROM TGFORD WHERE CODEMP = 2;

            INSERT INTO TGFORD (CODEMP, ORDEMCARGA, CODVEICULO,CODREG, CODPARCMOTORISTA, CODPARCORIG, CODPARCTRANSP, PESOMAX,SITUACAO, CODUSU, DTALTER)
            VALUES (2, P_ORDEMCARGA, 0, 0, 6, 6, 6, 0, 'A', P_CODUSU, SYSDATE);


    FOR I IN 1..P_QTDLINHAS -- Este loop permite obter o valor de campos dos registros envolvidos na execução.
    LOOP
        -- Obtendo valor NUNOTA
        FIELD_NUNOTA := ACT_INT_FIELD(P_IDSESSAO, I, 'NUNOTA');
        -- Obtendo valor ORDEMCARGA
        SELECT DISTINCT ORDEMCARGA INTO FIELD_ORDEMCARGA FROM TGFCAB WHERE NUNOTA = FIELD_NUNOTA;

        IF FIELD_ORDEMCARGA IS NULL THEN
            -- Inserindo TGFORD


            -- Atualizando TGFCAB
            UPDATE TGFCAB SET ORDEMCARGA = P_ORDEMCARGA WHERE NUNOTA = FIELD_NUNOTA;

            P_MENSAGEM := 'Ordem de Carga criada com sucesso!';
        ELSE
            P_MENSAGEM := 'Movimento :' || FIELD_NUNOTA || ', possui O.C.:'||FIELD_ORDEMCARGA;
        END IF;
    END LOOP;

END;
/