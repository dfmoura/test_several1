CREATE OR REPLACE TRIGGER TRG_BLOQ_DEL_CAB_MON
BEFORE DELETE ON TGFCAB
FOR EACH ROW
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
      INTO v_count
      FROM tgfcab cab
      INNER JOIN TGFTOP top ON cab.codtipoper = top.codtipoper
        AND cab.dhtipoper = (SELECT MAX(t2.dhalter)
                               FROM TGFTOP t2
                              WHERE t2.codtipoper = top.codtipoper)
     WHERE top.nfe <> 'M'
       AND NOT EXISTS (
            SELECT 1
              FROM TGFINU u
             WHERE u.codemp = cab.codemp
               AND u.numnota = cab.numnota
               AND u.serienota = cab.serienota
           )
       AND cab.nunota = :OLD.NUNOTA;

    IF v_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Não permitida a exclusão devido a geração do número da nota fiscal, favor prosseguir com o faturamento.');
    END IF;
END;
/