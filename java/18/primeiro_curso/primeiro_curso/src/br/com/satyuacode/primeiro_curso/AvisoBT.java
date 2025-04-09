package br.com.satyuacode.primeiro_curso;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.TimeUtils;

import java.math.BigDecimal;

public class AvisoBT implements AcaoRotinaJava {
    @Override
    public void doAction(ContextoAcao contexto) throws Exception {

        // enviar uma notificação para o usuario ou grupo de usuario

        // tsiavi



        Registro cabecalho = contexto.novaLinha("TSIAVI");
        cabecalho.setCampo("TITULO","Falha no Compilador Interno");
        cabecalho.setCampo("DESCRICAO","Prezado Diogo foi detectado uma falha, favor verificar!");
        cabecalho.setCampo("SOLUCAO","Corrigimo o módulo de disjunção disruptiva.");
        cabecalho.setCampo("IDENTIFICADOR","PERSONALIZACAO");
        cabecalho.setCampo("IMPORTANCIA",BigDecimal.ONE);
        cabecalho.setCampo("CODUSU", BigDecimal.ZERO);
//        cabecalho.setCampo("CODGRUPO",codCurso);
        cabecalho.setCampo("TIPO","P");
        cabecalho.setCampo("CODUSUREMETENTE",new BigDecimal(-1));
        cabecalho.setCampo("DHCRIACAO", TimeUtils.getNow());
        cabecalho.save();



    }
}
