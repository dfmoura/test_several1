-- =============================================
-- Stored Procedure: STP_INS_CODPARC_LANC_SKW (Versão SQL Server)
-- Descrição: Verifica e atualiza lançamentos sem CODPARC do ano atual e anterior
-- Adaptado do Oracle para SQL Server 2019
-- =============================================

CREATE OR ALTER PROCEDURE STP_INS_CODPARC_LANC_SKW
AS
BEGIN
    DECLARE @P_COUNT INT;
    DECLARE @P_COUNTPARCZERO INT;

    SET NOCOUNT ON;

    -- Verifica se existe lançamentos sem CODPARC do ano atual e ano anterior
    SELECT @P_COUNT = COUNT(NUMLANC)
    FROM TCBLAN
    WHERE ((AD_CODPARC = 0) OR (AD_CODPARC IS NULL))
    AND REFERENCIA >= DATEADD(MONTH, -24, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    AND (SELECT ISNULL(PLA.AD_EXIGPARCLCONT,'N') FROM TCBPLA PLA WHERE PLA.CODCTACTB = TCBLAN.CODCTACTB) = 'S';

    IF @P_COUNT <> 0
    BEGIN
        -- Atualiza registros com AD_CODPARC NULL para 0
        UPDATE TCBLAN 
        SET AD_CODPARC = 0
        WHERE AD_CODPARC IS NULL
        AND REFERENCIA >= DATEADD(MONTH, -24, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
        AND (SELECT ISNULL(PLA.AD_EXIGPARCLCONT,'N') FROM TCBPLA PLA WHERE PLA.CODCTACTB = TCBLAN.CODCTACTB) = 'S';

        -- Atualiza AD_CODPARC baseado na view VIEW_ORIGEM_LANCAMENTO_SKW
        UPDATE TCBLAN 
        SET AD_CODPARC = (SELECT MAX(CODPARC)
                         FROM VIEW_ORIGEM_LANCAMENTO_SKW V
                         WHERE V.CODEMP = TCBLAN.CODEMP
                         AND V.REFERENCIA = TCBLAN.REFERENCIA
                         AND V.NUMLOTE = TCBLAN.NUMLOTE
                         AND V.NUMLANC = TCBLAN.NUMLANC
                         AND V.TIPLANC = TCBLAN.TIPLANC
                         AND V.SEQUENCIA = TCBLAN.SEQUENCIA)
        WHERE (SELECT ISNULL(PLA.AD_EXIGPARCLCONT,'N') FROM TCBPLA PLA WHERE PLA.CODCTACTB = TCBLAN.CODCTACTB) = 'S'
        AND (AD_CODPARC IS NULL OR AD_CODPARC = 0)
        AND REFERENCIA >= DATEADD(MONTH, -24, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1));
    END;
END;
GO
