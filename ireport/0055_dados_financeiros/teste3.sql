CREATE OR REPLACE FUNCTION FC_FORMATAHTML_NEUON(P_MENSAGEM VARCHAR2,
                                          P_MOTIVO   VARCHAR2,
                                          P_SOLUCAO  VARCHAR2)
  RETURN VARCHAR2 IS
  P_TEXTO VARCHAR2(4000);
  p_owner varchar2(100);

BEGIN

    P_TEXTO := '<p align=''center''><a href="http://www.sankhya.com.br" target="_blank"><img src="https://media.sankhya.com.br/wp-content/uploads/2022/07/logo-preto-1.svg"></img></a></p><br/>' ||
               '<br/><br/><br/><p align="left"><font size="12" face="arial" color="#8B1A1A"><br></font><b>Atenção:  </b>' ||
               P_MENSAGEM || '  <br><br>' || case
                 when P_MOTIVO IS NULL THEN
                  ''
                 ELSE
                  '<b>Motivo: </b> ' || P_MOTIVO || '<br><br>'
               END || case
                 when P_SOLUCAO IS NULL THEN
                  ''
                 ELSE
                  '<b>Solução: </b> ' || P_SOLUCAO || '<br><br>'
               END ||
               '<p align="center"><font size="10" color="#008B45"><b>Informac?es para o Implantador e/ou equipe Sankhya</b></font>';
               
  RETURN P_TEXTO;
END
;
/