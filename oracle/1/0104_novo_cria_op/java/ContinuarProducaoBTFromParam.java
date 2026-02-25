package br.com.triggerint.modulos.snk.acoes;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Versão do ContinuarProducaoBT para ser acionada a partir do componente HTML5 (JSP)
 * via JX.acionarBotao. Obtém o IDIPROC do parâmetro "IDIPROC" quando não há linha
 * selecionada (chamada remota). Mantém o mesmo comportamento de grid quando há linha.
 *
 * No Sankhya: cadastre um novo botão de ação Java apontando para esta classe e use
 * o ID desse botão no JSP (ex.: idBotao: 299). No JSP, parâmetro enviado: IDIPROC.
 *
 * Não altera o ContinuarProducaoBT.java original (grid/tela nativa).
 */
public class ContinuarProducaoBTFromParam implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.ContinuarProducaoBTFromParam - INICIO");

        BigDecimal idiproc = obterIdiproc(contexto);
        if (idiproc == null) {
            return;
        }

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return;
        }

        Timestamp dataHoraAtual = new Timestamp(new Date().getTime());

        QueryExecutor query = contexto.getQuery();
        try {
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect("SELECT IDIPROC, STATUSPROC, NROLOTE FROM TPRIPROC WHERE IDIPROC = {IDIPROC}");

            if (!query.next()) {
                contexto.mostraErro("Processo não encontrado. IDIPROC: " + idiproc);
                return;
            }

            String statusProc = query.getString("STATUSPROC");
            String nrolote = query.getString("NROLOTE");
            query.close();

            if (StringUtils.isEmpty(statusProc) ||
                    (statusProc.equals("C") || statusProc.equals("AP") || statusProc.equals("P"))) {
                contexto.mostraErro("Processo não está em status válido para continuar produção. Status atual: " + statusProc);
                return;
            }

            query = contexto.getQuery();
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect(
                    "SELECT EIATV.IDEIATV, EIATV.IDIATV, EIATV.CODEXEC, EIATV.TIPO " +
                            "FROM TPREIATV EIATV " +
                            "INNER JOIN TPRIATV IATV ON (IATV.IDIATV = EIATV.IDIATV) " +
                            "WHERE IATV.IDIPROC = {IDIPROC} " +
                            "AND EIATV.DHFINAL IS NULL " +
                            "AND EIATV.TIPO IN ('P', 'T', 'S') " +
                            "AND IATV.DHINICIO IS NOT NULL AND IATV.DHFINAL IS NULL " +
                            "ORDER BY EIATV.IDEIATV"
            );

            List<BigDecimal> listaIdeiatv = new ArrayList<>();
            List<BigDecimal> listaIdiatv = new ArrayList<>();
            while (query.next()) {
                listaIdeiatv.add(query.getBigDecimal("IDEIATV"));
                listaIdiatv.add(query.getBigDecimal("IDIATV"));
            }
            query.close();

            if (listaIdeiatv.isEmpty()) {
                contexto.mostraErro("Nenhuma parada em aberto encontrada para continuar no processo IDIPROC: " + idiproc + ". Verifique se há atividades em parada.");
                return;
            }

            int continuadas = 0;
            for (int i = 0; i < listaIdeiatv.size(); i++) {
                BigDecimal ideiatv = listaIdeiatv.get(i);
                BigDecimal idiatv = listaIdiatv.get(i);

                query = contexto.getQuery();
                query.setParam("DHFINAL", dataHoraAtual);
                query.setParam("IDEIATV", ideiatv);
                query.update("UPDATE TPREIATV SET DHFINAL = {DHFINAL} WHERE IDEIATV = {IDEIATV}");
                query.close();

                query = contexto.getQuery();
                query.nativeSelect("SELECT NVL(MAX(IDEIATV), 0) + 1 AS PROX_IDEIATV FROM TPREIATV");
                BigDecimal proxIdeiatv;
                if (query.next()) {
                    proxIdeiatv = query.getBigDecimal("PROX_IDEIATV");
                } else {
                    proxIdeiatv = BigDecimal.ONE;
                }
                query.close();

                query = contexto.getQuery();
                query.setParam("CODEXEC", codUsu);
                query.setParam("CODMTP", BigDecimal.ZERO);
                query.setParam("CODUSU", codUsu);
                query.setParam("DHINICIO", dataHoraAtual);
                query.setParam("IDEIATV", proxIdeiatv);
                query.setParam("IDIATV", idiatv);
                query.setParam("TIPO", "N");
                query.update(
                        "INSERT INTO TPREIATV (CODEXEC, CODMTP, CODUSU, DHFINAL, DHINICIO, IDEIATV, IDIATV, OBSERVACAO, TIPO) " +
                                "VALUES ({CODEXEC}, {CODMTP}, {CODUSU}, NULL, {DHINICIO}, {IDEIATV}, {IDIATV}, NULL, {TIPO})"
                );
                query.close();

                continuadas++;
            }

            StringBuilder mensagemSucesso = new StringBuilder();
            mensagemSucesso.append("Produção continuada com sucesso!\n\n");
            mensagemSucesso.append("Informações:\n");
            mensagemSucesso.append("• IDIPROC: ").append(idiproc).append("\n");
            mensagemSucesso.append("• Lote: ").append(StringUtils.isEmpty(nrolote) ? "N/A" : nrolote).append("\n");
            mensagemSucesso.append("• Atividades retomadas: ").append(continuadas).append("\n");
            mensagemSucesso.append("• Usuário: ").append(codUsu).append("\n");
            mensagemSucesso.append("• Data/Hora: ").append(dataHoraAtual);

            contexto.setMensagemRetorno(mensagemSucesso.toString());
            System.out.println("Produção continuada - IDIPROC: " + idiproc + ", Atividades retomadas: " + continuadas);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao continuar produção: " + e.getMessage());
            System.out.println("Erro ao continuar produção: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.ContinuarProducaoBTFromParam - FIM");
    }

    /**
     * Obtém IDIPROC: primeiro do parâmetro IDIPROC (chamada via JX.acionarBotao no HTML5),
     * depois da linha selecionada (comportamento em tela nativa).
     */
    private BigDecimal obterIdiproc(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("IDIPROC");
        if (param != null) {
            System.out.println("ContinuarProducaoBTFromParam - Parâmetro IDIPROC recebido (chamada do componente HTML5): " + param);
            if (param instanceof BigDecimal) {
                return (BigDecimal) param;
            }
            if (param instanceof Number) {
                return BigDecimal.valueOf(((Number) param).doubleValue());
            }
            if (param instanceof String) {
                String s = ((String) param).trim();
                if (s.isEmpty()) {
                    contexto.mostraErro("Parâmetro IDIPROC não pode ser vazio.");
                    return null;
                }
                try {
                    return new BigDecimal(s);
                } catch (NumberFormatException e) {
                    contexto.mostraErro("Parâmetro IDIPROC inválido: " + s);
                    return null;
                }
            }
            contexto.mostraErro("Parâmetro IDIPROC possui formato inválido.");
            return null;
        }

        Registro[] linhas = contexto.getLinhas();
        if (linhas != null && linhas.length == 1) {
            Object idiprocObj = linhas[0].getCampo("IDIPROC");
            if (idiprocObj != null) {
                if (idiprocObj instanceof BigDecimal) {
                    return (BigDecimal) idiprocObj;
                }
                if (idiprocObj instanceof Number) {
                    return BigDecimal.valueOf(((Number) idiprocObj).doubleValue());
                }
            }
        }

        contexto.mostraErro("Nenhum IDIPROC informado. No componente HTML5, clique no registro da guia Paradas; o IDIPROC será enviado automaticamente.");
        return null;
    }
}
