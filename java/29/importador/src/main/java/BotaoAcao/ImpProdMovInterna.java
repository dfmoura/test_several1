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
import java.util.*;

public class ImpProdMovInterna implements AcaoRotinaJava {

    private static final String SEPARADOR = ";";

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("Início da importação.");

        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");

        // Verificação de existência de itens na TGFITE
        if (existeItemParaNota(nunota)) {
            if (temDivergenciaDash(nunota)) {
                contexto.setMensagemRetorno("Esta é uma lista substituta. Utilize a opção 'Importar Listas Substitutas para Comparação'.");
            } else {
                JdbcWrapper jdbc = null;
                NativeSql sql = null;
                NativeSql insertSql = null;
                NativeSql updateSql = null;
                NativeSql deleteSql = null;

                try {
                    jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
                    jdbc.openSession();

                    // 1. Capturar os dados da lista
                    sql = new NativeSql(jdbc);
                    sql.appendSql("SELECT NUNOTA, CODPROD, SUM(PESO_TOTAL) AS QTDNEG " +
                            "FROM AD_CONTROLELISTA " +
                            "WHERE NUNOTA = :NUNOTA AND VERSAO = (SELECT MAX(VERSAO) FROM AD_CONTROLELISTA WHERE NUNOTA = :NUNOTA) " +
                            "AND TP_LISTA = 'lista' " +
                            "GROUP BY NUNOTA, CODPROD");
                    sql.setNamedParameter("NUNOTA", nunota);

                    Map<BigDecimal, BigDecimal> listaProd = new HashMap<>();
                    ResultSet rsLista = sql.executeQuery();
                    while (rsLista.next()) {
                        listaProd.put(rsLista.getBigDecimal("CODPROD"), rsLista.getBigDecimal("QTDNEG"));
                    }
                    NativeSql.releaseResources(sql);

                    // 2. Buscar os produtos atuais da TGFITE
                    sql = new NativeSql(jdbc);
                    sql.appendSql("SELECT CODPROD FROM TGFITE WHERE NUNOTA = :NUNOTA");
                    sql.setNamedParameter("NUNOTA", nunota);

                    Set<BigDecimal> produtosTgfite = new HashSet<>();
                    ResultSet rsTgfite = sql.executeQuery();
                    while (rsTgfite.next()) {
                        produtosTgfite.add(rsTgfite.getBigDecimal("CODPROD"));
                    }
                    NativeSql.releaseResources(sql);

                    // 3. DELETE: Produtos na TGFITE mas não na lista
                    for (BigDecimal codProd : produtosTgfite) {
                        if (!listaProd.containsKey(codProd)) {
                            deleteSql = new NativeSql(jdbc);
                            deleteSql.appendSql("DELETE FROM TGFITE WHERE NUNOTA = :NUNOTA AND CODPROD = :CODPROD");
                            deleteSql.setNamedParameter("NUNOTA", nunota);
                            deleteSql.setNamedParameter("CODPROD", codProd);
                            deleteSql.executeUpdate();
                            NativeSql.releaseResources(deleteSql);
                        }
                    }

                    // 4. UPDATE e INSERT
                    // Verificar maior sequência existente
                    sql = new NativeSql(jdbc);
                    sql.appendSql("SELECT MAX(SEQUENCIA) AS SEQMAX FROM TGFITE WHERE NUNOTA = :NUNOTA");
                    sql.setNamedParameter("NUNOTA", nunota);
                    ResultSet rsSeq = sql.executeQuery();

                    int proximaSeq = 1;
                    if (rsSeq.next() && rsSeq.getBigDecimal("SEQMAX") != null) {
                        proximaSeq = rsSeq.getBigDecimal("SEQMAX").intValue() + 1;
                    }
                    NativeSql.releaseResources(sql);

                    // Recuperar CODEMP da nota
                    sql = new NativeSql(jdbc);
                    sql.appendSql("SELECT CODEMP FROM TGFCAB WHERE NUNOTA = :NUNOTA");
                    sql.setNamedParameter("NUNOTA", nunota);
                    ResultSet rsCab = sql.executeQuery();
                    BigDecimal codEmp = null;
                    if (rsCab.next()) {
                        codEmp = rsCab.getBigDecimal("CODEMP");
                    }
                    NativeSql.releaseResources(sql);

                    for (Map.Entry<BigDecimal, BigDecimal> entry : listaProd.entrySet()) {
                        BigDecimal codProd = entry.getKey();
                        BigDecimal qtdNeg = entry.getValue();

                        if (produtosTgfite.contains(codProd)) {
                            // UPDATE
                            updateSql = new NativeSql(jdbc);
                            updateSql.appendSql("UPDATE TGFITE SET QTDNEG = :QTDNEG WHERE NUNOTA = :NUNOTA AND CODPROD = :CODPROD");
                            updateSql.setNamedParameter("QTDNEG", qtdNeg);
                            updateSql.setNamedParameter("NUNOTA", nunota);
                            updateSql.setNamedParameter("CODPROD", codProd);
                            updateSql.executeUpdate();
                            NativeSql.releaseResources(updateSql);
                        } else {
                            // INSERT - Buscar dados complementares do produto
                            sql = new NativeSql(jdbc);
                            sql.appendSql("SELECT USOPROD, CODVOL, USALOCAL, CODLOCALPADRAO FROM TGFPRO WHERE CODPROD = :CODPROD");
                            sql.setNamedParameter("CODPROD", codProd);
                            ResultSet rsProd = sql.executeQuery();

                            String usoProd = " ";
                            String codVol = "UN";
                            String usalocal = "N";
                            BigDecimal codlocalorig = BigDecimal.ZERO;
                            if (rsProd.next()) {
                                usoProd = rsProd.getString("USOPROD");
                                codVol = rsProd.getString("CODVOL");
                                usalocal = rsProd.getString("USALOCAL");
                                if ("S".equals(usalocal)) {
                                    BigDecimal codlocalpadrao = rsProd.getBigDecimal("CODLOCALPADRAO");
                                    codlocalorig = codlocalpadrao != null ? codlocalpadrao : BigDecimal.ZERO;
                                }
                            }
                            NativeSql.releaseResources(sql);

                            insertSql = new NativeSql(jdbc);
                            insertSql.appendSql(
                                    "INSERT INTO TGFITE (NUNOTA, SEQUENCIA, CODEMP, CODPROD, CODLOCALORIG, CONTROLE, USOPROD, CODCFO, " +
                                            "QTDNEG, QTDENTREGUE, QTDCONFERIDA, VLRUNIT, VLRTOT, VLRCUS, BASEIPI, VLRIPI, BASEICMS, VLRICMS, " +
                                            "VLRDESC, BASESUBSTIT, VLRSUBST, PENDENTE, CODVOL, ATUALESTOQUE, RESERVA, STATUSNOTA, CODVEND, CODEXEC, " +
                                            "FATURAR, VLRREPRED, VLRDESCBONIF, PERCDESC) " +
                                            "VALUES (:NUNOTA, :SEQUENCIA, :CODEMP, :CODPROD, :CODLOCALORIG, ' ', :USOPROD, 0, :QTDNEG, 0, 0, 0, 0, 0, " +
                                            "0, 0, 0, 0, 0, 0, 0, 'S', :CODVOL, 0, 'N', 'A', 0, 0, 'N', 0, 0, 0)");

                            insertSql.setNamedParameter("NUNOTA", nunota);
                            insertSql.setNamedParameter("SEQUENCIA", BigDecimal.valueOf(proximaSeq++));
                            insertSql.setNamedParameter("CODEMP", codEmp);
                            insertSql.setNamedParameter("CODPROD", codProd);
                            insertSql.setNamedParameter("CODLOCALORIG", codlocalorig);
                            insertSql.setNamedParameter("USOPROD", usoProd);
                            insertSql.setNamedParameter("CODVOL", codVol);
                            insertSql.setNamedParameter("QTDNEG", qtdNeg);
                            insertSql.executeUpdate();
                            NativeSql.releaseResources(insertSql);
                        }
                    }

                    contexto.setMensagemRetorno("Fluxo finalizado com sucesso: inserções, atualizações e exclusões processadas.");

                } finally {
                    NativeSql.releaseResources(sql);
                    JdbcWrapper.closeSession(jdbc);
                }
            }

            return;
        }

