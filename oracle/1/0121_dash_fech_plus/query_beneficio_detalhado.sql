    SELECT 
        codvend,
        apelido,
        NVL(GATILHO, 0) AS GATILHO,
        NVL(VARIAVEL_PRECOMED, 0) AS VARIAVEL_PRECOMED,
        NVL(VARIAVEL_CUSTO_CR, 0) AS VARIAVEL_CUSTO_CR,
        NVL(VARIAVEL_FATURAMENTO, 0) AS VARIAVEL_FATURAMENTO,
        NVL(FAT_GRUPOPRODGAT, 0) AS FAT_GRUPOPRODGAT,
        -- Soma de todas as colunas pivot
        NVL(VARIAVEL_PRECOMED, 0) +
        NVL(GATILHO, 0) +
        NVL(VARIAVEL_CUSTO_CR, 0) +
        NVL(VARIAVEL_FATURAMENTO, 0) +
        NVL(FAT_GRUPOPRODGAT, 0) AS TOTAL
    FROM (
        select  
            tet.codvend,
            ven.apelido,
            tet.agrupador,
            tet.basecalc
        from AD_REALSINTET tet
        inner join tgfven ven on tet.codvend = ven.codvend
        where tet.codfech = 1
    ) 
    PIVOT (
        SUM(basecalc)
        FOR agrupador IN (
            'GATILHO' AS GATILHO,
            'VARIAVEL_PRECOMED' AS VARIAVEL_PRECOMED,
            'VARIAVEL_CUSTO_CR' AS VARIAVEL_CUSTO_CR,
            'VARIAVEL_FATURAMENTO' AS VARIAVEL_FATURAMENTO,
            'FAT_GRUPOPRODGAT' AS FAT_GRUPOPRODGAT
        )
    )
    ORDER BY codvend