package br.com.trigger.acessodados;

import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.wrapper.JapeFactory;
import br.com.sankhya.jape.wrapper.JapeWrapper;
import br.com.sankhya.modelcore.MGEModelException;
import br.com.sankhya.modelcore.util.DynamicEntityNames;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.Collection;

public class NativeSqlExemplo {

    public void buscarInformacaoDeUmaColuna() throws Exception {

        BigDecimal qtd = NativeSql.getBigDecimal("COUNT(*)","TGFPAR","TIPPESSOA = 'F'");
        Timestamp dataAlteracao = NativeSql.getTimestamp("DTALTER","TGFPAR","CODPARC = ?", new Object[]{new BigDecimal(129)});
    }

    public void fazerConsulta() throws MGEModelException {

        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        JdbcWrapper jdbc = entityFacade.getJdbcWrapper();
        try {
            jdbc.openSession();
            NativeSql nativeSql = new NativeSql(jdbc);
            nativeSql.appendSql("SELECT * FROM TSIUSU WHERE CODUSU = :CODUSU");
            nativeSql.setNamedParameter("CODUSU",BigDecimal.ZERO);
            ResultSet rs = nativeSql.executeQuery();
            while (rs.next()){
                System.out.println(rs.getBigDecimal("CODUSU"));
                //rs.getTimestamp("TIME");
            }

        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            jdbc.closeSession();
        }
    }



    public void fazerConsultaSQLExterno() throws MGEModelException {

        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        JdbcWrapper jdbc = entityFacade.getJdbcWrapper();
        try {
            jdbc.openSession();
            NativeSql nativeSql = new NativeSql(jdbc);
            nativeSql.loadSql(NativeSqlExemplo.class,"queConsulta.sql");
            nativeSql.setNamedParameter("CODUSU",BigDecimal.ZERO);
            ResultSet rs = nativeSql.executeQuery();
            while (rs.next()){
                rs.getBigDecimal("NOMEUSU");
                //rs.getTimestamp("TIME");
            }

        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            jdbc.closeSession();
        }
    }


}
