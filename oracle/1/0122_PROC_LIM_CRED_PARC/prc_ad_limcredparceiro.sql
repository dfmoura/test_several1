CREATE OR REPLACE PROCEDURE satisprd.prc_sincroniza_limcredparceiro IS
BEGIN
    -- Remove os registros existentes para garantir sincronismo com a consulta base
    DELETE FROM satisprd.ad_limcredparceiro;

    -- Reinsere os dados atualizados a partir da consulta padronizada, gerando o código sequencial
    INSERT INTO satisprd.ad_limcredparceiro (
        codigo,
        codparc,
        limcredconsed,
        limcreddisp,
        limcredtotal,
        nomeparc
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY fonte.codparc) AS codigo,
        fonte.codparc,
        fonte.limcredconsed,
        fonte.limcreddisp,
        fonte.limcredtotal,
        fonte.nomeparc
    FROM (
        SELECT DISTINCT
            dados.codparcmatriz AS codparc,
            dados.razaosocial AS nomeparc,
            dados.limcred AS limcredtotal,
            dados.limcredconsum AS limcredconsed,
            dados.limcreddisp
        FROM (
            SELECT
                COALESCE(par.codparcmatriz, par.codparc) AS codparcmatriz,
                COALESCE(par2.razaosocial, par.razaosocial) AS razaosocial,
                NVL(par2.limcred, 0) AS limcred,
                SUM(NVL(fin.vlrdesdob, 0)) AS limcredconsum,
                NVL(par2.limcred, 0) - SUM(NVL(fin.vlrdesdob, 0)) AS limcreddisp
            FROM tgfpar par
            LEFT JOIN tgffin fin ON par.codparc = fin.codparc
            LEFT JOIN tgfpar par2 ON par.codparcmatriz = par2.codparc
            LEFT JOIN tgfcab cab ON fin.nunota = cab.nunota
            WHERE fin.recdesp = 1
              AND fin.dhbaixa IS NULL
              AND (cab.statusnota = 'L' OR fin.nunota IS NULL)
              AND par.cliente = 'S'
            GROUP BY
                COALESCE(par.codparcmatriz, par.codparc),
                COALESCE(par2.razaosocial, par.razaosocial),
                par2.limcred

            UNION ALL

            SELECT
                COALESCE(par.codparcmatriz, par.codparc) AS codparcmatriz,
                COALESCE(par2.razaosocial, par.razaosocial) AS razaosocial,
                NVL(par2.limcred, 0) AS limcred,
                0 AS limcredconsum,
                NVL(par2.limcred, 0) AS limcreddisp
            FROM tgfpar par
            LEFT JOIN tgfpar par2 ON par.codparcmatriz = par2.codparc
            WHERE par.cliente = 'S'
              AND COALESCE(par.codparcmatriz, par.codparc) IS NOT NULL
              AND COALESCE(par.codparcmatriz, par.codparc) NOT IN (
                  SELECT
                      COALESCE(par.codparcmatriz, par.codparc)
                  FROM tgfpar par
                  LEFT JOIN tgffin fin ON par.codparc = fin.codparc
                  LEFT JOIN tgfpar par2 ON par.codparcmatriz = par2.codparc
                  LEFT JOIN tgfcab cab ON fin.nunota = cab.nunota
                  WHERE fin.recdesp = 1
                    AND fin.dhbaixa IS NULL
                    AND (cab.statusnota = 'L' OR fin.nunota IS NULL)
                    AND par.cliente = 'S'
                  GROUP BY
                      COALESCE(par.codparcmatriz, par.codparc)
              )
        ) dados
    ) fonte;
EXCEPTION
    WHEN OTHERS THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            fc_formatahtml(
                'Erro ao sincronizar a tabela AD_LIMCREDPARCEIRO.',
                SQLERRM,
                'Revise a consulta base e tente novamente.'
            )
        );
END prc_sincroniza_limcredparceiro;
/

