package br.com.satyuacode.primeiro_curso;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;

import java.math.BigDecimal;

public class ChekingFuncionarioBT implements AcaoRotinaJava {
    @Override
    public void doAction(ContextoAcao contexto) throws Exception {

        System.out.println("Iniciou ChekingFuncionarioBT");

        // ler as linha ou linha selecionada pelo usuário

        for ( int i = 0; i < contexto.getLinhas().length; i++){

            System.out.println("INDICE: "+i);

            Registro registro = contexto.getLinhas()[i];

            BigDecimal nrounico = (BigDecimal) registro.getCampo("NROUNICO");
            BigDecimal sequencia = (BigDecimal) registro.getCampo("SEQUENCIA");

            System.out.println("Nro Único: "+ nrounico + " - Sequencia: "+ sequencia);

            // realizar a atualização via banco do checking

            QueryExecutor query =  contexto.getQuery();
            query.setParam("NROUNICO",nrounico);
            query.setParam("SEQUENCIA",sequencia);
            query.update( "update AD_ADTREITE1 set CHECKIN = 'S' where nrounico = {NROUNICO} and sequencia = {SEQUENCIA}");
            query.close();


        }
        // trazer a mensagem
        contexto.setMensagemRetorno("Rotina executada com sucesso! ");













        System.out.println("Finalizou ChekingFuncionarioBT");

    }
}
