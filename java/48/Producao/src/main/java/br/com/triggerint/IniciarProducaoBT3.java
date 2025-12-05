package main.java.br.com.triggerint;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;

/**
 * Botão de ação simples para confirmar o início da produção.
 */
public class IniciarProducaoBT3 implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.IniciarProducaoBT3 - INICIO");

        // Comentário em português: apenas retornando mensagem de sucesso.
        contexto.setMensagemRetorno("Esta tudo ok!!!!");

        System.out.println("br.com.triggerint.IniciarProducaoBT3 - FIM");
    }
}


