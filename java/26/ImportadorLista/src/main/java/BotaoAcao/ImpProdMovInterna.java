package BotaoAcao;

// Importações específicas da API Sankhya e utilitários Java
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

/**
 * Classe principal da rotina personalizada para importação de produtos de uma lista.
 * Objetivo: processar arquivo CSV anexado à requisição e inserir seus dados no grid de itens.
 *
 * Observações:
 * - A requisição é identificada pelo campo NUNOTA (número único da requisição).
 * - O anexo deve ter o nome 'lista' (em letras minúsculas) conforme padronização.
 * - Cada linha do CSV representa um item com perfil, material e quantidade.
 */
public class ImpProdMovInterna implements AcaoRotinaJava {

    private static final String SEPARADOR = ","; // Define o separador padrão de colunas no arquivo CSV

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("Importar BT INICIO");

        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");
        System.out.println("Nunota: " + nunota);

        byte[] blobData = getBlobFromTSIATA(nunota);
        if (blobData == null) {
            contexto.setMensagemRetorno("Nenhum arquivo encontrado para esta requisição.");
            return;
        }

        processarCSV(blobData, nunota);

        contexto.setMensagemRetorno("Lista inserida com sucesso!");
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

    private void processarCSV(byte[] blobData, BigDecimal nunota) throws Exception {
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

            // Recupera o código da empresa (CODEMP) do cabeçalho da requisição
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

            // >>> NOVO CÓDIGO: Buscar última sequência utilizada
            int sequencia = 1;
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT MAX(SEQUENCIA) AS SEQUENCIA FROM TGFITE WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);
            rs = sql.executeQuery();
            if (rs.next() && rs.getBigDecimal("SEQUENCIA") != null) {
                sequencia = rs.getBigDecimal("SEQUENCIA").intValue() + 1;
            }
            NativeSql.releaseResources(sql);
            // <<< FIM DO NOVO CÓDIGO

            while ((linha = reader.readLine()) != null) {
                if (linhaNum == 0 || linhaNum == 1) {
                    linha = linha.replace("\uFEFF", "");
                    linhaNum++;
                    continue;
                }

                String[] colunas = linha.split(SEPARADOR);
                if (colunas.length >= 5) {
                    String perfil = colunas[0].trim();
                    String material = colunas[1].trim();
                    String valorOriginal = colunas[4].trim();

                    BigDecimal qtdNeg;
                    try {
                        qtdNeg = new BigDecimal(valorOriginal);
                    } catch (NumberFormatException e) {
                        throw new Exception("Coluna de Peso Total (kg) não está com formato numérico na linha " + (linhaNum + 1));
                    }

                    BigDecimal codProd = buscarCodProd(jdbc, perfil, material);
                    if (codProd == null) {
                        erros.add(perfil + "-" + material + " ||| ");
                        linhaNum++;
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
                    sequencia++;
                }

                linhaNum++;
            }

            if (!erros.isEmpty()) {
                StringBuilder msgErro = new StringBuilder("Identificamos que os seguintes produtos não possuem vínculo no Cadastro de Produtos. Por favor, revise ou atualize o cadastro conforme necessário.: \n").append(System.lineSeparator());
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