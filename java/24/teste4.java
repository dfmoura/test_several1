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

public class ImpProdMovInterna implements AcaoRotinaJava {

    private static final String SEPARADOR = ",";

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("Importar BT INICIO");

        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");
        System.out.println("Nunota: " + nunota);

        byte[] blobData = getBlobFromTSIATA(nunota);
        if (blobData == null) {
            contexto.setMensagemRetorno("Nenhum arquivo encontrado para esta nota.");
            return;
        }

        String conteudoCSV = processarCSV(blobData, nunota);
        contexto.setMensagemRetorno("Conteúdo do CSV e inserts realizados:\n" + conteudoCSV);

        System.out.println("Importar BT FIM");
    }

    private byte[] getBlobFromTSIATA(BigDecimal nunota) throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        byte[] conteudo = null;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT CONTEUDO FROM TSIATA WHERE CODATA = :NUNOTA AND LOWER(DESCRICAO) LIKE 'lista'");
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

    private String processarCSV(byte[] blobData, BigDecimal nunota) throws Exception {
        InputStream inputStream = new ByteArrayInputStream(blobData);
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

        StringBuilder conteudo = new StringBuilder();
        String linha;
        int linhaNum = 0;
        BigDecimal codigoAtual = getUltimoCodigo();

        JdbcWrapper jdbc = null;
        NativeSql insertSql = null;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            while ((linha = reader.readLine()) != null) {
                if (linhaNum == 0) {
                    linha = linha.replace("\uFEFF", ""); // remove BOM
                    conteudo.append("Cabeçalho: ").append(linha).append("\n");
                } else {
                    String[] colunas = linha.split(SEPARADOR);

                    if (colunas.length >= 3) {
                        String perfil = colunas[0].trim();
                        String material = colunas[1].trim();

                        // Valor original (já no formato correto com ponto decimal)
                        String valorOriginal = colunas[2].trim();
                        BigDecimal qtdNeg = new BigDecimal(valorOriginal);

                        // Para exibição com vírgula decimal
                        String qtdNegFormatado = valorOriginal.replace(".", ",");

                        codigoAtual = codigoAtual.add(BigDecimal.ONE);

                        insertSql = new NativeSql(jdbc);
                        insertSql.appendSql("INSERT INTO AD_IMPPRODMOVINTERNA (CODIGO, PERFIL, MATERIAL, QTDNEG, NUNOTA) ");
                        insertSql.appendSql("VALUES (:CODIGO, :PERFIL, :MATERIAL, :QTDNEG, :NUNOTA)");
                        insertSql.setNamedParameter("CODIGO", codigoAtual);
                        insertSql.setNamedParameter("PERFIL", perfil);
                        insertSql.setNamedParameter("MATERIAL", material);
                        insertSql.setNamedParameter("QTDNEG", qtdNeg);
                        insertSql.setNamedParameter("NUNOTA", nunota);
                        insertSql.executeUpdate();

                        conteudo.append("Linha ").append(linhaNum).append(" inserida com sucesso: ")
                                .append(perfil).append(", ")
                                .append(material).append(", ")
                                .append(qtdNegFormatado).append("\n");
                    } else {
                        conteudo.append("Linha ").append(linhaNum).append(" inválida\n");
                    }
                }
                linhaNum++;
            }

        } finally {
            NativeSql.releaseResources(insertSql);
            JdbcWrapper.closeSession(jdbc);
            reader.close();
        }

        return conteudo.toString();
    }

    private BigDecimal getUltimoCodigo() throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        BigDecimal ultimoCodigo = BigDecimal.ZERO;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT MAX(CODIGO) AS MAX_CODIGO FROM AD_IMPPRODMOVINTERNA");
            ResultSet rs = sql.executeQuery();

            if (rs.next() && rs.getBigDecimal("MAX_CODIGO") != null) {
                ultimoCodigo = rs.getBigDecimal("MAX_CODIGO");
            }

        } finally {
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }

        return ultimoCodigo != null ? ultimoCodigo : BigDecimal.ZERO;
    }
}
