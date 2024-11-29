CREATE OR REPLACE PROCEDURE          "STP_NEGACAO_LIBERACAO_SATIS" (
       P_TIPOEVENTO INT,    -- Identifica o tipo de evento
       P_IDSESSAO VARCHAR2, -- Identificador da execução. Serve para buscar informações dos campos da execução.
       P_CODUSU INT         -- Código do usuário logado
       


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
       P_OBSLIB VARCHAR2(4000);
       P_NOMEUSU VARCHAR(100);
       P_EMAIL VARCHAR(100);
       P_CODFILA INT;
       P_CODUSUSOLICIT INT;
       V_PROXIMO_CODFILA INT; 
       P_STATUSNOTA VARCHAR(100);
       
       
              
BEGIN
       BEFORE_INSERT := 0;
       AFTER_INSERT  := 1;
       BEFORE_DELETE := 2;
       AFTER_DELETE  := 3;
       BEFORE_UPDATE := 4;
       AFTER_UPDATE  := 5;
       BEFORE_COMMIT := 10;
       
       
            P_NUCHAVE := EVP_GET_CAMPO_INT(P_IDSESSAO, 'NUCHAVE');
            P_TABELA := EVP_GET_CAMPO_TEXTO(P_IDSESSAO, 'TABELA');
            P_EVENTO := EVP_GET_CAMPO_INT(P_IDSESSAO, 'EVENTO');
            P_SEQUENCIA:= EVP_GET_CAMPO_INT(P_IDSESSAO, 'SEQUENCIA');
            P_SEQCASCATA := EVP_GET_CAMPO_INT(P_IDSESSAO, 'SEQCASCATA');
            P_NUCLL := EVP_GET_CAMPO_INT(P_IDSESSAO, 'NUCLL');
            
            




     IF P_TIPOEVENTO = AFTER_UPDATE THEN   
     
     
     
            SELECT REPROVADO,OBSLIB,CODUSUSOLICIT INTO P_REPROVADO,P_OBSLIB,P_CODUSUSOLICIT
            FROM TSILIB 
            WHERE NUCHAVE = P_NUCHAVE AND TABELA = P_TABELA AND EVENTO=P_EVENTO AND SEQUENCIA = P_SEQUENCIA AND SEQCASCATA=P_SEQCASCATA;

            SELECT NOMEUSU,EMAIL INTO P_NOMEUSU,P_EMAIL
            FROM TSIUSU WHERE P_CODUSUSOLICIT = CODUSU;

                P_ASSUNTO := 'Liberacao Negada';
                
                P_CORPO := 
                '<html> <head> <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
                <title>Retorno Nao Liberacao</title><style> body {font-family: Arial, sans-serif; margin: 0; padding: 20px;}
                .container {max-width: 600px; margin: 0 auto;} .message {margin-top: 20px; border: 1px solid #ccc;box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
                padding: 15px; border-radius: 5px;} .logo {text-align: center; margin-top: 20px;} .center-text {text-align: center; }
                </style> </head> <body> <div class="container"> <div class="message"> <p class="center-text"><strong>LIBERACAO NEGADA</strong></p><br>
                <p>Nro. Liberacao:  <strong> ' || P_NUCHAVE || ' </strong> Solicitante:   <strong> ' || P_NOMEUSU || ' </strong></p>
                <p>Pelo Motivo:  <strong>' || P_OBSLIB || '</strong></p> </div> <div class="logo"> 
                <img src="https://www.satis.ind.br/static/images/logo.png" alt="Company Logo"> </div> </div>
                </body></html>';
     
     
     
     
           IF P_REPROVADO = 'S' THEN

              SELECT STATUSNOTA INTO P_STATUSNOTA FROM TGFCAB WHERE NUNOTA = P_NUCHAVE;
           
           /* Alteração de statusnota para visualizar registro na CAB.*/         
              IF P_STATUSNOTA = 'L' THEN
                      EXECUTE IMMEDIATE 'ALTER TRIGGER TRG_UPD_TGFCAB DISABLE';
                      UPDATE TGFCAB SET STATUSNOTA = 'A' WHERE NUNOTA = P_NUCHAVE;
                      COMMIT;
                      EXECUTE IMMEDIATE 'ALTER TRIGGER TRG_UPD_TGFCAB ENABLE';
              END IF;

           /* Programa mensagem para enviar ao usuario solicitante.*/
           INSERT INTO TMDFMG (CODFILA,CODMSG,DTENTRADA,STATUS,CODCON, TENTENVIO, MENSAGEM,TIPOENVIO ,MAXTENTENVIO,NUANEXO,ASSUNTO,EMAIL,MIMETYPE,TIPODOC,CODUSU)
           VALUES ((SELECT NVL(MAX(CODFILA), 0) +1 FROM TMDFMG),NULL, SYSDATE,'Pendente', 0, 0, P_CORPO  , 'E', 3, NULL,P_ASSUNTO,P_EMAIL,NULL, NULL,0);
           COMMIT;

           /* Atualização de liberação na TSILIB de evento cadastrado de Negação Liberação.*/
           UPDATE TSILIB SET EVENTO = 1100,VLRLIBERADO = 0, DHLIB = SYSDATE  WHERE NUCHAVE = P_NUCHAVE AND TABELA = P_TABELA AND EVENTO=P_EVENTO AND SEQUENCIA = P_SEQUENCIA AND SEQCASCATA=P_SEQCASCATA;
           COMMIT;
                
           END IF;     

          

                
                
   
     
      END IF;
            
            
           

END;
/