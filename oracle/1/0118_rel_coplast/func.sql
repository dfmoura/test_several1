CREATE FUNCTION dbo.fn_FormatarDocumento (@Documento VARCHAR(50))
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @Resultado VARCHAR(20);

    -- Trata NULL de entrada
    IF @Documento IS NULL
        RETURN NULL;

    -- Remove espaços e mantém apenas dígitos (compatível com SQL Server)
    SET @Documento = LTRIM(RTRIM(@Documento));
    WHILE PATINDEX('%[^0-9]%', @Documento) > 0
        SET @Documento = STUFF(@Documento, PATINDEX('%[^0-9]%', @Documento), 1, '');

    -- Formatar CPF (11 dígitos)
    IF LEN(@Documento) = 11
        SET @Resultado = STUFF(STUFF(STUFF(@Documento,4,0,'.'),8,0,'.'),12,0,'-');

    -- Formatar CNPJ (14 dígitos)
    ELSE IF LEN(@Documento) = 14
        SET @Resultado = STUFF(STUFF(STUFF(STUFF(@Documento,3,0,'.'),7,0,'.'),11,0,'/'),16,0,'-');

    -- Caso não seja CPF nem CNPJ, retorna como veio (apenas dígitos)
    ELSE 
        SET @Resultado = @Documento;

    RETURN @Resultado;
END;
GO
