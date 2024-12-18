package br.com.satyuacode.primeiro_curso;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.BigDecimalUtil;

import java.math.BigDecimal;
import java.sql.Timestamp;

public class LancamentoCabecalhoBT implements AcaoRotinaJava {


    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("LancamentoCabecalhoBT - Inicio");

        //Aqui ficara a parte dos parametros
        BigDecimal codCurso = BigDecimalUtil.valueOf((String)contexto.getParam("P_CUDCUR"));
        Timestamp dataInicial = (Timestamp)contexto.getParam("P_DTINICIO");
        Timestamp dataFinal = (Timestamp)contexto.getParam("P_DTFIM");
        String codParceiro = (String)contexto.getParam("P_CODPARC");




        //Como incluir um valor no sankhya
        Registro cabecalho = contexto.novaLinha("AD_TRECAB");
        cabecalho.setCampo("CODCUR",codCurso);
        cabecalho.setCampo("DTINICIO",dataInicial);
        cabecalho.setCampo("DTFIM",dataFinal);
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
