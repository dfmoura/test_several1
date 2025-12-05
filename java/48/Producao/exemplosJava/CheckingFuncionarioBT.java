package br.com.trigger.acessodados;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;

import java.math.BigDecimal;

public class CheckingFuncionarioBT implements AcaoRotinaJava {
    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("CheckingFuncionarioBT - INICIO");


        // LER AS LINHAS OU LINHA SELECIONADA PELO USUARIO

        for (int i = 0; i < contexto.getLinhas().length; i++){
            System.out.println("INDICE "+i);
            Registro registro =  contexto.getLinhas()[i];

            BigDecimal nroUnico = (BigDecimal)registro.getCampo("NROUNICO");
            BigDecimal sequencia = (BigDecimal)registro.getCampo("SEQUENCIA");
            System.out.println("Nro Unico: "+ nroUnico +" - " + "Sequencia: "+sequencia );

            // REALIZAR A ATUALIZAÇÃO VIA BANCO DO CHECK IN

            QueryExecutor query = contexto.getQuery();
            query.setParam("NROUNICO",nroUnico);
            query.setParam("SEQUENCIA",sequencia);
            query.update("UPDATE AD_TREITE SET CHECKIN = 'S' WHERE NROUNICO = {NROUNICO} AND SEQUENCIA = {SEQUENCIA}");
            query.close();

        }

        // TRAZER A MENSAGEM
        contexto.setMensagemRetorno("Rotina executada com sucesso! ");


        System.out.println("CheckingFuncionarioBT - FIM");
    }
}
