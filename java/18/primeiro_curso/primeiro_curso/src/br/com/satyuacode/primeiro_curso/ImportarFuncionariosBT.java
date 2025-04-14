package br.com.satyuacode.primeiro_curso;

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
        System.out.println("ImportarFuncionario BT INICIO");


        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nrounico =  (BigDecimal) cabecalho.getCampo("NROUNICO");
        System.out.println("Nro. Único Cabeçalho: "+nrounico);




        //LER PARAMETRO
        String codDepartamentoString =  (String) contexto.getParam("P_CODDEP");
        if (StringUtils.isEmpty(codDepartamentoString))
            contexto.mostraErro("O paramentro 'P_CODDEP' deve ser preenchido.");

        BigDecimal codDepartamento = BigDecimalUtil.valueOf(codDepartamentoString);

        System.out.println("Cod. Do Departamento eh: "+ codDepartamento);


        //LER QUERY
        QueryExecutor query = contexto.getQuery();
        query.setParam("P_CODDEP",codDepartamento);
        query.nativeSelect("SELECT CODFUNC, CODEMP FROM TFPFUN WHERE CODDEP = {P_CODDEP}");
        int contador = 0;
        while (query.next()){

            ///
            BigDecimal codFuncionario = query.getBigDecimal("CODFUNC");
            BigDecimal codEmpresa = query.getBigDecimal("CODEMP");


            Registro item = contexto.novaLinha("AD_ADTREITE1");
            item.setCampo("NROUNICO", nrounico);
            item.setCampo("CODEMP",codEmpresa);
            item.setCampo("CODFUNC",codFuncionario);
            item.setCampo("CODDEP",codDepartamento);
            item.setCampo("DTINC", TimeUtils.getNow());
            item.setCampo("CODUSU", contexto.getUsuarioLogado());
            item.save();

            contador++;


        }
        query.close();


        if (contador==0){
            contexto.setMensagemRetorno("A query não retornou nada! Verifique seu parametro informado. Cód. Departamento:" + codDepartamento);
            //nao tem linha na query
        } else {
            contexto.setMensagemRetorno("Sucesso. Funcionário importados. Quantidade: "+contador);
            //sucesso foi incluido.
        }



        // 1 - Ler o parametro
        // 2 - fazer uma query dentro da tabela de funcionarios e passar o codigo do parametro. Validando
        //que o CODDEPARTAMENTO = NOSSO PARAMETRO
        // 3 -  Incluir na nossa tabela filha.




        System.out.println("ImportarFuncionarioBT FIM");
    }
}
