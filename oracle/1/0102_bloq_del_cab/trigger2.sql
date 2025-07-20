CREATE OR REPLACE TRIGGER TRG_BLOQ_DEL_CAB_SATIS
BEFORE DELETE ON TGFCAB
FOR EACH ROW
DECLARE
    v_count_nfe NUMBER;
    v_count_inu NUMBER;
BEGIN
    -- Verifica se top.nfe <> 'M' para o registro atual: Convencional (Não Usa NF-e)
    SELECT COUNT(*)
      INTO v_count_nfe
      FROM tgfcab cab
      INNER JOIN TGFTOP top ON cab.codtipoper = top.codtipoper
        AND cab.dhtipoper = (SELECT MAX(t2.dhalter)
                               FROM TGFTOP t2
                              WHERE t2.codtipoper = top.codtipoper)
     WHERE top.nfe <> 'M'
       AND cab.nunota = :OLD.NUNOTA;

    -- Verifica se existem registros em TGFINU para o registro atual
    SELECT COUNT(*)
      INTO v_count_inu
      FROM TGFINU u
     WHERE u.codemp = :OLD.CODEMP
       AND u.numnota = :OLD.NUMNOTA
       AND u.serienota = :OLD.SERIENOTA;

    -- Bloqueia a exclusão se qualquer uma das condições for atendida
    IF v_count_nfe > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Não permitida a exclusão: top.nfe <> ''M'' para este registro.');
    END IF;

    IF v_count_inu > 0 THEN
        RAISE_APPLICATION_ERROR(-20002, 'Não permitida a exclusão: existem registros relacionados em TGFINU.');
    END IF;
END;
/