CREATE OR REPLACE PROCEDURE "STP_ALOCA_MULT_LOTES_OGUNJA" (
       P_TIPOEVENTO INT,    -- Identifica o tipo de evento
       P_IDSESSAO VARCHAR2, -- Identificador da execuá?o. Serve para buscar informaá?es dos campos da execuá?o.
       P_CODUSU INT         -- C¢digo do usu†rio logado
) AS
       BEFORE_INSERT INT;
       AFTER_INSERT  INT;
       BEFORE_DELETE INT;
       AFTER_DELETE  INT;
       BEFORE_UPDATE INT;
       AFTER_UPDATE  INT;
       BEFORE_COMMIT INT;
       P_STATUSNOTA     VARCHAR2(100);
       P_TOP            NUMBER;
       P_ALOCA_LOTE     VARCHAR2(100);
       P_NUNOTA         NUMBER;
       P_CODPROD        NUMBER;
       P_QTDNEG         NUMBER;
       P_CONTROLE       VARCHAR2(4000);
       
       
    CURSOR ALOCA_LOTES IS
        SELECT X.CODPROD
        , X.QTDNEG
        ,(SELECT CONTROLE FROM (
            SELECT EST.CODPROD, EST.CONTROLE, SUM(ESTOQUE - RESERVADO) AS ESTLIQ
            FROM TGFEST EST
            WHERE EST.CONTROLE <> ' '
            AND EST.CODPROD = X.CODPROD
            HAVING SUM(ESTOQUE - RESERVADO) >= X.QTDNEG
            GROUP BY EST.CONTROLE, EST.CODPROD
            ORDER BY SUM(ESTOQUE - RESERVADO) ASC
        ) WHERE ROWNUM = 1) AS CONTROLE
        FROM (
            SELECT ITE.CODPROD
            , SUM(ITE.QTDNEG) AS QTDNEG
            FROM TGFCAB CAB
            INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
            WHERE CAB.NUNOTA = P_NUNOTA
            GROUP BY ITE.CODPROD
        ) X;
       
       
       
       
       
       
BEGIN
       BEFORE_INSERT := 0;
       AFTER_INSERT  := 1;
       BEFORE_DELETE := 2;
       AFTER_DELETE  := 3;
       BEFORE_UPDATE := 4;
       AFTER_UPDATE  := 5;
       BEFORE_COMMIT := 10;
       
       
       
/*******************************************************************************
   ê poss°vel obter o valor dos campos atravÇs das Functions:
   
  EVP_GET_CAMPO_DTA(P_IDSESSAO, 'NOMECAMPO') -- PARA CAMPOS DE DATA
  EVP_GET_CAMPO_INT(P_IDSESSAO, 'NOMECAMPO') -- PARA CAMPOS NUMêRICOS INTEIROS
  EVP_GET_CAMPO_DEC(P_IDSESSAO, 'NOMECAMPO') -- PARA CAMPOS NUMêRICOS DECIMAIS
  EVP_GET_CAMPO_TEXTO(P_IDSESSAO, 'NOMECAMPO')   -- PARA CAMPOS TEXTO
  
  O primeiro argumento Ç uma chave para esta execuá?o. O segundo Ç o nome do campo.
  
  Para os eventos BEFORE UPDATE, BEFORE INSERT e AFTER DELETE todos os campos estar?o dispon°veis.
  Para os demais, somente os campos que pertencem ? PK
  
  * Os campos CLOB/TEXT ser?o enviados convertidos para VARCHAR(4000)
  
  TambÇm Ç poss°vel alterar o valor de um campo atravÇs das Stored procedures:
  
  EVP_SET_CAMPO_DTA(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UMA DATA
  EVP_SET_CAMPO_INT(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UM NÈMERO INTEIRO
  EVP_SET_CAMPO_DEC(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UM NÈMERO DECIMAL
  EVP_SET_CAMPO_TEXTO(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UM TEXTO
********************************************************************************/

/*     IF P_TIPOEVENTO = BEFORE_INSERT THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "BEFORE INSERT"
       END IF;*/
/*     IF P_TIPOEVENTO = AFTER_INSERT THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "AFTER INSERT"
       END IF;*/

/*     IF P_TIPOEVENTO = BEFORE_DELETE THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "BEFORE DELETE"
       END IF;*/
/*     IF P_TIPOEVENTO = AFTER_DELETE THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "AFTER DELETE"
       END IF;*/

/*     IF P_TIPOEVENTO = BEFORE_UPDATE THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "BEFORE UPDATE"
       END IF;*/
/*     IF P_TIPOEVENTO = AFTER_UPDATE THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "AFTER UPDATE"
       END IF;*/

/*     IF P_TIPOEVENTO = BEFORE_COMMIT THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "BEFORE COMMIT"
       END IF;*/
       
IF P_TIPOEVENTO = BEFORE_UPDATE THEN
       
    P_STATUSNOTA := EVP_GET_CAMPO_TEXTO(P_IDSESSAO, 'STATUSNOTA');
    P_TOP := EVP_GET_CAMPO_INT(P_IDSESSAO, 'CODTIPOPER');
    P_NUNOTA := EVP_GET_CAMPO_INT(P_IDSESSAO, 'NUNOTA');
    
    --VALIDA SE O PEDIDO/NOTA ESTµ SENDO CONFIRMADO
    IF P_STATUSNOTA = 'L' THEN
    
        SELECT NVL(AD_ALOCALOTEAUT,'N') INTO P_ALOCA_LOTE
        FROM TGFTOP TOP
        WHERE TOP.CODTIPOPER = P_TOP
        AND DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = P_TOP);
        
        --VALIDA SE A TOP ESTµ CONFIGURADA PARA ALOCAR LOTES AUTOMµTICAMENTE
        IF P_ALOCA_LOTE = 'S' THEN
        
            --ABRE CURSOR PARA ALOCAR O LOTE QUALIFICADO PARA CADA PRODUTO DO PEDIDO/NOTA
            OPEN ALOCA_LOTES;
            LOOP
            FETCH ALOCA_LOTES INTO P_CODPROD, P_QTDNEG, P_CONTROLE;
            EXIT WHEN ALOCA_LOTES%NOTFOUND;
    
                --O UPDATE S‡ SERµ EXECUTADO CASO HAJA UM CONTROLE APLICAVEL
                IF P_CONTROLE <> '    ' AND P_CONTROLE IS NOT NULL THEN
                
                    UPDATE TGFITE SET CONTROLE = P_CONTROLE WHERE CODPROD = P_CODPROD AND NUNOTA = P_NUNOTA;
                    
                END IF;
    
            END LOOP;
            CLOSE ALOCA_LOTES;
        
        
        
        END IF;
    
    
    END IF;
       
       
END IF;


END;
/