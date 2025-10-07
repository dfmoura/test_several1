SELECT 
    cgc_cpf,
    CASE 
        WHEN LEN(cgc_cpf) = 11 THEN 
            -- CPF: 12345678901 -> 123.456.789-01
            STUFF(STUFF(STUFF(cgc_cpf,4,0,'.'),8,0,'.'),12,0,'-')
        
        WHEN LEN(cgc_cpf) = 14 THEN 
            -- CNPJ: 12345678000199 -> 12.345.678/0001-99
            STUFF(STUFF(STUFF(STUFF(cgc_cpf,3,0,'.'),7,0,'.'),11,0,'/'),16,0,'-')
        
        ELSE cgc_cpf -- Caso não seja 11 ou 14 dígitos
    END AS DocumentoFormatado
FROM tgfpar;

