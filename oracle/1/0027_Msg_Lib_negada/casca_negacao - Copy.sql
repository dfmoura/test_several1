CREATE OR REPLACE PROCEDURE SATISTST."STP_NEGACAO_LIBERACAO_SATIS" (
       P_TIPOEVENTO INT,    -- Identifica o tipo de evento
       P_IDSESSAO VARCHAR2, -- Identificador da execução. Serve para buscar informações dos campos da execução.
       P_CODUSU INT,         -- Código do usuário logado
       P_MENSAGEM OUT VARCHAR2
) AS
       BEFORE_INSERT INT;
       AFTER_INSERT  INT;
       BEFORE_DELETE INT;
       AFTER_DELETE  INT;
       BEFORE_UPDATE INT;
       AFTER_UPDATE  INT;
       BEFORE_COMMIT INT;
       
       P_NUCHAVE INT;
       P_REPROVADO VARCHAR(100);
       P_TABELA VARCHAR(100);
       P_EVENTO INT;
       P_SEQUENCIA INT;
       P_SEQCASCATA INT;  
       P_NUCLL INT;
       P_COUNT INT;
       P_ASSUNTO VARCHAR(100);
       P_CORPO VARCHAR2(4000);
       P_CODFILA INT;
      
       
              
BEGIN
       BEFORE_INSERT := 0;
       AFTER_INSERT  := 1;
       BEFORE_DELETE := 2;
       AFTER_DELETE  := 3;
       BEFORE_UPDATE := 4;
       AFTER_UPDATE  := 5;
       BEFORE_COMMIT := 10;
       
/*******************************************************************************
   É possível obter o valor dos campos através das Functions:
   
  EVP_GET_CAMPO_DTA(P_IDSESSAO, 'NOMECAMPO') -- PARA CAMPOS DE DATA
  EVP_GET_CAMPO_INT(P_IDSESSAO, 'NOMECAMPO') -- PARA CAMPOS NUMÉRICOS INTEIROS
  EVP_GET_CAMPO_DEC(P_IDSESSAO, 'NOMECAMPO') -- PARA CAMPOS NUMÉRICOS DECIMAIS
  EVP_GET_CAMPO_TEXTO(P_IDSESSAO, 'NOMECAMPO')   -- PARA CAMPOS TEXTO
  
  O primeiro argumento é uma chave para esta execução. O segundo é o nome do campo.
  
  Para os eventos BEFORE UPDATE, BEFORE INSERT e AFTER DELETE todos os campos estarão disponíveis.
  Para os demais, somente os campos que pertencem à PK
  
  * Os campos CLOB/TEXT serão enviados convertidos para VARCHAR(4000)
  
  Também é possível alterar o valor de um campo através das Stored procedures:
  
  EVP_SET_CAMPO_DTA(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UMA DATA
  EVP_SET_CAMPO_INT(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UM NÚMERO INTEIRO
  EVP_SET_CAMPO_DEC(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UM NÚMERO DECIMAL
  EVP_SET_CAMPO_TEXTO(P_IDSESSAO,  'NOMECAMPO', VALOR) -- VALOR DEVE SER UM TEXTO
********************************************************************************/

P_NUCHAVE := EVP_GET_CAMPO_INT(P_IDSESSAO, 'NUCHAVE'); -- PARA CAMPOS NUMÉRICOS INTEIROS
P_TABELA := EVP_GET_CAMPO_TEXTO(P_IDSESSAO, 'TABELA');
P_EVENTO := EVP_GET_CAMPO_INT(P_IDSESSAO, 'EVENTO');
P_SEQUENCIA:= EVP_GET_CAMPO_INT(P_IDSESSAO, 'SEQUENCIA');
P_SEQCASCATA := EVP_GET_CAMPO_INT(P_IDSESSAO, 'SEQCASCATA');  
P_NUCLL := EVP_GET_CAMPO_INT(P_IDSESSAO, 'NUCLL');



                SELECT 
                REPROVADO INTO P_REPROVADO
                FROM TSILIB LIB 
                WHERE 
                LIB.NUCHAVE = P_NUCHAVE AND LIB.TABELA = P_TABELA AND LIB.EVENTO=P_EVENTO AND LIB.SEQUENCIA = P_SEQUENCIA AND LIB.SEQCASCATA=P_SEQCASCATA;

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

     IF P_TIPOEVENTO = BEFORE_UPDATE THEN
     
     
     
     RAISE_APPLICATION_ERROR(-20001, 'ddddddddddddddddd');
       /*
         P_ASSUNTO := 'TESTE';
         P_CORPO :='TESTE';
       SELECT NVL(MAX(CODFILA),0) + 1 INTO P_CODFILA FROM TMDFMG;
                        
        INSERT INTO TMDFMG (CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS, CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO, EMAIL, NUANEXO, MIMETYPE, CODSMTP) 
        (SELECT P_CODFILA + ROWNUM, P_ASSUNTO, NULL, SYSDATE, 'Pendente', 0, 0, P_CORPO, 'E', 3, 'diogomou@gmail.com', NULL, NULL, 10
           FROM TSIUSU U
           ); 

          P_MENSAGEM := '';*/  
             
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "BEFORE UPDATE"
     END IF;
       
     /*IF P_TIPOEVENTO = AFTER_UPDATE THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "AFTER UPDATE"
    END IF;*/
/*     IF P_TIPOEVENTO = BEFORE_COMMIT THEN
             --DESCOMENTE ESTE BLOCO PARA PROGRAMAR O "BEFORE COMMIT"
       END IF;*/
       
       

END;
/
