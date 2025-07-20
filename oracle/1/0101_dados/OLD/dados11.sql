CREATE OR REPLACE PROCEDURE STP_REQ_MAIL_PEND_SATIS
AS
-- Procedure para enviar emails de notificação sobre liberações pendentes
    -- Cursor para percorrer os registros do SELECT
    CURSOR c_liberacoes_pendentes IS
        SELECT
            LIB.NUCHAVE,
            LIB.NUCLL,
            LIB.SEQCASCATA,
            LIB.SEQUENCIA,
            LIB.EVENTO,
            LIB.TABELA,
            USU.NOMEUSU,
            LIB.DHSOLICIT,
            SYSDATE - LIB.DHSOLICIT AS DIAS_PENDENTES,
            NVL(CAB.OBSERVACAO, 'Sem observação') AS OBSERVACAO,
            USU.EMAIL
        FROM TSILIB LIB
        INNER JOIN TGFCAB CAB ON LIB.NUCHAVE = CAB.NUNOTA
        INNER JOIN TSIUSU USU ON CAB.CODUSUINC = USU.CODUSU
        WHERE LIB.DHLIB IS NULL
          AND CAB.TIPMOV = 'J'
          AND USU.EMAIL IS NOT NULL
        ORDER BY LIB.DHSOLICIT;
    
    -- Variáveis para armazenar os dados
    v_nuchave TSILIB.NUCHAVE%TYPE;
    v_dhsolicit TSILIB.DHSOLICIT%TYPE;
    v_nome_usuario TSIUSU.NOMEUSU%TYPE;
    v_dias_pendentes NUMBER;
    v_observacao VARCHAR2(4000);
    v_email TSIUSU.EMAIL%TYPE;
    v_nucll TSILIB.NUCLL%TYPE;
    v_seqcascata TSILIB.SEQCASCATA%TYPE;
    v_sequencia TSILIB.SEQUENCIA%TYPE;
    v_evento TSILIB.EVENTO%TYPE;
    v_tabela TSILIB.TABELA%TYPE;
    
    -- Variáveis para o email
    v_assunto VARCHAR2(200);
    v_corpo VARCHAR2(4000);
    v_codfila NUMBER;
    
