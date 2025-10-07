-- Função convertida de Oracle para SQL Server
-- Formata mensagens HTML para exibição de erros e avisos
CREATE OR ALTER FUNCTION FC_FORMATAHTML_NEUON(
    @P_MENSAGEM VARCHAR(4000),
    @P_MOTIVO   VARCHAR(4000),
    @P_SOLUCAO  VARCHAR(4000)
)
RETURNS VARCHAR(4000)
AS
BEGIN
    DECLARE @P_TEXTO VARCHAR(4000);
    DECLARE @p_owner VARCHAR(100);

    SET @P_TEXTO = '<p align=''center''><a href="http://www.sankhya.com.br" target="_blank"><img src="https://media.sankhya.com.br/wp-content/uploads/2022/07/logo-preto-1.svg"></img></a></p><br/>' +
                   '<br/><br/><br/><p align="left"><font size="12" face="arial" color="#8B1A1A"><br></font><b>Atenção:  </b>' +
                   @P_MENSAGEM + '  <br><br>' + 
                   CASE
                       WHEN @P_MOTIVO IS NULL THEN ''
                       ELSE '<b>Motivo: </b> ' + @P_MOTIVO + '<br><br>'
                   END + 
                   CASE
                       WHEN @P_SOLUCAO IS NULL THEN ''
                       ELSE '<b>Solução: </b> ' + @P_SOLUCAO + '<br><br>'
                   END +
                   '<p align="center"><font size="10" color="#008B45"><b>Informações para o Implantador e/ou equipe Sankhya</b></font>';

    RETURN @P_TEXTO;
END;
