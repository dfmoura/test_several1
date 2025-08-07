CREATE OR REPLACE PROCEDURE STP_LIMITEFRETE_SATIS(
    P_NUNOTA       IN  INT,
    P_SUCESSO      OUT VARCHAR2,
    P_MENSAGEM     OUT VARCHAR2,
    P_CODUSULIB    OUT NUMBER

) AS       
    P_CARGA        NUMBER;
    P_VLRNOTA      NUMBER;
    P_PERCENTUAL   NUMBER;
    P_OBSLIB       VARCHAR2(4000);
    P_OBSCARGA     VARCHAR2(4000);
    P_CODUSULIBEVE NUMBER;
    P_PAR          VARCHAR2(10);

BEGIN
    -- Initialize output parameters
    P_SUCESSO := 'S';
    P_MENSAGEM := '';
    P_CODUSULIB := 0;

    -- Get order data with proper null handling
    BEGIN
        SELECT NVL(ORDEMCARGA,0), NVL(VLRNOTA,0) 
        INTO P_CARGA, P_VLRNOTA 
        FROM TGFCAB 
        WHERE NUNOTA = P_NUNOTA;
    EXCEPTION 
        WHEN NO_DATA_FOUND THEN
            P_SUCESSO := 'N';
            P_MENSAGEM := 'Nota fiscal não encontrada: ' || P_NUNOTA;
            RETURN;
        WHEN OTHERS THEN
            P_SUCESSO := 'N';
            P_MENSAGEM := 'Erro ao consultar nota fiscal: ' || SQLERRM;
            RETURN;
    END;

    -- Only process if there's a cargo order
    IF P_CARGA = 0 THEN
        P_SUCESSO := 'S';
        P_MENSAGEM := 'Ordem de carga não encontrada - liberação não necessária';
        RETURN;
    END IF;

    -- Calculate freight percentage with improved error handling
    BEGIN
        SELECT NVL(ROUND(
            CASE 
                WHEN SUM(CAB.VLRNOTA) > 0 THEN 
                    (NVL(P_VLRNOTA,0) * 100) / SUM(CAB.VLRNOTA)
                ELSE 0 
            END, 2), 0)
        INTO P_PERCENTUAL
        FROM TGFCAB CAB
        INNER JOIN TGFTOP TOP ON CAB.CODTIPOPER = TOP.CODTIPOPER 
            AND CAB.DHTIPOPER = TOP.DHALTER
        WHERE CAB.VLRNOTA > 0 
            AND NVL(P_VLRNOTA,0) > 0
            AND NVL(TOP.AD_TIPOPED,0) = 2 -- FILTRA PEDIDOS CONFERIDOS
            AND CAB.ORDEMCARGA = P_CARGA;
    EXCEPTION 
        WHEN NO_DATA_FOUND THEN
            P_PERCENTUAL := 0;
        WHEN OTHERS THEN
            P_SUCESSO := 'N';
            P_MENSAGEM := 'Erro ao calcular percentual de frete: ' || SQLERRM;
            RETURN;
    END;

    -- Find the user liberator based on percentage range
    BEGIN
        SELECT NVL(MAX(ADA.CODUSU), 0)
        INTO P_CODUSULIBEVE
        FROM AD_LIMITEALCADA ADA
        JOIN AD_LIMITALCADACARGDET DET ON ADA.CODIGO = DET.CODIGO
        WHERE DET.EVENTO = 1105
            AND P_PERCENTUAL >= NVL(DET.FAIXA_INI, 0)
            AND (DET.FAIXA_FIN IS NULL OR P_PERCENTUAL < DET.FAIXA_FIN);
    EXCEPTION 
        WHEN NO_DATA_FOUND THEN
            P_CODUSULIBEVE := 0;
        WHEN OTHERS THEN
            P_SUCESSO := 'N';
            P_MENSAGEM := 'Erro ao buscar usuário liberador: ' || SQLERRM;
            RETURN;
    END;

    -- Check if user liberator was found
    IF P_CODUSULIBEVE = 0 THEN
        P_SUCESSO := 'N';
        P_MENSAGEM := 'Usuário liberador não encontrado para o percentual: ' || 
                      NVL(P_PERCENTUAL, 0) || '%';
        P_CODUSULIB := 0;
        RETURN;
    END IF;

    -- Set success parameters
    P_SUCESSO := 'N';
    P_MENSAGEM := 'LIBERAÇÃO DO FRETE DA O.C ' || P_CARGA || 
                  ' // Vlr.Frete: ' || NVL(P_VLRNOTA, 0) || 
                  ' Proporção frete sobre as vendas: ' || NVL(P_PERCENTUAL, 0) || '%.' ||
                  'Obs.Solicitante: ';
    P_CODUSULIB := P_CODUSULIBEVE;

EXCEPTION
    WHEN OTHERS THEN
        P_SUCESSO := 'N';
        P_MENSAGEM := 'Erro inesperado no procedimento STP_LIMITEFRETE_SATIS: ' || SQLERRM;
        P_CODUSULIB := 0;

END;
/