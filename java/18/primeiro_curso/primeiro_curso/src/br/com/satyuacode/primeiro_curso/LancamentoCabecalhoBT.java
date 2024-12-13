package br.com.satyuacode.primeiro_curso;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;

public class LancamentoCabecalhoBT implements AcaoRotinaJava {


    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("LancamentoCabecalhoBT - Inicio");

        //Como incluir um valor no sankhya
        Registro cabecalho = contexto.novaLinha("AD_TRECAB");
        cabecalho.setCampo("CODCUR",1);
        cabecalho.setCampo("DTINICIO","01/01/2025");
        cabecalho.setCampo("DTFIM","05/01/2025");
        cabecalho.setCampo("CODUSU",contexto.getUsuarioLogado());
        cabecalho.setCampo("CODPARC",10);
        cabecalho.save();

        Object nrounico = cabecalho.getCampo("NROUNICO");

        StringBuilder mensagem = new StringBuilder();
        mensagem.append("Lancamento realizado com sucesso!").append(" Nro. Unico: ").append(nrounico);

        contexto.setMensagemRetorno(mensagem.toString());
        contexto.setMensagemRetorno("Lancamento realizado com sucesso! Nro. Unico: "+nrounico);

        System.out.println("LancamentoCabecalhoBT - Fim");
    }
}
