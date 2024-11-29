CREATE OR REPLACE PROCEDURE "STP_ATU_LIM_CRED" (
       P_CODUSU NUMBER,        -- Código do usuário logado
       P_IDSESSAO VARCHAR2,    -- Identificador da execução. Serve para buscar informações dos parâmetros/campos da execução.
       P_QTDLINHAS NUMBER,     -- Informa a quantidade de registros selecionados no momento da execução.
       P_MENSAGEM OUT VARCHAR2 -- Caso seja passada uma mensagem aqui, ela será exibida como uma informação ao usuário.
) AS
       PARAM_NOV_LIM_CRED FLOAT;
       PARAM_CONF_OPER VARCHAR2(4000);
       FIELD_CODPARC NUMBER;
BEGIN

       -- Os valores informados pelo formulário de parâmetros, podem ser obtidos com as funções:
       --     ACT_INT_PARAM
       --     ACT_DEC_PARAM
       --     ACT_TXT_PARAM
       --     ACT_DTA_PARAM
       -- Estas funções recebem 2 argumentos:
       --     ID DA SESSÃO - Identificador da execução (Obtido através de P_IDSESSAO))
       --     NOME DO PARAMETRO - Determina qual parametro deve se deseja obter.

       PARAM_NOV_LIM_CRED := ACT_DEC_PARAM(P_IDSESSAO, 'NOV_LIM_CRED');
       PARAM_CONF_OPER := ACT_TXT_PARAM(P_IDSESSAO, 'CONF_OPER');

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
           FIELD_CODPARC := ACT_INT_FIELD(P_IDSESSAO, I, 'CODPARC');


        IF PARAM_NOV_LIM_CRED > 0 AND PARAM_CONF_OPER = 'S' THEN

           UPDATE TGFPAR SET LIMCRED = PARAM_NOV_LIM_CRED WHERE CODPARC = FIELD_CODPARC;
           P_MENSAGEM := 'Limite atualizado com sucesso!';
           
        ELSE

           P_MENSAGEM := 'Limite nao pode ser atualizado!';         
        

        END IF;

-- <ESCREVA SEU CÓDIGO AQUI (SERÁ EXECUTADO PARA CADA REGISTRO SELECIONADO)> --



       END LOOP;




-- <ESCREVA SEU CÓDIGO DE FINALIZAÇÃO AQUI> --



END;

/