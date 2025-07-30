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
    
    -- Variáveis para controle de datas
    v_data_corte DATE := TO_DATE('2025-07-21', 'YYYY-MM-DD');
    v_prazo_final DATE;
    v_dias_apos_prazo NUMBER;
    
BEGIN
    -- Calcular prazo final uma vez
    v_prazo_final := v_data_corte + 5;
    
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

        -- Definir o corpo do email baseado nas condições
        IF v_dhsolicit < v_data_corte AND v_dias_pendentes >= 15 THEN
            -- Calcular dias após o prazo final
            v_dias_apos_prazo := TRUNC(SYSDATE) - v_prazo_final;
            
            -- Verificar se já passaram 5 dias desde a data de corte
            IF v_dias_apos_prazo >= 5 THEN
                -- Atualizar a requisição como reprovada
                UPDATE TSILIB
                SET REPROVADO = 'S',
                    DHLIB = SYSDATE,
                    OBSCOMPL = 'REPROVADO NÃO LIBERAÇÃO NO PRAZO'
                WHERE NUCHAVE = v_nuchave
                  AND NUCLL = v_nucll
                  AND SEQCASCATA = v_seqcascata
                  AND SEQUENCIA = v_sequencia
                  AND EVENTO = v_evento
                  AND TABELA = v_tabela;
                -- Atualizar a requisição pelo NUCHAVE como PENDENTE ='N'
                   UPDATE TGFCAB SET PENDENTE = 'N' WHERE NUNOTA = v_nuchave;
                   UPDATE TGFITE SET PENDENTE = 'N' WHERE NUNOTA = v_nuchave;
                
                
                -- Corpo de email para requisições legadas após expiração do prazo de 5 dias
                v_corpo :=
                    '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                    '<p><strong>INFORMAÇÃO:</strong> A requisição nº <strong>' || v_nuchave || '</strong> foi <strong>automaticamente reprovada</strong> do sistema.</p>' ||
                    '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                    '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                    '<p><strong>Tempo de pendência:</strong> ' || round(v_dias_pendentes, 2) || ' dia(s)</p>' ||
                    '<p><strong>Data de corte:</strong> ' || TO_CHAR(v_data_corte, 'DD/MM/YYYY') || '</p>' ||
                    '<p><strong>Prazo final que expirou:</strong> ' || TO_CHAR(v_prazo_final, 'DD/MM/YYYY') || '</p>' ||
                    '<p style="margin-top: 10px;"><strong>Dias após o prazo:</strong> <span style="color: #dc3545; font-weight: bold;">' || ROUND(v_dias_apos_prazo, 0) || ' dia(s)</span></p>' ||
                    -- Bloco de destaque para reprovação automática
                    '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                    '<strong style="color: #155724;">REPROVAÇÃO AUTOMÁTICA REALIZADA</strong><br>' ||
                    '<strong>Esta requisição foi reprovada do sistema conforme a política de reprovação automática após 5 dias da data de corte, sem análise pelos responsáveis.</strong>' ||
                    '</div>' ||
                    -- Informação sobre nova solicitação
                    '<p style="color: #155724; margin-top: 15px;"><strong>Observação:</strong> Caso ainda seja necessária a liberação, será necessário criar uma nova requisição no sistema. <strong>Requisições reprovadas automaticamente devem ser recriadas no sistema, caso o usuário ainda deseje seguir com a solicitação.</strong></p>' ||
                    '<br>' ||
                    '<p>Agradecemos sua compreensão.<br>Departamento de Compras - Sistema de Notificações</p>' ||
                    '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
            ELSE
                -- Corpo de email para requisições legadas (apenas uma vez)
                v_corpo :=
                    '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                    '<p>A requisição nº <strong>' || v_nuchave || '</strong>, cadastrada há <strong>' || round(v_dias_pendentes, 2) || ' dia(s)</strong>, permanece pendente de análise pelos responsáveis.</p>' ||
                    '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                    '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                    '<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 12px; border-radius: 5px; margin-top: 15px;">' ||
                    '<strong>Atenção:</strong> Esta requisição está <u>acima do prazo padrão</u> e será <strong>automaticamente reprovada em 5 dias corridos</strong> a partir da data de corte (' || TO_CHAR(v_data_corte, 'DD/MM/YYYY') || ').</div>' ||
                    '<p style="margin-top: 15px;"><strong>Prazo final para análise:</strong> ' || TO_CHAR(v_prazo_final, 'DD/MM/YYYY') || '</p>' ||
                    '<p style="margin-top: 10px;"><strong>Dias restantes para análise:</strong> <span style="color: #dc3545; font-weight: bold;">' || ROUND(v_prazo_final - SYSDATE, 0) || ' dia(s)</span></p>' ||
                    '<p style="margin-top: 15px;">Para evitar a reprovação automática, recomendamos que você entre em contato com os responsáveis pela aprovação para verificar o status da análise, caso a requisição ainda seja necessária.</p>' ||
                    '<p style="color: #856404; margin-top: 10px;"><strong>Após o prazo informado, será necessário criar uma nova requisição no sistema.</strong></p>' ||
                    '<br>' ||
                    '<p>Agradecemos sua compreensão.<br>Departamento de Compras - Sistema de Notificações</p>' ||
                    '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
            END IF;

        ELSE
            -- Criar o corpo do email baseado no tempo de pendência
            IF v_dias_pendentes BETWEEN 1 AND 13 THEN
                -- Email para requisições pendentes entre 1 e 13 dias
                v_corpo := 
                    '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                    '<p>Gostaríamos de informar que a requisição nº <strong>' || v_nuchave || '</strong> encontra-se pendente há <strong>' || round(v_dias_pendentes,2) || ' dia(s)</strong> e aguarda análise pelos responsáveis.</p>' ||
                    '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                    '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                    -- Bloco de destaque para informação
                    '<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                    '<strong>Esta é uma notificação informativa sobre o status da sua requisição.</strong><br>' ||
                    '<em>Sua requisição está aguardando análise pelos responsáveis pela aprovação / reprovação.</em>' ||
                    '</div>' ||
                    -- Cálculo dinâmico do prazo restante
                    '<p style="margin-top: 15px;"><strong>Prazo final para análise:</strong> ' || TO_CHAR(v_dhsolicit + 15, 'DD/MM/YYYY') || '</p>' ||
                    '<p style="margin-top: 10px;"><strong>Dias restantes para análise:</strong> <span style="color: #dc3545; font-weight: bold;">' || ROUND(v_dhsolicit + 15 - SYSDATE, 0) || ' dia(s)</span></p>' ||
                    -- Alerta de reprovação
                    '<p style="color: red; margin-top: 15px;"><strong>Atenção:</strong> Requisições que permanecerem pendentes por <strong>15 dias corridos</strong> a partir da data da solicitação (<strong>' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY') || '</strong>) serão <u>automaticamente reprovadas</u> do sistema. <strong>Requisições reprovadas automaticamente devem ser recriadas no sistema, caso o usuário ainda deseje seguir com a solicitação.</strong></p>' ||
                    '<br>' ||
                    '<p>Agradecemos sua compreensão.<br>' ||
                    'Departamento de Compras - Sistema de Notificações</p>' ||
                    -- Logo ao final
                    '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
            
            ELSIF v_dias_pendentes = 14 THEN
                -- Email para requisições pendentes há exatamente 14 dias (último aviso)
                v_corpo := 
                    '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                    '<p><strong>URGENTE:</strong> A requisição nº <strong>' || v_nuchave || '</strong> encontra-se pendente há <strong>' || round(v_dias_pendentes,2) || ' dia(s)</strong> e ainda aguarda análise pelos responsáveis.</p>' ||
                    '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                    '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                    -- Bloco de destaque para informação urgente
                    '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                    '<strong style="color: #721c24;">ATENÇÃO: Esta é a última notificação antes da reprovação automática!</strong><br>' ||
                    '<strong>Esta requisição está próxima do prazo limite e ainda aguarda análise pelos responsáveis.</strong><br><br>' ||
                    '<em>Recomendamos que você entre em contato com os responsáveis pela aprovação para verificar o status da análise, caso a requisição ainda seja necessária.</em>' ||
                    '</div>' ||
                    -- Cálculo dinâmico do prazo restante (último dia)
                    '<p style="margin-top: 15px;"><strong>Prazo final para análise:</strong> ' || TO_CHAR(v_dhsolicit + 15, 'DD/MM/YYYY') || '</p>' ||
                    '<p style="margin-top: 10px;"><strong>Dias restantes para análise:</strong> <span style="color: #dc3545; font-weight: bold;">' || ROUND(v_dhsolicit + 15 - SYSDATE, 0) || ' dia(s)</span></p>' ||
                    -- Alerta crítico de reprovação
                    '<p style="color: #721c24; margin-top: 15px;"><strong>ALERTA CRÍTICO:</strong> Amanhã, dia <strong>' || TO_CHAR(v_dhsolicit + 15, 'DD/MM/YYYY') || '</strong>, esta requisição será <u>automaticamente reprovada</u> do sistema se não for analisada pelos responsáveis. <strong>Requisições reprovadas automaticamente devem ser recriadas no sistema, caso o usuário ainda deseje seguir com a solicitação.</strong></p>' ||
                    '<br>' ||
                    '<p>Agradecemos sua compreensão.<br>' ||
                    'Departamento de Compras - Sistema de Notificações</p>' ||
                    -- Logo ao final
                    '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
            
            ELSIF v_dias_pendentes >= 15 THEN
                -- Atualizar a requisição como reprovada
                UPDATE TSILIB
                SET REPROVADO = 'S',
                    DHLIB = SYSDATE,
                    OBSCOMPL = 'REPROVADO NÃO LIBERAÇÃO NO PRAZO'
                WHERE NUCHAVE = v_nuchave
                  AND NUCLL = v_nucll
                  AND SEQCASCATA = v_seqcascata
                  AND SEQUENCIA = v_sequencia
                  AND EVENTO = v_evento
                  AND TABELA = v_tabela;
                -- Atualizar a requisição pelo NUCHAVE como PENDENTE ='N'
                   UPDATE TGFCAB SET PENDENTE = 'N' WHERE NUNOTA = v_nuchave;
                   UPDATE TGFITE SET PENDENTE = 'N' WHERE NUNOTA = v_nuchave;

                -- Email para requisições pendentes há 15 dias ou mais (após prazo)
                v_corpo := 
                    '<p>Prezado(a) <strong>' || v_nome_usuario || '</strong>,</p>' ||
                    '<p><strong>INFORMAÇÃO:</strong> A requisição nº <strong>' || v_nuchave || '</strong> foi <strong>automaticamente reprovada</strong> do sistema.</p>' ||
                    '<p><strong>Data da solicitação:</strong> ' || TO_CHAR(v_dhsolicit, 'DD/MM/YYYY HH24:MI') || '</p>' ||
                    '<p><strong>Descrição da Requisição:</strong><br>' || v_observacao || '</p>' ||
                    '<p><strong>Tempo de pendência:</strong> ' || round(v_dias_pendentes,2) || ' dia(s)</p>' ||
                    -- Cálculo dinâmico do prazo que já passou
                    '<p style="margin-top: 15px;"><strong>Prazo final que já expirou:</strong> ' || TO_CHAR(v_dhsolicit + 15, 'DD/MM/YYYY') || '</p>' ||
                    '<p style="margin-top: 10px;"><strong>Dias após o prazo:</strong> <span style="color: #dc3545; font-weight: bold;">' || ROUND(SYSDATE - (v_dhsolicit + 15), 0) || ' dia(s)</span></p>' ||
                    -- Bloco de destaque para informação de reprovação
                    '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin-top: 15px;">' ||
                    '<strong style="color: #155724;">REPROVAÇÃO AUTOMÁTICA REALIZADA</strong><br>' ||
                    '<strong>Esta requisição foi reprovada do sistema conforme a política de reprovação automática após 15 dias de pendência sem análise pelos responsáveis.</strong>' ||
                    '</div>' ||
                    -- Informação sobre nova solicitação
                    '<p style="color: #155724; margin-top: 15px;"><strong>Observação:</strong> Caso ainda seja necessária a liberação, será necessário criar uma nova requisição no sistema.</p>' ||
                    '<br>' ||
                    '<p>Agradecemos sua compreensão.<br>' ||
                    'Departamento de Compras - Sistema de Notificações</p>' ||
                    -- Logo ao final
                    '<img src="https://github.com/dfmoura/test_several1/blob/main/oracle/1/0064_constrole_homologacao_insumos_rd/satis_logo.jpg?raw=true" alt="Logo" style="margin-top: 20px;">';
            
            END IF;
        END IF;

        -- Inserir o registro na tabela de envio de mensagens
        INSERT INTO TMDFMG (
            CODFILA, ASSUNTO, CODMSG, DTENTRADA, STATUS,
            CODCON, TENTENVIO, MENSAGEM, TIPOENVIO, MAXTENTENVIO,
            EMAIL, CODSMTP
        )
        VALUES (
            v_codfila, v_assunto, NULL, SYSDATE, 'Pendente',
            0, 0, v_corpo, 'E', 3,
            v_email, 31
        );
        
         
    END LOOP;
 
       -- Commit para cada inserção (opcional - pode ser movido para fora do loop)
        COMMIT;

   
    -- Fechar o cursor
    CLOSE c_liberacoes_pendentes;
    
END STP_REQ_MAIL_PEND_SATIS;
/