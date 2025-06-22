package BotaoAcao;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.math.BigDecimal;
import java.sql.ResultSet;

public class EstornoRequisicaoBotao implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");

        JdbcWrapper jdbc = null;
        NativeSql sql = null;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();
            sql = new NativeSql(jdbc);

            // Variáveis de controle
            BigDecimal pCotacao = BigDecimal.ZERO;
            BigDecimal pStatusDifL = BigDecimal.ZERO;
            BigDecimal pCabPendente = BigDecimal.ZERO;
            BigDecimal pPedNota = BigDecimal.ZERO;
            BigDecimal pItePendente = BigDecimal.ZERO;

            // Consulta TGFCAB
            sql.appendSql("SELECT NVL(NUMCOTACAO, 0), " +
                    "CASE WHEN STATUSNOTA = 'L' THEN 0 ELSE 1 END, " +
                    "CASE WHEN PENDENTE = 'S' THEN 0 ELSE 1 END " +
                    "FROM TGFCAB WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);

            ResultSet rs = sql.executeQuery();
            if (rs.next()) {
                pCotacao = rs.getBigDecimal(1);
                pStatusDifL = rs.getBigDecimal(2);
                pCabPendente = rs.getBigDecimal(3);
            }
            NativeSql.releaseResources(sql);

            // Verifica pedido ou nota
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT COUNT(*) FROM TGFVAR WHERE NUNOTAORIG = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);

            rs = sql.executeQuery();
            if (rs.next()) {
                pPedNota = rs.getBigDecimal(1);
            }
            NativeSql.releaseResources(sql);

            // Verifica pendência de itens
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT SUM(CASE WHEN PENDENTE = 'S' THEN 0 ELSE 1 END) FROM TGFITE WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);

            rs = sql.executeQuery();
            if (rs.next()) {
                BigDecimal result = rs.getBigDecimal(1);
                pItePendente = result != null ? result : BigDecimal.ZERO;
            }

            // Validações
            if (pCotacao.compareTo(BigDecimal.ZERO) > 0) {
                contexto.setMensagemRetorno("Esta requisição não pode ser estornada porque já possui uma cotação associada.");
                return;
            }

            if (pStatusDifL.compareTo(BigDecimal.ZERO) > 0) {
                contexto.setMensagemRetorno("Esta requisição não pode ser estornada porque não está liberada.");
                return;
            }

            if (pCabPendente.compareTo(BigDecimal.ZERO) > 0) {
                contexto.setMensagemRetorno("Esta requisição não pode ser estornada porque não está pendente.");
                return;
            }

            if (pPedNota.compareTo(BigDecimal.ZERO) > 0) {
                contexto.setMensagemRetorno("Esta requisição não pode ser estornada porque possui pedido ou nota.");
                return;
            }

            if (pItePendente.compareTo(BigDecimal.ZERO) > 0) {
                contexto.setMensagemRetorno("Esta requisição não pode ser estornada porque os itens não estão pendentes.");
                return;
            }

            contexto.setMensagemRetorno("Requisição validada com sucesso. Pode ser estornada.");

        } finally {
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }
    }
}