        byte[] blobData = getBlobFromTSIATA(nunota);
        if (blobData == null) {
            contexto.setMensagemRetorno("Arquivo não encontrado. Certifique-se de anexar o arquivo com nome 'lista'.");
            return;
        }

        try {
            processarCSV(blobData, nunota);
            contexto.setMensagemRetorno("Importação concluída com sucesso.");
        } catch (Exception e) {
            contexto.setMensagemRetorno("Erro ao processar arquivo: " + e.getMessage());
            throw e;
        }
    }

    private boolean existeItemParaNota(BigDecimal nunota) throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql sql = null;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT 1 FROM TGFITE WHERE NUNOTA = :NUNOTA");
            sql.setNamedParameter("NUNOTA", nunota);
            ResultSet rs = sql.executeQuery();

            return rs.next();

        } finally {
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }
    }

    private boolean temDivergenciaDash(BigDecimal nunota) throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        boolean temProblema = false;

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();
            sql = new NativeSql(jdbc);

            sql.appendSql(
                    "WITH BASE_AGREGADA AS ( " +
                            "    SELECT NUNOTA, VERSAO, CODPROD, PERFIL, MATERIAL, " +
                            "           SUM(CASE WHEN TP_LISTA = 'tgfite' THEN PESO_TOTAL END) AS PESO_TOTAL_ITE, " +
                            "           SUM(CASE WHEN TP_LISTA = 'lista' THEN PESO_TOTAL END) AS PESO_TOTAL_LIS, " +
                            "           SUM(CASE WHEN TP_LISTA = 'tgfite' THEN QTDENTREGUE END) AS QTDENTREGUE, " +
                            "           COUNT(CASE WHEN TP_LISTA = 'tgfite' THEN 1 END) AS CNT_ITE, " +
                            "           COUNT(CASE WHEN TP_LISTA = 'lista' THEN 1 END) AS CNT_LIS " +
                            "    FROM AD_CONTROLELISTA " +
                            "    WHERE NUNOTA = :NUNOTA " +
                            "    GROUP BY NUNOTA, VERSAO, CODPROD, PERFIL, MATERIAL " +
                            "), " +
                            "VERSAO_MAXIMA AS ( " +
                            "    SELECT MAX(VERSAO) AS MAX_VERSAO " +
                            "    FROM AD_CONTROLELISTA " +
                            "    WHERE NUNOTA = :NUNOTA " +
                            "), " +
                            "DADOS_VALIDACAO AS ( " +
                            "    SELECT A.*, " +
                            "           CASE WHEN QTDENTREGUE > PESO_TOTAL_LIS THEN 0 ELSE 1 END AS VALIDACAO_1, " +
                            "           CASE WHEN CNT_ITE > 0 AND CNT_LIS = 0 AND QTDENTREGUE > 0 THEN 0 ELSE 1 END AS VALIDACAO_2 " +
                            "    FROM BASE_AGREGADA A " +
                            "    JOIN VERSAO_MAXIMA V ON A.VERSAO = V.MAX_VERSAO " +
                            ") " +
                            "SELECT MAX(VERSAO)VERSAO,COUNT(CASE WHEN VALIDACAO_1 = 0 OR VALIDACAO_2 = 0 THEN 1 END) AS PROBLEMA " +
                            "FROM DADOS_VALIDACAO");

            sql.setNamedParameter("NUNOTA", nunota);
            ResultSet rs = sql.executeQuery();

            if (rs.next()) {
                BigDecimal versaoImportacao = rs.getBigDecimal("VERSAO");
                BigDecimal problemas = rs.getBigDecimal("PROBLEMA");
                temProblema = problemas != null && problemas.compareTo(BigDecimal.ZERO) > 0;
            }

        } finally {
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
        }

        return temProblema;
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

    private void processarCSV(byte[] blobData, BigDecimal nunota) throws Exception {
        InputStream inputStream = new ByteArrayInputStream(blobData);
        BufferedReader reader = null;

        try {
            // Tentar UTF-8 primeiro
            reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
        } catch (Exception e) {
            // Se UTF-8 falhar, tentar ISO-8859-1
            inputStream = new ByteArrayInputStream(blobData);
            reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.ISO_8859_1));
        }

        Map<String, BigDecimal> agrupamento = new LinkedHashMap<>();
        List<String[]> linhasOriginais = new ArrayList<>();

        String linha;
        int linhaNum = 0;

        while ((linha = reader.readLine()) != null) {
            linhaNum++;

            if (linhaNum <= 2) continue;

            // Remover BOM se existir
            linha = linha.replace("\uFEFF", "").trim();
            if (linha.isEmpty()) continue;

            String[] colunas;
            try {
                colunas = linha.split(SEPARADOR, -1); // -1 para manter valores vazios
            } catch (Exception e) {
                throw new Exception("Erro ao dividir linha " + linhaNum + " usando separador '" + SEPARADOR + "'");
            }

            if (colunas.length < 5) {
                throw new Exception("Linha " + linhaNum + " não possui colunas suficientes. Esperado pelo menos 5 colunas.");
            }

            String perfil = colunas[0].trim();
            String material = colunas[1].trim();
            String chave = perfil + "##" + material;

            String pesoTotalStr = colunas[4].trim()
                    .replace("\"", "")
                    .replace(".", "")
                    .replace(",", ".")
                    .replaceAll("[^0-9.]", ""); // Remove caracteres não numéricos exceto ponto

            if (pesoTotalStr.isEmpty()) {
                throw new Exception("Valor de peso vazio na linha " + linhaNum);
            }

            BigDecimal peso;
            try {
                peso = new BigDecimal(pesoTotalStr);
            } catch (NumberFormatException e) {
                throw new Exception("Erro ao converter valor '" + pesoTotalStr + "' na linha " + linhaNum + ": " + e.getMessage());
            }

            agrupamento.merge(chave, peso, BigDecimal::add);
        }
        reader.close();

        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        NativeSql insertSql = null;
        NativeSql updateSql = null;
        List<String> erros = new ArrayList<>();

        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            sql = new NativeSql(jdbc);
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

            for (Map.Entry<String, BigDecimal> entry : agrupamento.entrySet()) {
                String[] chavePartes = entry.getKey().split("##");
                String perfil = chavePartes[0];
                String material = chavePartes[1];
                BigDecimal qtdNeg = entry.getValue();

                BigDecimal codProd = buscarCodProd(jdbc, perfil, material);
                if (codProd == null) {
                    erros.add("Produto não encontrado: " + perfil + " - " + material);
                    continue;
                }

                sql = new NativeSql(jdbc);
                sql.appendSql("SELECT USOPROD, CODVOL, USALOCAL, CODLOCALPADRAO FROM TGFPRO WHERE CODPROD = :CODPROD");
                sql.setNamedParameter("CODPROD", codProd);
                ResultSet rsAux = sql.executeQuery();

                String usoProd = " ";
                String codVol = "UN";
                String usalocal = "N";
                BigDecimal codlocalorig = BigDecimal.ZERO;
                if (rsAux.next()) {
                    usoProd = rsAux.getString("USOPROD");
                    codVol = rsAux.getString("CODVOL");
                    usalocal = rsAux.getString("USALOCAL");
                    if ("S".equals(usalocal)) {
                        BigDecimal codlocalpadrao = rsAux.getBigDecimal("CODLOCALPADRAO");
                        codlocalorig = codlocalpadrao != null ? codlocalpadrao : BigDecimal.ZERO;
                    }
                }
                NativeSql.releaseResources(sql);

                insertSql = new NativeSql(jdbc);
                insertSql.appendSql(
                        "INSERT INTO TGFITE (NUNOTA, SEQUENCIA, CODEMP, CODPROD, CODLOCALORIG, CONTROLE, USOPROD, CODCFO, " +
                                "QTDNEG, QTDENTREGUE, QTDCONFERIDA, VLRUNIT, VLRTOT, VLRCUS, BASEIPI, VLRIPI, BASEICMS, VLRICMS, " +
                                "VLRDESC, BASESUBSTIT, VLRSUBST, PENDENTE, CODVOL, ATUALESTOQUE, RESERVA, STATUSNOTA, CODVEND, CODEXEC, " +
                                "FATURAR, VLRREPRED, VLRDESCBONIF, PERCDESC) " +
                                "VALUES (:NUNOTA, :SEQUENCIA, :CODEMP, :CODPROD, :CODLOCALORIG, ' ', :USOPROD, 0, :QTDNEG, 0, 0, 0, 0, 0, " +
                                "0, 0, 0, 0, 0, 0, 0, 'S', :CODVOL, 0, 'N', 'A', 0, 0, 'N', 0, 0, 0)");

                insertSql.setNamedParameter("NUNOTA", nunota);
                insertSql.setNamedParameter("SEQUENCIA", BigDecimal.valueOf(sequencia));
                insertSql.setNamedParameter("CODEMP", codEmp);
                insertSql.setNamedParameter("CODPROD", codProd);
                insertSql.setNamedParameter("CODLOCALORIG", codlocalorig);
                insertSql.setNamedParameter("USOPROD", usoProd);
                insertSql.setNamedParameter("CODVOL", codVol);
                insertSql.setNamedParameter("QTDNEG", qtdNeg);

                insertSql.executeUpdate();
                sequencia++;
            }

            updateSql = new NativeSql(jdbc);
            updateSql.appendSql("UPDATE TGFCAB SET AD_STATUS_LISTA = 'LISTA INICIAL' WHERE NUNOTA = :NUNOTA");
            updateSql.setNamedParameter("NUNOTA", nunota);
            updateSql.executeUpdate();

            if (!erros.isEmpty()) {
                StringBuilder erroMsg = new StringBuilder("Produtos não encontrados no cadastro:\n");
                for (String erro : erros) erroMsg.append(erro).append("\n");
                throw new Exception(erroMsg.toString());
            }

        } finally {
            NativeSql.releaseResources(insertSql);
            NativeSql.releaseResources(updateSql);
            JdbcWrapper.closeSession(jdbc);
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