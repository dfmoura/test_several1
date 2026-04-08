            SELECT
              AMP.NUAPO,
              AMP.SEQAPA,
              AMP.SEQMP,
              AMP.CODPRODMP,
              PRO.DESCRPROD,
              AMP.CONTROLEMP,
              AMP.QTD,
              AMP.CODVOL,
              F_DESCROPC('TPRAMP','TIPOUSO',AMP.TIPOUSO) DESC_TIPOUSO
            FROM TPRAMP AMP
            INNER JOIN TGFPRO PRO ON AMP.CODPRODMP = PRO.CODPROD
            WHERE AMP.NUAPO = ${nVal} AND AMP.SEQAPA = ${sVal}
            ORDER BY 1, 2, 3