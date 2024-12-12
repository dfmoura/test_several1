package br.com.satyuacode.primeiro_curso;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;

public class PrimeiroBotaoDeAcao implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contextoAcao) throws Exception {
        System.out.println("Satya Code - Primeiro Projeto");
        contextoAcao.setMensagemRetorno("Nosso primeiro projeto");
    }
}
