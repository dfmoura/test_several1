-- Comando INSERT simplificado para inserir funcionário na tabela tfpfun
-- Incluindo apenas os campos obrigatórios essenciais para evitar erros de tipo
INSERT INTO tfpfun (
    CODEMP,
    CODFUNC,
    NOMEFUNC,
    DTADM,
    PRIMEMPREGO,
    CONVMED,
    DTOPTFGTS,
    CODTOMADOR,
    RACAFUNCIONARIO,
    PARTPAT,
    REMUMINIMA,
    TIPDEFICIENCIA,
    CODCIDTRAB,
    SINDICALIZADO,
    TIPPONTO,
    DIAAPURAPONTO,
    DIRRECIPROCO,
    QUEMPAGARRA,
    PROVISAOFERIAS,
    PROVISAO13,
    DISPENSAPONTO,
    TEMPOPARCIAL,
    SEMINTEGRAL,
    NOVOEMPREGO,
    COMPSALARIO,
    COMPENSASABADO,
    MEI,
    CASADOBR,
    FILHOSBR,
    INDMV,
    ENVESOCIAL,
    TEMCONTRIBSINDICAL,
    APRENDIZGRAVIDA,
    IDCONSIG,
    DISPPEREXP,
    JORNADAESPPROF,
    PERTENCEDP,
    CONTRATOSUSP,
    ADERIMP927,
    AJUDACOMP,
    SUSPCONTRATO,
    APRENDCONTRIND,
    TRANSFEXTERNA,
    BLOQUEIABATIDAONLINE,
    DISPENSAMATRICULA,
    CTPSDIGITAL
) VALUES (
    1,                          -- CODEMP
    1,                          -- CODFUNC
    'JAMES HAT',                -- NOMEFUNC
    SYSDATE,                    -- DTADM (data atual)
    'S',                        -- PRIMEMPREGO
    'N',                        -- CONVMED
    SYSDATE,                    -- DTOPTFGTS (data atual)
    0,                          -- CODTOMADOR
    2,                          -- RACAFUNCIONARIO
    '2',                        -- PARTPAT
    0,                          -- REMUMINIMA
    0,                          -- TIPDEFICIENCIA
    0,                          -- CODCIDTRAB
    'N',                        -- SINDICALIZADO
    'S',                        -- TIPPONTO
    0,                          -- DIAAPURAPONTO
    'N',                        -- DIRRECIPROCO
    1,                          -- QUEMPAGARRA
    'S',                        -- PROVISAOFERIAS
    'S',                        -- PROVISAO13
    'N',                        -- DISPENSAPONTO
    'N',                        -- TEMPOPARCIAL
    'N',                        -- SEMINTEGRAL
    'N',                        -- NOVOEMPREGO
    1,                          -- COMPSALARIO
    'N',                        -- COMPENSASABADO
    'N',                        -- MEI
    'N',                        -- CASADOBR
    'N',                        -- FILHOSBR
    0,                          -- INDMV
    'N',                        -- ENVESOCIAL
    'N',                        -- TEMCONTRIBSINDICAL
    'N',                        -- APRENDIZGRAVIDA
    'N',                        -- IDCONSIG
    'N',                        -- DISPPEREXP
    'N',                        -- JORNADAESPPROF
    'N',                        -- PERTENCEDP
    'N',                        -- CONTRATOSUSP
    'S',                        -- ADERIMP927
    'N',                        -- AJUDACOMP
    'N',                        -- SUSPCONTRATO
    'N',                        -- APRENDCONTRIND
    'N',                        -- TRANSFEXTERNA
    'N',                        -- BLOQUEIABATIDAONLINE
    'N',                        -- DISPENSAMATRICULA
    'N'                         -- CTPSDIGITAL
);
