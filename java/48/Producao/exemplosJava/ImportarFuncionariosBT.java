package br.com.triggerint.primeiro_curso;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;
import com.sankhya.util.TimeUtils;

import java.math.BigDecimal;

public class ImportarFuncionariosBT implements AcaoRotinaJava {


    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("ImportarFuncionariosBT - INICIO");

        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nroUnico = (BigDecimal) cabecalho.getCampo("NROUNICO");
        System.out.println("Nro Unico Cabecalho: "+nroUnico);

        // Ler parametros
        String codDepartamentoString = (String) contexto.getParam("P_CODDEP");
        if (StringUtils.isEmpty(codDepartamentoString))
            contexto.mostraErro("O parametro 'P_CODDEP' deve ser preenchido!");

        BigDecimal codDepartamento =  BigDecimalUtil.valueOf(codDepartamentoString);

        System.out.println("Cód. do Departamento é: " + codDepartamento);

        // Ler query
        QueryExecutor query = contexto.getQuery();
        query.setParam("P_CODDEP",codDepartamento);
        query.nativeSelect("SELECT CODFUNC,CODEMP FROM TFPFUN WHERE CODDEP = {P_CODDEP}");
        int contador = 0;
        while (query.next()){

           BigDecimal codFuncionario = query.getBigDecimal("CODFUNC");
           BigDecimal codEmpresa = query.getBigDecimal("CODEMP");

           Registro item = contexto.novaLinha("AD_TREITE");
           item.setCampo("NROUNICO",nroUnico);
           item.setCampo("CODEMP",codEmpresa);
           item.setCampo("CODFUNC",codFuncionario);
           item.setCampo("CODDEP",codDepartamento);
           item.setCampo("DTINC", TimeUtils.getNow());
           item.setCampo("CODUSU", contexto.getUsuarioLogado());
           item.save();


           contador ++;

        }
        query.close();

        if (contador==0){
            contexto.setMensagemRetorno("A query não retornou nada! Verifique seu parametro informado! " + codDepartamento);
        } else {
            contexto.setMensagemRetorno("Sucesso. Funcionários importados. Quantidade: "+ contador);
        }



        System.out.println("ImportarFuncionariosBT - FIM");
    }
}
