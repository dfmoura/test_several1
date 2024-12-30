package br.com.satyuacode.primeiro_curso;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;

public class ImportarFuncionariosBT implements AcaoRotinaJava {
    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("ImportarFuncionarioBT INICIO");


        //LER PARAMETRO
        String codDepartamentoString =  (String) contexto.getParam("P_CODDEP");
        if (StringUtils.isEmpty(codDepartamentoString))
            contexto.mostraErro("O paramentro 'P_CODDEP' deve ser preenchido.");

        BigDecimal codDepartamento = BigDecimalUtil.valueOf(codDepartamentoString);

        System.out.println("Cod. Do Departamento eh: "+ codDepartamento);


        //LER QUERY
        QueryExecutor query = contexto.getQuery();
        query.nativeSelect("");



        // 1 - Ler o parametro
        // 2 - fazer uma query dentro da tabela de funcionarios e passar o codigo do parametro. Validando
        //que o CODDEPARTAMENTO = NOSSO PARAMETRO
        // 3 -  Incluir na nossa tabela filha.




        System.out.println("ImportarFuncionarioBT FIM");
    }
}
