CREATE OR REPLACE PROCEDURE EVT_ATUAL_HIST_RENEG_SATIS (
       P_TIPOEVENTO INT,    -- Identifica o tipo de evento
       P_IDSESSAO VARCHAR2, -- Identificador da execução. Serve para buscar informações dos campos da execução.
       P_CODUSU INT         -- Código do usuário logado
) AS
       BEFORE_INSERT    INT;
       AFTER_INSERT      INT;
       BEFORE_DELETE    INT;
       AFTER_DELETE      INT;
       BEFORE_UPDATE   INT;
       AFTER_UPDATE     INT;
       BEFORE_COMMIT   INT;
       P_NUFIN                NUMBER;
       P_NURENEG     INT;
       P_RECDESP    INT;
       P_HIST_RENEG  VARCHAR2(4000);
BEGIN
       BEFORE_INSERT := 0;
       AFTER_INSERT  := 1;
       BEFORE_DELETE := 2;
       AFTER_DELETE  := 3;
       BEFORE_UPDATE := 4;
       AFTER_UPDATE  := 5;
       BEFORE_COMMIT := 10;

  P_NUFIN := EVP_GET_CAMPO_INT(P_IDSESSAO,  'NUFIN');
  
     
  
  IF P_TIPOEVENTO = AFTER_UPDATE THEN
  
     
        BEGIN
            SELECT NURENEG, RECDESP, AD_HIST_RENEG1 
            INTO P_NURENEG, P_RECDESP, P_HIST_RENEG 
            FROM TGFFIN 
            WHERE NUFIN = P_NUFIN;

            IF NVL(P_NURENEG, 0) <> 0 AND P_RECDESP <> 0 THEN

                SELECT 
               'Refere-se ao(s) título(s) de origem: ' || CHR(10) ||
                LISTAGG(
                    'N.Ú.Finan.: ' || REN.NUFIN || ', Dt.Venc.: ' || TO_CHAR(FIN2.DTVENC, 'DD/MM/YYYY') || ', Valor: R$' || FIN2.VLRDESDOB,
                    CHR(10)
                ) WITHIN GROUP (ORDER BY FIN.NURENEG DESC) INTO P_HIST_RENEG
                FROM TGFFIN FIN
                INNER JOIN TGFREN REN ON FIN.NURENEG = ABS(REN.NURENEG)
                INNER JOIN TGFFIN FIN2 ON REN.NUFIN = FIN2.NUFIN
                WHERE FIN.NURENEG IS NOT NULL
                AND FIN.NUFIN = P_NUFIN;
        
                UPDATE TGFFIN SET AD_HIST_RENEG1 = P_HIST_RENEG WHERE NUFIN = P_NUFIN;
            
                
            END IF;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                DBMS_OUTPUT.PUT_LINE('Nenhum dado encontrado para NUFIN: ' || P_NUFIN);
        END;

    END IF;

END;