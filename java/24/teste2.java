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

        // Pega conteúdo BLOB da tabela TSIATA com base no NUNOTA
        byte[] blobData = getBlobFromTSIATA(nunota);
        if (blobData == null) {
            contexto.setMensagemRetorno("Nenhum arquivo encontrado para esta nota.");
            return;
        }

        // Lê conteúdo CSV do BLOB
        String conteudoCSV = lerCSVDoBlob(blobData);
        contexto.setMensagemRetorno("Refente a nunota: " + nunota + "\n\nConteúdo do CSV:\n" + conteudoCSV);


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
            sql.appendSql("SELECT CONTEUDO FROM TSIATA WHERE CODATA = :NUNOTA AND DESCRICAO LIKE 'IMPORT'");
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

    private String lerCSVDoBlob(byte[] blobData) throws Exception {
        InputStream inputStream = new ByteArrayInputStream(blobData);
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

        StringBuilder conteudo = new StringBuilder();
        String linha;
        int linhaNum = 0;

        while ((linha = reader.readLine()) != null) {
            if (linhaNum == 0) {
                // Remove BOM se presente no início do arquivo
                linha = linha.replace("\uFEFF", "");
                conteudo.append("Cabeçalho: ").append(linha).append("\n");
            } else {
                String[] colunas = linha.split(SEPARADOR);
                if (colunas.length >= 3) {
                    String teste1 = colunas[0].trim();
                    String teste2 = colunas[1].trim();
                    String teste3 = colunas[2].trim();

                    conteudo.append("Linha ").append(linhaNum).append(" - ")
                            .append("Teste1: ").append(teste1).append(", ")
                            .append("Teste2: ").append(teste2).append(", ")
                            .append("Teste3: ").append(teste3).append("\n");
                } else {
                    conteudo.append("Linha ").append(linhaNum).append(" - Formato inválido\n");
                }
            }
            linhaNum++;
        }

        reader.close();
        return conteudo.toString();
    }
}
