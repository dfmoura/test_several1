-- =============================================
-- Trigger: TRG_INC_TCBINT_CODPARC (Versão SQL Server)
-- Descrição: Atualiza AD_CODPARC após inserção na tabela TCBINT
-- Adaptado do Oracle para SQL Server 2019
-- =============================================

CREATE OR ALTER TRIGGER TRG_INC_TCBINT_CODPARC
ON TCBINT
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @P_CODPARC INT;
    
    -- Processa registros com origem 'E' (Entrada)
    IF EXISTS (SELECT 1 FROM inserted WHERE ORIGEM = 'E')
    BEGIN
        UPDATE TCBLAN 
        SET AD_CODPARC = CAB.CODPARC
        FROM TCBLAN LAN
        INNER JOIN inserted i ON LAN.CODEMP = i.CODEMP
                              AND LAN.REFERENCIA = i.REFERENCIA
                              AND LAN.NUMLOTE = i.NUMLOTE
                              AND LAN.NUMLANC = i.NUMLANC
                              AND LAN.TIPLANC = i.TIPLANC
                              AND LAN.SEQUENCIA = i.SEQUENCIA
        INNER JOIN TGFCAB CAB ON CAB.NUNOTA = i.NUNICO
        INNER JOIN TCBPLA PLA ON PLA.CODCTACTB = LAN.CODCTACTB
        WHERE i.ORIGEM = 'E'
        AND ISNULL(PLA.AD_EXIGPARCLCONT,'N') = 'S';
    END;
    
    -- Processa registros com origem 'F' (Financeiro)
    IF EXISTS (SELECT 1 FROM inserted WHERE ORIGEM = 'F')
    BEGIN
        UPDATE TCBLAN 
        SET AD_CODPARC = FIN.CODPARC
        FROM TCBLAN LAN
        INNER JOIN inserted i ON LAN.CODEMP = i.CODEMP
                              AND LAN.REFERENCIA = i.REFERENCIA
                              AND LAN.NUMLOTE = i.NUMLOTE
                              AND LAN.NUMLANC = i.NUMLANC
                              AND LAN.TIPLANC = i.TIPLANC
                              AND LAN.SEQUENCIA = i.SEQUENCIA
        INNER JOIN TGFFIN FIN ON FIN.NUFIN = i.NUNICO
        INNER JOIN TCBPLA PLA ON PLA.CODCTACTB = LAN.CODCTACTB
        WHERE i.ORIGEM = 'F'
        AND ISNULL(PLA.AD_EXIGPARCLCONT,'N') = 'S';
    END;
    
    -- Processa registros com origem 'B' (Bancário)
    IF EXISTS (SELECT 1 FROM inserted WHERE ORIGEM = 'B')
    BEGIN
        UPDATE TCBLAN 
        SET AD_CODPARC = FIN.CODPARC
        FROM TCBLAN LAN
        INNER JOIN inserted i ON LAN.CODEMP = i.CODEMP
                              AND LAN.REFERENCIA = i.REFERENCIA
                              AND LAN.NUMLOTE = i.NUMLOTE
                              AND LAN.NUMLANC = i.NUMLANC
                              AND LAN.TIPLANC = i.TIPLANC
                              AND LAN.SEQUENCIA = i.SEQUENCIA
        INNER JOIN TGFFIN FIN ON FIN.NUFIN = i.NUNICO
        INNER JOIN TCBPLA PLA ON PLA.CODCTACTB = LAN.CODCTACTB
        WHERE i.ORIGEM = 'B'
        AND ISNULL(PLA.AD_EXIGPARCLCONT,'N') = 'S';
    END;
    
    -- Processa registros com origem 'R' (Receita)
    IF EXISTS (SELECT 1 FROM inserted WHERE ORIGEM = 'R')
    BEGIN
        UPDATE TCBLAN 
        SET AD_CODPARC = FIN.CODPARC
        FROM TCBLAN LAN
        INNER JOIN inserted i ON LAN.CODEMP = i.CODEMP
                              AND LAN.REFERENCIA = i.REFERENCIA
                              AND LAN.NUMLOTE = i.NUMLOTE
                              AND LAN.NUMLANC = i.NUMLANC
                              AND LAN.TIPLANC = i.TIPLANC
                              AND LAN.SEQUENCIA = i.SEQUENCIA
        INNER JOIN TGFFIN FIN ON FIN.NUFIN = i.NUNICO
        INNER JOIN TCBPLA PLA ON PLA.CODCTACTB = LAN.CODCTACTB
        WHERE i.ORIGEM = 'R'
        AND ISNULL(PLA.AD_EXIGPARCLCONT,'N') = 'S';
    END;
END;
GO
