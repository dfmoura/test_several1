"Rever personalização que gera notificação da TSIAVI de liberação liberada. Ela apresenta apenas o código de liberação, o que não é intuitivo.
Rever com o usuário se a notificação é necessária e caso sim, melhorar a descrição da mesma."

============================================

select distinct name
from user_source
where type in ('PROCEDURE','TRIGGER')
AND upper(TEXT) LIKE UPPER('%TSIAVI%')
ORDER BY NAME

============================================


TRG_TSILIB_TSIAVI_SATIS


============================================


CREATE OR REPLACE TRIGGER "SATISTST"."TRG_TSILIB_TSIAVI_SATIS" 
BEFORE UPDATE ON TSILIB
REFERENCING NEW AS NEW OLD AS OLD
FOR EACH ROW
 WHEN (
NEW.EVENTO <> 25
      ) DECLARE
    ERRMSG              VARCHAR2(255);
    ERROR               EXCEPTION;
    P_MENSAGEM          TSIAVI.DESCRICAO%TYPE;
    P_MENSAGEM2         TSIAVI.DESCRICAO%TYPE;    
    P_NUAVISO           TSIAVI.NUAVISO%TYPE;
    P_NOMEUSU           TSIUSU.NOMEUSU%TYPE;
BEGIN

  IF (UPDATING('DHLIB') AND :OLD.DHLIB IS NULL AND :NEW.DHLIB IS NOT NULL ) THEN
    
     P_MENSAGEM := 'Solicitação Nro <b>' || :NEW.NUCHAVE ||'</b> FOI LIBERADA!<br>' || SUBSTR(P_MENSAGEM, 1, 1980);
  
    BEGIN 
      SELECT NVL(MAX(AVI.NUAVISO),0) INTO P_NUAVISO FROM TSIAVI AVI;
      EXCEPTION WHEN NO_DATA_FOUND THEN P_NUAVISO := 1;
    END;
    
    BEGIN
      SELECT NVL(USU.NOMEUSU, 'SUP') INTO P_NOMEUSU FROM TSIUSU USU WHERE USU.CODUSU = :NEW.CODUSUSOLICIT;
      EXCEPTION WHEN NO_DATA_FOUND THEN P_NOMEUSU := 'SUP';
    END;
    
    BEGIN
      INSERT INTO TSIAVI (NUAVISO, TITULO, DESCRICAO, SOLUCAO, IDENTIFICADOR, IMPORTANCIA, CODUSU, CODGRUPO, TIPO, DHCRIACAO, CODUSUREMETENTE, NUAVISOPAI)
      VALUES (P_NUAVISO + 1, 'Solicitação Liberada', P_MENSAGEM, '', 'PERSONALIZADO', 0, :NEW.CODUSUSOLICIT, NULL, 'P', SYSDATE, -1, NULL);
      
    END;
  END IF;

  EXCEPTION WHEN ERROR THEN
     RAISE_APPLICATION_ERROR(-20101, ERRMSG);
END; 

/