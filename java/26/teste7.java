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
        contexto.setMensagemRetorno(conteudoCSV);

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
        List<String> erros = new ArrayList<>();
        String linha;
        int linhaNum = 0;
        int sequencia = 1;

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
                throw new Exception("Não foi possível recuperar o 'Cód. Empresa' desta requisição.");
            }
            NativeSql.releaseResources(sql);

            while ((linha = reader.readLine()) != null) {
                if (linhaNum == 0) {
                    linha = linha.replace("\uFEFF", "");
                    conteudo.append("Cabeçalho: ").append(linha).append(System.lineSeparator());
                } else {
                    String[] colunas = linha.split(SEPARADOR);
                    if (colunas.length >= 3) {
                        String perfil = colunas[0].trim();
                        String material = colunas[1].trim();
                        String valorOriginal = colunas[2].trim();
                        BigDecimal qtdNeg = new BigDecimal(valorOriginal);

                        BigDecimal codProd = buscarCodProd(jdbc, perfil, material);
                        if (codProd == null) {
                            erros.add(perfil + "-" + material + " ||| ");
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

                        conteudo.append("Linha ").append(linhaNum).append(" inserida com sucesso (TGFITE): ")
                                .append(perfil).append(", ")
                                .append(material).append(", QTD: ")
                                .append(qtdNeg.toString().replace(".", ","))
                                .append(", CODPROD: ").append(codProd).append(System.lineSeparator());

                        sequencia++;
                    } else {
                        conteudo.append("Linha ").append(linhaNum).append(" inválida").append(System.lineSeparator());
                    }
                }
                linhaNum++;
            }

            if (!erros.isEmpty()) {
                StringBuilder msgErro = new StringBuilder("Produtos sem vínculo no cadastro:").append(System.lineSeparator());
                for (String erro : erros) {
                    msgErro.append(erro).append(System.lineSeparator());
                }
                throw new Exception(msgErro.toString());
            }

        } finally {
            NativeSql.releaseResources(insertSql);
            JdbcWrapper.closeSession(jdbc);
            reader.close();
        }

        return conteudo.toString();
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
}
