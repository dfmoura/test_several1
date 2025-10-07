-- =============================================
-- Trigger: TRG_EXIGE_TCBLAN_CODPARC (Versão SQL Server)
-- Descrição: Valida se a conta contábil exige parceiro antes do update
-- Adaptado do Oracle para SQL Server 2019
-- =============================================

CREATE OR ALTER TRIGGER TRG_EXIGE_TCBLAN_CODPARC
ON TCBLAN
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @v_exigeparc CHAR(1);
    
    -- Verifica se existe alguma conta contábil que exige parceiro nos registros atualizados
    IF EXISTS (
        SELECT 1 
        FROM inserted i
        INNER JOIN TCBPLA PLA ON PLA.CODCTACTB = i.CODCTACTB
        WHERE PLA.AD_EXIGPARCLCONT = 'S'
        AND (i.AD_CODPARC IS NULL OR LTRIM(RTRIM(CAST(i.AD_CODPARC AS VARCHAR(50)))) = '' OR i.AD_CODPARC = 0)
    )
    BEGIN
        -- Busca a primeira conta contábil que exige parceiro para formatação da mensagem
        SELECT TOP 1 @v_exigeparc = PLA.AD_EXIGPARCLCONT
        FROM inserted i
        INNER JOIN TCBPLA PLA ON PLA.CODCTACTB = i.CODCTACTB
        WHERE PLA.AD_EXIGPARCLCONT = 'S'
        AND (i.AD_CODPARC IS NULL OR LTRIM(RTRIM(CAST(i.AD_CODPARC AS VARCHAR(50)))) = '' OR i.AD_CODPARC = 0);
        
        -- Formata e exibe a mensagem de erro usando a função de formatação
        DECLARE @ErrorMessage NVARCHAR(4000);
        SET @ErrorMessage = dbo.FC_FORMATAHTML_NEUON('Ação não permitida!',
                                                   'A conta contábil exige que o parceiro seja informado, ',
                                                   'Informe o parceiro e tente novamente.');
        
        -- Lança o erro
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN;
    END;
END;
GO
