CREATE OR REPLACE TRIGGER TRG_AFTER_INSERT_DETFORM
AFTER INSERT OR UPDATE
ON AD_DETALHFORMULACOES
FOR EACH ROW
DECLARE
    v_codcad AD_DETALHFORMULACOES.CODCAD%TYPE;
    v_codcont AD_DETALHFORMULACOES.CODCONT%TYPE;
    v_perc_100g AD_DETALHFORMULACOES.PERC_100G%TYPE;
    v_QUANTIDADE AD_FORMULLABOR.QUANTIDADE%TYPE;
    v_DENSIDADE AD_FORMULLABOR.DENSIDADE%TYPE;
    v_DISPONIVEL AD_CONTINSUMO.VOLUME%TYPE;
    v_CODFORMULACAO AD_FORMULLABOR.CODFORMULACAO%TYPE;
    v_CODIGO AD_DETALHFORMULACOES.CODIGO%TYPE;
    v_FATOR AD_FORMULLABOR.DENSIDADE%TYPE;
    v_FATOR_IDEAL AD_FORMULLABOR.DENSIDADE%TYPE;
    v_DISPONIVEL_NOVO AD_CONTINSUMO.VOLUME%TYPE;
BEGIN
    -- Armazenando os valores dos campos
    v_codcad := :NEW.CODCAD;
    v_codcont := :NEW.CODCONT;
    v_perc_100g := :NEW.PERC_100G;
    v_CODFORMULACAO := :NEW.CODFORMULACAO;
    v_CODIGO := :NEW.CODIGO;
       
    SELECT 
        CONT.VOLUME
        INTO v_DISPONIVEL
    FROM AD_CONTINSUMO CONT
    WHERE TRUNC(CONT.DTVAL) >= TRUNC(SYSDATE) 
      AND CONT.VOLUME > 0
      AND CONT.HOMOLOG='S'
      AND CONT.CODCAD = v_codcad
      AND CONT.CODCONT = v_codcont;


    SELECT 
    SUM(CONT.VOLUME -
    NVL((BOR.QUANTIDADE * BOR.DENSIDADE * (DET.PERC_100G/100)),0))
    INTO v_DISPONIVEL
    FROM AD_CONTINSUMO CONT
    INNER JOIN AD_CADMATERIA CAD ON CONT.CODCAD = CAD.CODCAD
    LEFT JOIN AD_DETALHFORMULACOES DET ON CONT.CODCAD = DET.CODCAD AND CONT.CODCONT = DET.CODCONT
    LEFT JOIN AD_FORMULLABOR BOR ON DET.CODFORMULACAO = BOR.CODFORMULACAO
    WHERE TRUNC(CONT.DTVAL) >= TRUNC(SYSDATE) 
    AND CONT.VOLUME > 0
    AND CONT.HOMOLOG='S'
    AND CONT.CODCAD = v_codcad
    AND CONT.CODCONT = v_codcont;






    SELECT
        BOR.QUANTIDADE,
        BOR.DENSIDADE
    INTO v_QUANTIDADE, v_DENSIDADE
    FROM AD_FORMULLABOR BOR
    WHERE BOR.CODFORMULACAO = v_CODFORMULACAO;
    
    v_FATOR  :=  (v_QUANTIDADE*v_DENSIDADE*(v_perc_100g/100));
    v_FATOR_IDEAL :=  v_DISPONIVEL/(v_QUANTIDADE*v_DENSIDADE);
    

    
    

    -- CASO O FATOR ESTEJA MAIOR AO QUE TEM DISPONIVEL
    
    IF  v_FATOR > v_DISPONIVEL THEN
        RAISE_APPLICATION_ERROR(-20001, 'O valor de fator <strong>' || ROUND(v_FATOR, 2) || '</strong> ultrapassa a quantidade disponível de <strong>' || ROUND(v_DISPONIVEL, 2) || '</strong>.' || 
        'Siga com o ajuste de <strong>[% 100 g]</strong> para até <strong>0'||TRUNC(v_FATOR_IDEAL,2)||'</strong>.'||        
        CHR(10) || CHR(10) || CHR(10)|| CHR(10));
    END IF;    
    


END;
/