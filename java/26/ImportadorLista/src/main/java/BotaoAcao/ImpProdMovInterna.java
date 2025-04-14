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

    /**
     * Método principal chamado ao clicar no botão de ação.
     * Responsável por orquestrar a importação da lista e dar feedback ao usuário.
     */
    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("Importar BT INICIO");

        // A linha pai representa os dados do cabeçalho da requisição
        Registro cabecalho = contexto.getLinhaPai();

        // Recupera o NUNOTA (número único da requisição). Nunca confundir com número de nota fiscal.
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");
        System.out.println("Nunota: " + nunota);

        // Busca o conteúdo binário do anexo associado a esse NUNOTA, nomeado como 'lista'
        byte[] blobData = getBlobFromTSIATA(nunota);
        if (blobData == null) {
            contexto.setMensagemRetorno("Nenhum arquivo encontrado para esta requisição.");
            return;
        }

        // Processa os dados do CSV e insere os itens na TGFITE (grid de itens da requisição)
        processarCSV(blobData, nunota);

        // Mensagem final padronizada (requisitada)
        contexto.setMensagemRetorno("Lista inserida com sucesso!");

        System.out.println("Importar BT FIM");
    }

    /**
     * Consulta o anexo do tipo BLOB da tabela TSIATA utilizando NUNOTA como referência
     * e buscando apenas os arquivos cujo nome (DESCRICAO) esteja como 'lista'.
     *
     * @param nunota número único da requisição
     * @return conteúdo binário (byte[]) do arquivo, ou null se não existir
     */
    private byte[] getBlobFromTSIATA(BigDecimal nunota) throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        byte[] conteudo = null;

        try {
            // Abre sessão com banco via JDBC da Sankhya
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            // Executa SQL nativo para recuperar o anexo do tipo 'lista'
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT CONTEUDO FROM TSIATA WHERE CODATA = :NUNOTA AND LOWER(DESCRICAO) LIKE 'lista'");
            sql.setNamedParameter("NUNOTA", nunota);

            ResultSet rs = sql.executeQuery();
            if (rs.next()) {
                conteudo = rs.getBytes("CONTEUDO"); // Recupera conteúdo do BLOB
            }

        } finally {
            // Libera recursos do SQL e fecha sessão
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }

        return conteudo;
    }

    /**
     * Lê o conteúdo CSV linha a linha e insere os itens no grid da requisição.
     * Cada item é inserido na tabela TGFITE com base nas colunas perfil, material e quantidade.
     */
    private void processarCSV(byte[] blobData, BigDecimal nunota) throws Exception {
        InputStream inputStream = new ByteArrayInputStream(blobData);
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

        List<String> erros = new ArrayList<>();
        String linha;
        int linhaNum = 0;
        int sequencia = 1; // Sequência do item no grid

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

            // Processa cada linha do CSV (ignora cabeçalho na linha 0)
            while ((linha = reader.readLine()) != null) {
                if (linhaNum == 0) {
                    linha = linha.replace("\uFEFF", ""); // Remove BOM (Byte Order Mark) se houver
                } else {
                    String[] colunas = linha.split(SEPARADOR);
                    if (colunas.length >= 3) {
                        String perfil = colunas[0].trim();
                        String material = colunas[1].trim();
                        String valorOriginal = colunas[2].trim();

                        // Utiliza BigDecimal para garantir precisão nas operações numéricas (boas práticas financeiras)
                        BigDecimal qtdNeg = new BigDecimal(valorOriginal);

                        // Busca o código do produto a partir do perfil e material
                        BigDecimal codProd = buscarCodProd(jdbc, perfil, material);
                        if (codProd == null) {
                            erros.add(perfil + "-" + material + " ||| ");
                            continue;
                        }

                        // Busca dados adicionais do produto como uso (USOPROD) e unidade (CODVOL)
                        sql = new NativeSql(jdbc);
                        sql.appendSql("SELECT USOPROD, CODVOL FROM TGFPRO WHERE CODPROD = :CODPROD");
                        sql.setNamedParameter("CODPROD", codProd);
                        ResultSet rsAux = sql.executeQuery();

                        String usoProd = " ";
                        String codVol = "UN"; // Unidade padrão

                        if (rsAux.next()) {
                            usoProd = rsAux.getString("USOPROD");
                            codVol = rsAux.getString("CODVOL");
                        }
                        NativeSql.releaseResources(sql);

                        // Monta o comando de inserção no grid de itens da requisição (TGFITE)
                        insertSql = new NativeSql(jdbc);
                        insertSql.appendSql(
                                "INSERT INTO TGFITE (NUNOTA, SEQUENCIA, CODEMP, CODPROD, CODLOCALORIG, CONTROLE, USOPROD, CODCFO, " +
                                        "QTDNEG, QTDENTREGUE, QTDCONFERIDA, VLRUNIT, VLRTOT, VLRCUS, BASEIPI, VLRIPI, BASEICMS, VLRICMS, " +
                                        "VLRDESC, BASESUBSTIT, VLRSUBST, PENDENTE, CODVOL, ATUALESTOQUE, RESERVA, STATUSNOTA, CODVEND, CODEXEC, " +
                                        "FATURAR, VLRREPRED, VLRDESCBONIF, PERCDESC) " +
                                        "VALUES (:NUNOTA, :SEQUENCIA, :CODEMP, :CODPROD, 0, ' ', :USOPROD, 0, :QTDNEG, 0, 0, 0, 0, 0, " +
                                        "0, 0, 0, 0, 0, 0, 0, 'S', :CODVOL, 0, 'N', 'A', 0, 0, 'N', 0, 0, 0)");

                        // Parâmetros da inserção
                        insertSql.setNamedParameter("NUNOTA", nunota);
                        insertSql.setNamedParameter("SEQUENCIA", BigDecimal.valueOf(sequencia));
                        insertSql.setNamedParameter("CODEMP", codEmp);
                        insertSql.setNamedParameter("CODPROD", codProd);
                        insertSql.setNamedParameter("USOPROD", usoProd);
                        insertSql.setNamedParameter("CODVOL", codVol);
                        insertSql.setNamedParameter("QTDNEG", qtdNeg);

                        insertSql.executeUpdate();
                        sequencia++; // Incrementa sequência para o próximo item
                    }
                }
                linhaNum++;
            }

            // Se houver produtos não encontrados, lança erro detalhado para o usuário
            if (!erros.isEmpty()) {
                StringBuilder msgErro = new StringBuilder("Identificamos que os seguintes produtos não possuem vínculo no Cadastro de Produtos. Por favor, revise ou atualize o cadastro conforme necessário.: \n").append(System.lineSeparator());
                for (String erro : erros) {
                    msgErro.append(erro).append(System.lineSeparator());
                }
                throw new Exception(msgErro.toString());
            }

        } finally {
            // Finaliza recursos e fecha sessão
            NativeSql.releaseResources(insertSql);
            JdbcWrapper.closeSession(jdbc);
            reader.close();
        }
    }

    /**
     * Realiza uma busca direta ao cadastro de produtos (TGFPRO), utilizando campos customizados.
     * Campos AD_PERFIL e AD_MATERIAL são campos adicionais personalizados.
     *
     * @return CODPROD correspondente, ou null se não encontrado.
     */
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
