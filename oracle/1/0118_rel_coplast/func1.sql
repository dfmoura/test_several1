CREATE FUNCTION fn_FormCPF_CNPJ (@Documento VARCHAR(20))
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @Resultado VARCHAR(20);

    -- Remove espaços
    SET @Documento = LTRIM(RTRIM(@Documento));

    -- Formatar CPF (11 dígitos)
    IF LEN(@Documento) = 11
        SET @Resultado = 
            STUFF(STUFF(STUFF(@Documento,4,0,'.'),8,0,'.'),12,0,'-');

    -- Formatar CNPJ (14 dígitos)
    ELSE IF LEN(@Documento) = 14
        SET @Resultado = 
            STUFF(STUFF(STUFF(STUFF(@Documento,3,0,'.'),7,0,'.'),11,0,'/'),16,0,'-');

    -- Caso não seja CPF nem CNPJ
    ELSE 
        SET @Resultado = @Documento;

    RETURN @Resultado;
END;
GO
