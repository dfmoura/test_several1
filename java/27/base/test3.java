package BotaoAcao;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class ImpProdMovInterna implements AcaoRotinaJava {

    private static final String SEPARADOR = ";";

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("Início da importação.");

        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");

        if (existeItensParaNunota(nunota)) {
            byte[] blobData = getBlobFromTSIATA(nunota);
            if (blobData != null) {
                InputStream inputStream = new ByteArrayInputStream(blobData);
                BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

                String linha;
                int linhaNum = 0;

                while ((linha = reader.readLine()) != null) {
                    linhaNum++;
                    if (linhaNum <= 2) continue;

                    String[] colunas = linha.split(SEPARADOR);
                    if (colunas.length < 5) break;

                    String perfil = colunas[0].trim();
                    String material = colunas[1].trim();
                    String pesoTotalStr = colunas[4].trim().replace("\"", "").replace(".", "").replace(",", ".");

                    BigDecimal pesoTotal = BigDecimal.ZERO;
                    try {
                        pesoTotal = new BigDecimal(pesoTotalStr);
                    } catch (NumberFormatException e) {
                        pesoTotal = BigDecimal.ZERO;
                    }

                    JdbcWrapper jdbc = null;
                    NativeSql insertSql = null;
                    try {
                        jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
                        jdbc.openSession();

                        BigDecimal codUsu = contexto.getUsuarioLogado();
                        BigDecimal proximoCodigo = getProximoCodigoControleLista(jdbc);

                        insertSql = new NativeSql(jdbc);
                        insertSql.appendSql("INSERT INTO AD_CONTROLELISTA (CODIGO, TP_LISTA, PERFIL, MATERIAL, PESO_TOTAL, CODUSU, NUNOTA, DTATUAL) " +
                                "VALUES (:CODIGO, :TP_LISTA, :PERFIL, :MATERIAL, :PESO_TOTAL, :CODUSU, :NUNOTA, CURRENT_DATE)");
                        insertSql.setNamedParameter("CODIGO", proximoCodigo);
                        insertSql.setNamedParameter("TP_LISTA", "lista substituta");
                        insertSql.setNamedParameter("PERFIL", perfil);
                        insertSql.setNamedParameter("MATERIAL", material);
                        insertSql.setNamedParameter("PESO_TOTAL", pesoTotal);
                        insertSql.setNamedParameter("CODUSU", codUsu);
                        insertSql.setNamedParameter("NUNOTA", nunota);
                        insertSql.executeUpdate();

                    } finally {
                        NativeSql.releaseResources(insertSql);
                        JdbcWrapper.closeSession(jdbc);
                    }

                    break; // processa só a primeira linha útil
                }

                reader.close();
            }

            contexto.setMensagemRetorno("Validar lista substituta para seguir com importação de lista.");
            return;
        }

        byte[] blobData = getBlobFromTSIATA(nunota);
        if (blobData == null) {
            contexto.setMensagemRetorno("Arquivo não encontrado. Certifique-se de anexar o arquivo com nome 'lista'.");
            return;
        }

        processarCSV(blobData, nunota, contexto);
        contexto.setMensagemRetorno("Importação concluída com sucesso.");
        System.out.println("Fim da importação.");
    }

    private boolean existeItensParaNunota(BigDecimal nunota) throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        boolean existe = false;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT COUNT(*) AS TOTAL FROM TGFITE WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);

            ResultSet rs = sql.executeQuery();
            if (rs.next() && rs.getInt("TOTAL") > 0) {
                existe = true;
            }

        } finally {
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }

        return existe;
    }

    private byte[] getBlobFromTSIATA(BigDecimal nunota) throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        byte[] conteudo = null;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT CONTEUDO FROM TSIATA WHERE CODATA = :NUNOTA AND LOWER(DESCRICAO) = 'lista'");
            sql.setNamedParameter("NUNOTA", nunota);

            ResultSet rs = sql.executeQuery();
            if (rs.next()) {
                conteudo = rs.getBytes("CONTEUDO");
            }

        } finally {
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }

        return conteudo;
    }

    private void processarCSV(byte[] blobData, BigDecimal nunota, ContextoAcao contexto) throws Exception {
        InputStream inputStream = new ByteArrayInputStream(blobData);
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

        List<String> erros = new ArrayList<>();
        String linha;
        int linhaNum = 0;

        JdbcWrapper jdbc = null;
        NativeSql insertSql = null;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            NativeSql sql = new NativeSql(jdbc);
            sql.appendSql("SELECT CODEMP FROM TGFCAB WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);
            ResultSet rs = sql.executeQuery();

            BigDecimal codEmp = null;
            if (rs.next()) {
                codEmp = rs.getBigDecimal("CODEMP");
            } else {
                throw new Exception("Não foi possível localizar a empresa da nota.");
            }
            NativeSql.releaseResources(sql);

            int sequencia = 1;
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT MAX(SEQUENCIA) AS SEQUENCIA FROM TGFITE WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);
            rs = sql.executeQuery();
            if (rs.next() && rs.getBigDecimal("SEQUENCIA") != null) {
                sequencia = rs.getBigDecimal("SEQUENCIA").intValue() + 1;
            }
            NativeSql.releaseResources(sql);

            BigDecimal codUsu = contexto.getUsuarioLogado();

            while ((linha = reader.readLine()) != null) {
                linha = linha.replace("\uFEFF", "");
                linhaNum++;

                if (linhaNum <= 2) continue;

                String[] colunas = linha.split(SEPARADOR);
                if (colunas.length < 5) continue;

                String perfil = colunas[0].trim();
                String material = colunas[1].trim();
                String pesoTotalStr = colunas[4].trim().replace("\"", "").replace(".", "").replace(",", ".");

                BigDecimal qtdNeg;
                try {
                    qtdNeg = new BigDecimal(pesoTotalStr);
                } catch (NumberFormatException e) {
                    throw new Exception("Erro ao converter valor na linha " + linhaNum + ": " + pesoTotalStr);
                }

                BigDecimal codProd = buscarCodProd(jdbc, perfil, material);
                if (codProd == null) {
                    erros.add("Produto não encontrado: " + perfil + " - " + material);
                    continue;
                }

                sql = new NativeSql(jdbc);
                sql.appendSql("SELECT USOPROD, CODVOL FROM TGFPRO WHERE CODPROD = :CODPROD");
                sql.setNamedParameter("CODPROD", codProd);
                ResultSet rsAux = sql.executeQuery();

                String usoProd = " ";
                String codVol = "UN";

                if (rsAux.next()) {
                    usoProd = rsAux.getString("USOPROD");
                    codVol = rsAux.getString("CODVOL");
                }
                NativeSql.releaseResources(sql);

                insertSql = new NativeSql(jdbc);
                insertSql.appendSql(
                        "INSERT INTO TGFITE (NUNOTA, SEQUENCIA, CODEMP, CODPROD, CODLOCALORIG, CONTROLE, USOPROD, CODCFO, " +
                                "QTDNEG, QTDENTREGUE, QTDCONFERIDA, VLRUNIT, VLRTOT, VLRCUS, BASEIPI, VLRIPI, BASEICMS, VLRICMS, " +
                                "VLRDESC, BASESUBSTIT, VLRSUBST, PENDENTE, CODVOL, ATUALESTOQUE, RESERVA, STATUSNOTA, CODVEND, CODEXEC, " +
                                "FATURAR, VLRREPRED, VLRDESCBONIF, PERCDESC) " +
                                "VALUES (:NUNOTA, :SEQUENCIA, :CODEMP, :CODPROD, 0, ' ', :USOPROD, 0, :QTDNEG, 0, 0, 0, 0, 0, " +
                                "0, 0, 0, 0, 0, 0, 0, 'S', :CODVOL, 0, 'N', 'A', 0, 0, 'N', 0, 0, 0)");
                insertSql.setNamedParameter("NUNOTA", nunota);
                insertSql.setNamedParameter("SEQUENCIA", BigDecimal.valueOf(sequencia));
                insertSql.setNamedParameter("CODEMP", codEmp);
                insertSql.setNamedParameter("CODPROD", codProd);
                insertSql.setNamedParameter("USOPROD", usoProd);
                insertSql.setNamedParameter("CODVOL", codVol);
                insertSql.setNamedParameter("QTDNEG", qtdNeg);
                insertSql.executeUpdate();

                // Inserção na AD_CONTROLELISTA com NUNOTA e DTATUAL
                BigDecimal codigo = getProximoCodigoControleLista(jdbc);
                NativeSql insertControle = new NativeSql(jdbc);
                insertControle.appendSql("INSERT INTO AD_CONTROLELISTA (CODIGO, TP_LISTA, PERFIL, MATERIAL, PESO_TOTAL, CODUSU, NUNOTA, DTATUAL) " +
                        "VALUES (:CODIGO, :TP_LISTA, :PERFIL, :MATERIAL, :PESO_TOTAL, :CODUSU, :NUNOTA, CURRENT_DATE)");
                insertControle.setNamedParameter("CODIGO", codigo);
                insertControle.setNamedParameter("TP_LISTA", "lista inicial");
                insertControle.setNamedParameter("PERFIL", perfil);
                insertControle.setNamedParameter("MATERIAL", material);
                insertControle.setNamedParameter("PESO_TOTAL", qtdNeg);
                insertControle.setNamedParameter("CODUSU", codUsu);
                insertControle.setNamedParameter("NUNOTA", nunota);
                insertControle.executeUpdate();

                sequencia++;
            }

            if (!erros.isEmpty()) {
                StringBuilder erroMsg = new StringBuilder("Produtos não encontrados:\n");
                for (String erro : erros) erroMsg.append(erro).append("\n");
                throw new Exception(erroMsg.toString());
            }

        } finally {
            NativeSql.releaseResources(insertSql);
            JdbcWrapper.closeSession(jdbc);
            reader.close();
        }
    }

    private BigDecimal buscarCodProd(JdbcWrapper jdbc, String perfil, String material) throws Exception {
        NativeSql sql = null;
        BigDecimal codProd = null;

        try {
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT CODPROD FROM TGFPRO WHERE AD_PERFIL = :PERFIL AND AD_MATERIAL = :MATERIAL");
            sql.setNamedParameter("PERFIL", perfil);
            sql.setNamedParameter("MATERIAL", material);

            ResultSet rs = sql.executeQuery();
            if (rs.next()) {
                codProd = rs.getBigDecimal("CODPROD");
            }

        } finally {
            NativeSql.releaseResources(sql);
        }

        return codProd;
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
