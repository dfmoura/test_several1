package BotaoAcao;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.Timestamp;

public class ImportarItensParaControleLista implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");
        BigDecimal codUsu = contexto.getUsuarioLogado();

        JdbcWrapper jdbc = null;
        NativeSql sql = null;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT NUNOTA, CODPROD, QTDNEG, QTDENTREGUE FROM TGFITE WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);

            ResultSet rs = sql.executeQuery();

            while (rs.next()) {
                BigDecimal codProd = rs.getBigDecimal("CODPROD");
                BigDecimal pesoTotal = rs.getBigDecimal("QTDNEG");
                BigDecimal qtdEntregue = rs.getBigDecimal("QTDENTREGUE");

                String perfil = null;
                String material = null;

                // Buscar AD_PERFIL e AD_MATERIAL na TGFPRO
                NativeSql sqlProd = new NativeSql(jdbc);
                sqlProd.appendSql("SELECT AD_PERFIL, AD_MATERIAL FROM TGFPRO WHERE CODPROD = :CODPROD");
                sqlProd.setNamedParameter("CODPROD", codProd);
                ResultSet rsProd = sqlProd.executeQuery();
                if (rsProd.next()) {
                    perfil = rsProd.getString("AD_PERFIL");
                    material = rsProd.getString("AD_MATERIAL");
                }
                NativeSql.releaseResources(sqlProd);

                // Recuperar próximo código sequencial
                BigDecimal codigo = getProximoCodigoControleLista(jdbc);

                // Inserir na AD_CONTROLELISTA
                NativeSql insertSql = new NativeSql(jdbc);
                insertSql.appendSql("INSERT INTO AD_CONTROLELISTA " +
                        "(CODIGO, DTATUAL, TP_LISTA, CODPROD, PERFIL, MATERIAL, NUNOTA, PESO_TOTAL, QTDENTREGUE, CODUSU) " +
                        "VALUES (:CODIGO, CURRENT_DATE, :TP_LISTA, :CODPROD, :PERFIL, :MATERIAL, :NUNOTA, :PESO_TOTAL, :QTDENTREGUE, :CODUSU)");
                insertSql.setNamedParameter("CODIGO", codigo);
                insertSql.setNamedParameter("TP_LISTA", "tgfite");
                insertSql.setNamedParameter("CODPROD", codProd);
                insertSql.setNamedParameter("PERFIL", perfil);
                insertSql.setNamedParameter("MATERIAL", material);
                insertSql.setNamedParameter("NUNOTA", nunota);
                insertSql.setNamedParameter("PESO_TOTAL", pesoTotal);
                insertSql.setNamedParameter("QTDENTREGUE", qtdEntregue);
                insertSql.setNamedParameter("CODUSU", codUsu);

                insertSql.executeUpdate();
                NativeSql.releaseResources(insertSql);
            }

            contexto.setMensagemRetorno("Registros da TGFITE importados com sucesso para AD_CONTROLELISTA.");

        } finally {
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }
    }

    private BigDecimal getProximoCodigoControleLista(JdbcWrapper jdbc) throws Exception {
        NativeSql sql = null;
        BigDecimal proximoCodigo = BigDecimal.ONE;

        try {
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT MAX(CODIGO) AS MAX_CODIGO FROM AD_CONTROLELISTA");
            ResultSet rs = sql.executeQuery();
            if (rs.next() && rs.getBigDecimal("MAX_CODIGO") != null) {
                proximoCodigo = rs.getBigDecimal("MAX_CODIGO").add(BigDecimal.ONE);
            }
        } finally {
            NativeSql.releaseResources(sql);
        }
        return proximoCodigo;
    }
}
