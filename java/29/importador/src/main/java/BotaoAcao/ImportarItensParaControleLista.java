// Pacote e imports
package BotaoAcao;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.util.*;

public class ImportarItensParaControleLista implements AcaoRotinaJava {

    private static final String SEPARADOR = ";";

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota = (BigDecimal) cabecalho.getCampo("NUNOTA");

        if (nunota == null) {
            contexto.setMensagemRetorno("Número da nota (NUNOTA) não encontrado.");
            return;
        }

        JdbcWrapper jdbc = null;
        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            // CORRIGIDO: passar nunota para buscar versão por nota
            BigDecimal versao = getProximaVersao(jdbc, nunota);

            processarItensNota(jdbc, nunota, contexto, versao);

            byte[] csvData = buscarCSVPorNota(jdbc, nunota);
            if (csvData != null) {
                processarCSVComAgrupamento(jdbc, csvData, nunota, contexto, versao);
            } else {
                System.out.println("Nenhum arquivo CSV encontrado para a nota: " + nunota);
            }

            atualizarStatusLista(jdbc, nunota);

            contexto.setMensagemRetorno("Importação concluída com sucesso. Versão: " + versao);
        } finally {
            JdbcWrapper.closeSession(jdbc);
        }
    }

    private void processarItensNota(JdbcWrapper jdbc, BigDecimal nunota, ContextoAcao contexto, BigDecimal versao) throws Exception {
        NativeSql query = null;
        ResultSet rs = null;

        try {
            query = new NativeSql(jdbc);
            query.appendSql(
                    "SELECT T.CODPROD, P.AD_PERFIL PERFIL, P.AD_MATERIAL MATERIAL, SUM(T.QTDENTREGUE) QTDENTREGUE, SUM(T.QTDNEG) PESO_TOTAL " +
                            "FROM TGFITE T " +
                            "JOIN TGFPRO P ON T.CODPROD = P.CODPROD " +
                            "WHERE T.NUNOTA = :NUNOTA " +
                            "GROUP BY T.CODPROD, P.AD_PERFIL, P.AD_MATERIAL"
            );
            query.setNamedParameter("NUNOTA", nunota);
            rs = query.executeQuery();

            BigDecimal usuarioLogado = contexto.getUsuarioLogado();

            while (rs.next()) {
                BigDecimal codigo = getProximoCodigo(jdbc);

                inserirControleLista(
                        jdbc,
                        codigo,
                        "tgfite",
                        rs.getBigDecimal("CODPROD"),
                        rs.getString("PERFIL"),
                        rs.getString("MATERIAL"),
                        nunota,
                        rs.getBigDecimal("PESO_TOTAL"),
                        rs.getBigDecimal("QTDENTREGUE"),
                        usuarioLogado,
                        versao
                );
            }
        } finally {
            if (rs != null) rs.close();
            NativeSql.releaseResources(query);
        }
    }

    private void processarCSVComAgrupamento(JdbcWrapper jdbc, byte[] csvData, BigDecimal nunota, ContextoAcao contexto, BigDecimal versao) throws Exception {
        Map<String, BigDecimal> agrupamento = new HashMap<>();
        List<String> erros = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new ByteArrayInputStream(csvData), StandardCharsets.UTF_8))) {
            String linha;
            int numeroLinha = 0;

            while ((linha = reader.readLine()) != null) {
                numeroLinha++;
                if (numeroLinha <= 2) continue;

                String[] colunas = linha.split(SEPARADOR);
                if (colunas.length < 5) {
                    erros.add("Linha " + numeroLinha + " inválida: menos de 5 colunas");
                    continue;
                }

                String perfil = colunas[0].trim();
                String material = colunas[1].trim();
                String chave = perfil + "|" + material;

                try {
                    String pesoFormatado = colunas[4].trim().replace("\"", "").replace(".", "").replace(",", ".");
                    BigDecimal peso = new BigDecimal(pesoFormatado);

                    agrupamento.merge(chave, peso, BigDecimal::add);
                } catch (NumberFormatException e) {
                    erros.add("Erro ao converter peso na linha " + numeroLinha + ": " + e.getMessage());
                }
            }
        }

        BigDecimal usuarioLogado = contexto.getUsuarioLogado();

        for (Map.Entry<String, BigDecimal> entrada : agrupamento.entrySet()) {
            String[] chave = entrada.getKey().split("\\|");
            String perfil = chave[0];
            String material = chave[1];
            BigDecimal pesoTotal = entrada.getValue();

            BigDecimal codProd = buscarCodigoProduto(jdbc, perfil, material);
            if (codProd == null) {
                erros.add("Produto não encontrado para perfil '" + perfil + "' e material '" + material + "'");
                continue;
            }

            BigDecimal codigo = getProximoCodigo(jdbc);

            inserirControleLista(
                    jdbc,
                    codigo,
                    "lista",
                    codProd,
                    perfil,
                    material,
                    nunota,
                    pesoTotal,
                    BigDecimal.ZERO,
                    usuarioLogado,
                    versao
            );
        }

        if (!erros.isEmpty()) {
            StringBuilder sb = new StringBuilder("Erros encontrados na importação CSV:\n");
            for (String erro : erros) {
                sb.append(erro).append("\n");
            }
            throw new Exception(sb.toString());
        }
    }

    private void inserirControleLista(JdbcWrapper jdbc,
                                      BigDecimal codigo,
                                      String tipoLista,
                                      BigDecimal codProd,
                                      String perfil,
                                      String material,
                                      BigDecimal nunota,
                                      BigDecimal pesoTotal,
                                      BigDecimal qtdEntregue,
                                      BigDecimal codUsu,
                                      BigDecimal versao) throws Exception {
        NativeSql insert = null;
        try {
            insert = new NativeSql(jdbc);
            insert.appendSql(
                    "INSERT INTO AD_CONTROLELISTA (CODIGO, DTATUAL, TP_LISTA, CODPROD, PERFIL, MATERIAL, NUNOTA, PESO_TOTAL, QTDENTREGUE, CODUSU, VERSAO) " +
                            "VALUES (:CODIGO, CURRENT_DATE, :TP_LISTA, :CODPROD, :PERFIL, :MATERIAL, :NUNOTA, :PESO_TOTAL, :QTDENTREGUE, :CODUSU, :VERSAO)"
            );
            insert.setNamedParameter("CODIGO", codigo);
            insert.setNamedParameter("TP_LISTA", tipoLista);
            insert.setNamedParameter("CODPROD", codProd);
            insert.setNamedParameter("PERFIL", perfil);
            insert.setNamedParameter("MATERIAL", material);
            insert.setNamedParameter("NUNOTA", nunota);
            insert.setNamedParameter("PESO_TOTAL", pesoTotal);
            insert.setNamedParameter("QTDENTREGUE", qtdEntregue);
            insert.setNamedParameter("CODUSU", codUsu);
            insert.setNamedParameter("VERSAO", versao);

            insert.executeUpdate();
        } finally {
            NativeSql.releaseResources(insert);
        }
    }

    private void atualizarStatusLista(JdbcWrapper jdbc, BigDecimal nunota) throws Exception {
        NativeSql update = null;
        try {
            update = new NativeSql(jdbc);
            update.appendSql("UPDATE tgfcab SET AD_STATUS_LISTA = 'LISTA SUBSTITUTA' WHERE nunota = :NUNOTA");
            update.setNamedParameter("NUNOTA", nunota);
            update.executeUpdate();
        } finally {
            NativeSql.releaseResources(update);
        }
    }

    // CORRIGIDO: Agora a versão é reiniciada por NUNOTA
    private BigDecimal getProximaVersao(JdbcWrapper jdbc, BigDecimal nunota) throws Exception {
        NativeSql query = null;
        ResultSet rs = null;
        BigDecimal proximaVersao = BigDecimal.ONE;

        try {
            query = new NativeSql(jdbc);
            query.appendSql("SELECT MAX(VERSAO) AS MAX_VERSAO FROM AD_CONTROLELISTA WHERE NUNOTA = :NUNOTA");
            query.setNamedParameter("NUNOTA", nunota);
            rs = query.executeQuery();

            if (rs.next() && rs.getBigDecimal("MAX_VERSAO") != null) {
                proximaVersao = rs.getBigDecimal("MAX_VERSAO").add(BigDecimal.ONE);
            }
        } finally {
            if (rs != null) rs.close();
            NativeSql.releaseResources(query);
        }

        return proximaVersao;
    }

    private BigDecimal buscarCodigoProduto(JdbcWrapper jdbc, String perfil, String material) throws Exception {
        NativeSql query = null;
        ResultSet rs = null;

        try {
            query = new NativeSql(jdbc);
            query.appendSql("SELECT CODPROD FROM TGFPRO WHERE AD_PERFIL = :PERFIL AND AD_MATERIAL = :MATERIAL");
            query.setNamedParameter("PERFIL", perfil);
            query.setNamedParameter("MATERIAL", material);
            rs = query.executeQuery();

            if (rs.next()) {
                return rs.getBigDecimal("CODPROD");
            }
        } finally {
            if (rs != null) rs.close();
            NativeSql.releaseResources(query);
        }
        return null;
    }

    private BigDecimal getProximoCodigo(JdbcWrapper jdbc) throws Exception {
        NativeSql query = null;
        ResultSet rs = null;
        BigDecimal proximo = BigDecimal.ONE;

        try {
            query = new NativeSql(jdbc);
            query.appendSql("SELECT MAX(CODIGO) AS MAX_CODIGO FROM AD_CONTROLELISTA");
            rs = query.executeQuery();

            if (rs.next() && rs.getBigDecimal("MAX_CODIGO") != null) {
                proximo = rs.getBigDecimal("MAX_CODIGO").add(BigDecimal.ONE);
            }
        } finally {
            if (rs != null) rs.close();
            NativeSql.releaseResources(query);
        }
        return proximo;
    }

    private byte[] buscarCSVPorNota(JdbcWrapper jdbc, BigDecimal nunota) throws Exception {
        NativeSql query = null;
        ResultSet rs = null;

        try {
            query = new NativeSql(jdbc);
            query.appendSql("SELECT CONTEUDO FROM TSIATA WHERE CODATA = :NUNOTA AND LOWER(DESCRICAO) = 'lista'");
            query.setNamedParameter("NUNOTA", nunota);
            rs = query.executeQuery();

            if (rs.next()) {
                return rs.getBytes("CONTEUDO");
            }
        } finally {
            if (rs != null) rs.close();
            NativeSql.releaseResources(query);
        }
        return null;
    }
}
