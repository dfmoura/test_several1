CREATE OR REPLACE PROCEDURE SANKHYA.STP_MARCAR_ENTREGU (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
	   FIELD_NUNOTA     NUMBER;
       FIELD_CODPROD    NUMBER;
       P_COUNT          NUMBER;
       P_COUNT2         NUMBER;
       P_USUARIO        NUMBER;
       P_DT_LOG         DATE;
       PARAM_P_STATUS   VARCHAR2(10);
       PARAM_P_MSG_SOLICITANTE   VARCHAR2(200);
       P_ANEXO          NUMBER;
       P_ANEXO_VALIDO   NUMBER;
      
BEGIN
		
	   PARAM_P_STATUS := ACT_TXT_PARAM(P_IDSESSAO, 'P_STATUS');
       PARAM_P_MSG_SOLICITANTE :=ACT_TXT_PARAM(P_IDSESSAO, 'P_MSG_SOLICITANTE');
       
      -- Os valores informados pelo formulário de parâmetros, podem ser obtidos com as funções:
       --     ACT_INT_PARAM
       --     ACT_DEC_PARAM
       --     ACT_TXT_PARAM
       --     ACT_DTA_PARAM
       -- Estas funções recebem 2 argumentos:
       --     ID DA SESSÃO - Identificador da execução (Obtido através de P_IDSESSAO))
       --     NOME DO PARAMETRO - Determina qual parametro deve se deseja obter.


       FOR I IN 1..P_QTDLINHAS -- Este loop permite obter o valor de campos dos registros envolvidos na execução.
       LOOP                    -- A variável "I" representa o registro corrente.
           -- Para obter o valor dos campos utilize uma das seguintes funções:
           --     ACT_INT_FIELD (Retorna o valor de um campo tipo NUMÉRICO INTEIRO))
           --     ACT_DEC_FIELD (Retorna o valor de um campo tipo NUMÉRICO DECIMAL))
           --     ACT_TXT_FIELD (Retorna o valor de um campo tipo TEXTO),
           --     ACT_DTA_FIELD (Retorna o valor de um campo tipo DATA)
           -- Estas funções recebem 3 argumentos:
           --     ID DA SESSÃO - Identificador da execução (Obtido através do parâmetro P_IDSESSAO))
           --     NÚMERO DA LINHA - Relativo a qual linha selecionada.
           --     NOME DO CAMPO - Determina qual campo deve ser obtido.
          FIELD_NUNOTA := ACT_INT_FIELD(P_IDSESSAO, I, 'NUNOTA');
          FIELD_CODPROD := ACT_INT_FIELD(P_IDSESSAO, I, 'CODPROD');
          P_USUARIO := STP_GET_CODUSULOGADO;
          P_DT_LOG := SYSDATE;
         
          SELECT COUNT(*) INTO P_ANEXO FROM TSIATA WHERE CODATA = FIELD_NUNOTA;
         
         IF PARAM_P_STATUS = 'N' THEN
         	P_MENSAGEM := 'Operação cancelada!';
		 	RETURN;
		 ELSE
		 
		 	IF P_ANEXO = 0 THEN
		 		P_MENSAGEM := 'Adicionar anexo que comprove o recebimento da mercadoria!';
		 		RETURN;
		 	
		 	ELSE
		 	

		 	
		 	
						IF FIELD_CODPROD IS NULL THEN
				          /*CABEÇALHO*/  
				                
				               	SELECT COUNT(*) INTO P_COUNT2 FROM TGFCAB WHERE NUNOTA = FIELD_NUNOTA AND PENDENTE = 'N';
				                	IF P_COUNT2 > 0 THEN
						                P_MENSAGEM := 'O pedido selecionado não está pendente!'; 
						                RETURN;
									ELSE		               
										UPDATE TGFITE SET PENDENTE = 'N' , AD_USU_MARC_ENTREG = P_USUARIO, AD_DT_MARC_ENTREG = SYSDATE WHERE PENDENTE = 'S' AND NUNOTA = FIELD_NUNOTA;
										UPDATE TGFCAB SET PENDENTE = 'N' , AD_USU_MARC_ENTREG = P_USUARIO, AD_DT_MARC_ENTREG = SYSDATE  WHERE PENDENTE = 'S' AND NUNOTA = FIELD_NUNOTA;
										P_MENSAGEM := 'Pedido atualizado para entregue total com sucesso!';  
						                RETURN;		               
				               		END IF;
				               	
				          /*DETALHE*/     
				        ELSE 
				        
				                --VALIDA SE O ITEM DO PEDIDO DE REQUISIÇÃO ESTÁ PENDENTE
				           		SELECT COUNT(*) INTO P_COUNT FROM TGFITE WHERE NUNOTA = FIELD_NUNOTA AND CODPROD = FIELD_CODPROD AND PENDENTE = 'N'; 
				                IF P_COUNT > 0 THEN
				           
					                P_MENSAGEM := 'O produto selecionado não está pendente!';
					                RETURN;
				           
					           	ELSE
				           
					                --ATUALIZA O PRODUTO DO PEDIDO DE REQUISIÇÃO PARA NÃO PENDENTE
					                UPDATE TGFITE SET PENDENTE = 'N' , AD_USU_MARC_ENTREG = P_USUARIO, AD_DT_MARC_ENTREG = P_DT_LOG  WHERE NUNOTA = FIELD_NUNOTA AND CODPROD = FIELD_CODPROD;
					                COMMIT;
					             
					                P_MENSAGEM := 'Produto atualizado para entregue com sucesso! ';
				  				END IF;
				  		END IF;

			END IF;
				  	
				  	
	
		 

  		END IF;
           
       END LOOP;
END;