BEGIN
    -- Abrir o cursor
    OPEN c_liberacoes_pendentes;
    
    LOOP
        -- Buscar o próximo registro
        FETCH c_liberacoes_pendentes INTO v_nuchave, v_nucll, v_seqcascata, v_sequencia, v_evento, v_tabela, v_nome_usuario, v_dhsolicit, v_dias_pendentes, v_observacao, v_email;
        
        -- Sair do loop quando não houver mais registros
        EXIT WHEN c_liberacoes_pendentes%NOTFOUND;
        
        -- Gerar código único para a fila (pode ser ajustado conforme necessidade)
        SELECT NVL(MAX(CODFILA), 0) + 1 INTO v_codfila FROM TMDFMG;
        
        -- Criar o assunto do email
        v_assunto := 'Notificação: Liberação Pendente - Requisição N° ' || v_nuchave;



        -- Definir data de corte para requisições legadas (ajuste conforme necessário)
        -- Exemplo: 1 de julho de 2024
        DECLARE
            v_data_corte DATE := TO_DATE('2025-07-18', 'YYYY-MM-DD');
        BEGIN
            IF v_dhsolicit < v_data_corte AND v_dias_pendentes >= 15 THEN
                -- Corpo de email para requisições legadas (apenas uma vez)
                v_corpo :=
                    '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                    '<p>A requisição nº <strong>' || v_nuchave || '</strong>, cadastrada há <strong>' || round(v_dias_pendentes, 2) || ' dia(s)</strong>, permanece pendente de aprovação.</p>' ||
                    '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                    '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                    '<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 12px; border-radius: 5px; margin-top: 15px;">' ||
                    '<strong>Atenção:</strong> Esta requisição está <u>acima do prazo padrão</u> e será <strong>automaticamente reprovada em 5 dias corridos</strong> se não for aprovada até lá.' ||
                    '</div>' ||
                    '<p style="margin-top: 15px;">Caso a requisição ainda seja necessária, pedimos que tome as providências para a aprovação imediata, evitando a reprovação automática.</p>' ||
                    '<p style="color: #856404; margin-top: 10px;"><strong>Após o prazo informado, será necessário criar uma nova requisição no sistema.</strong></p>' ||
                    '<br>' ||
                    '<p>Atenciosamente,<br>Departamento de Compras - Sistema de Notificações</p>' ||
                    '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
            ELSE
                -- Criar o corpo do email baseado no tempo de pendência
                IF v_dias_pendentes BETWEEN 1 AND 13 THEN
                    -- Email para requisições pendentes entre 1 e 13 dias
                    v_corpo := 
                        '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                        '<p>Informamos que a requisição nº <strong>' || v_nuchave || '</strong> encontra-se pendente há <strong>' || round(v_dias_pendentes,2) || ' dia(s)</strong>.</p>' ||
                        '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                        '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                        -- Bloco de destaque para ação
                        '<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                        '<strong>Por favor, tome as providências necessárias e realize a liberação o quanto antes.</strong>' ||
                        '</div>' ||
                        -- Alerta de reprovação
                        '<p style="color: red; margin-top: 15px;"><strong>Atenção:</strong> Requisições que permanecerem pendentes por <strong>15 dias corridos</strong> a partir da data da solicitação (<strong>' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY') || '</strong>) serão <u>automaticamente reprovadas</u> do sistema. <strong>Toda requisição reprovada deve ser resubmetida como uma nova requisição.</strong></p>' ||
                        '<br>' ||
                        '<p>Atenciosamente,<br>' ||
                        'Departamento de Compras - Sistema de Notificações</p>' ||
                        -- Logo ao final
                        '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
                
                ELSIF v_dias_pendentes = 14 THEN
                    -- Email para requisições pendentes há exatamente 14 dias (último aviso)
                    v_corpo := 
                        '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                        '<p><strong>URGENTE:</strong> A requisição nº <strong>' || v_nuchave || '</strong> encontra-se pendente há <strong>' || round(v_dias_pendentes,2) || ' dia(s)</strong>.</p>' ||
                        '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                        '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                        -- Bloco de destaque para ação urgente
                        '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                        '<strong style="color: #721c24;">ATENÇÃO: Esta é a última notificação antes da reprovação automática!</strong><br>' ||
                        '<strong>É necessário realizar a liberação IMEDIATAMENTE para evitar a reprovação automática.</strong>' ||
                        '</div>' ||
                        -- Alerta crítico de reprovação
                        '<p style="color: #721c24; margin-top: 15px;"><strong>ALERTA CRÍTICO:</strong> Amanhã, dia <strong>' || TO_CHAR(v_dhsolicit + 15, 'DD/MM/YYYY') || '</strong>, esta requisição será <u>automaticamente reprovada</u> do sistema se não for liberada. <strong>Toda requisição reprovada deve ser resubmetida como uma nova requisição.</strong></p>' ||
                        '<br>' ||
                        '<p>Atenciosamente,<br>' ||
                        'Departamento de Compras - Sistema de Notificações</p>' ||
                        -- Logo ao final
                        '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
                
                ELSIF v_dias_pendentes >= 15 THEN
                    -- Email para requisições pendentes há 15 dias ou mais (após prazo)
                    v_corpo := 
                        '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                        '<p><strong>INFORMAÇÃO:</strong> A requisição nº <strong>' || v_nuchave || '</strong> foi <strong>automaticamente reprovada</strong> do sistema.</p>' ||
                        '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                        '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                        '<p><strong>Tempo de pendência:</strong> ' || round(v_dias_pendentes,2) || ' dia(s)</p>' ||
                        -- Bloco de destaque para informação de reprovação
                        '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                        '<strong style="color: #155724;">REPROVAÇÃO AUTOMÁTICA REALIZADA</strong><br>' ||
                        '<strong>Esta requisição foi reprovada do sistema conforme a política de reprovação automática após 15 dias de pendência.</strong>' ||
                        '</div>' ||
                        -- Informação sobre nova solicitação
                        '<p style="color: #155724; margin-top: 15px;"><strong>Observação:</strong> Caso ainda seja necessária a liberação, será necessário criar uma nova requisição no sistema. <strong>Toda requisição reprovada deve ser resubmetida como uma nova requisição.</strong></p>' ||
                        '<br>' ||
                        '<p>Atenciosamente,<br>' ||
                        'Departamento de Compras - Sistema de Notificações</p>' ||
                        -- Logo ao final
                        '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
                
                END IF;
            END IF;
        END;


        
        -- Inserir o registro na tabela de envio de mensagens
        INSERT INTO TMDFMG (
            CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS,
            CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO,
            EMAIL, CODSMTP
        )
        VALUES (
            v_codfila, v_assunto, NULL, SYSDATE, 'Pendente',
            0, 0, v_corpo, 'E', 3,
            v_email, 11
        );
        
         
    END LOOP;
 
       -- Commit para cada inserção (opcional - pode ser movido para fora do loop)
        COMMIT;

   
    -- Fechar o cursor
    CLOSE c_liberacoes_pendentes;
    
END STP_REQ_MAIL_PEND_SATIS;
/

-- Exemplo de como executar a procedure
EXEC STP_REQ_MAIL_PEND_SATIS;