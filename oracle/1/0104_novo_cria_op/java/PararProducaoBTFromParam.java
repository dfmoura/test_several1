package br.com.triggerint.modulos.snk.acoes;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Botão de ação para parar produção de uma instância de processo (TPRIPROC).
 * Para cada atividade em execução (TPRIATV com DHINICIO preenchido e DHFINAL NULL,
 * sem parada P em aberto), fecha o registro de execução atual (TPREIATV TIPO 'N')
 * e insere novo registro de parada (TPREIATV TIPO 'P' com DHFINAL NULL).
 * Baseado no serviço OperacaoProducaoSP.pararInstanciaAtividades e logs em logs_parar_produção.
 *
 * Suporta execução via:
 * - Parâmetro IDIPROC quando acionado pelo componente HTML5 (JSP) via JX.acionarBotao.
 * - Linha selecionada na grid (comportamento em tela nativa).
 *
 * No Sankhya: cadastre um botão de ação Java apontando para esta classe e use
 * o ID desse botão no JSP (ex.: idBotao: 300). No JSP, parâmetro enviado: IDIPROC.
 */
public class PararProducaoBTFromParam implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.PararProducaoBTFromParam - INICIO");

        BigDecimal idiproc = obterIdiproc(contexto);
        if (idiproc == null) {
            return;
        }

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return;
        }

        String observacao = obterObservacao(contexto);

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
                contexto.mostraErro("Processo não está em status válido para parar produção. Status atual: " + statusProc);
                return;
            }

            // Atividades em execução (iniciadas, sem parada P em aberto): DHINICIO NOT NULL, DHFINAL NULL,
            // e não existe TPREIATV com TIPO='P' e DHFINAL IS NULL para esse IDIATV
            query = contexto.getQuery();
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect(
                    "SELECT IATV.IDIATV " +
                            "FROM TPRIATV IATV " +
                            "WHERE IATV.IDIPROC = {IDIPROC} " +
                            "AND IATV.DHINICIO IS NOT NULL AND IATV.DHFINAL IS NULL " +
                            "AND NOT EXISTS (" +
                            "  SELECT 1 FROM TPREIATV EIATV " +
                            "  WHERE EIATV.IDIATV = IATV.IDIATV AND EIATV.TIPO = 'P' AND EIATV.DHFINAL IS NULL" +
                            ") " +
                            "ORDER BY IATV.IDIATV"
            );

            List<BigDecimal> listaIdiatv = new ArrayList<>();
            while (query.next()) {
                listaIdiatv.add(query.getBigDecimal("IDIATV"));
            }
            query.close();

            if (listaIdiatv.isEmpty()) {
                contexto.mostraErro("Nenhuma atividade em execução encontrada para parar no processo IDIPROC: " + idiproc + ".");
                return;
            }

            int paradas = 0;
            for (BigDecimal idiatv : listaIdiatv) {
                // Registro de execução em andamento (TIPO 'N' com DHFINAL NULL) para esta atividade
                query = contexto.getQuery();
                query.setParam("IDIATV", idiatv);
                query.nativeSelect(
                        "SELECT EIATV.IDEIATV FROM TPREIATV EIATV " +
                                "WHERE EIATV.IDIATV = {IDIATV} AND EIATV.DHFINAL IS NULL AND EIATV.TIPO = 'N'"
                );

                if (!query.next()) {
                    query.close();
                    continue;
                }
                BigDecimal ideiatvFechar = query.getBigDecimal("IDEIATV");
                query.close();

                // 1) Fechar o registro de execução atual (N)
                query = contexto.getQuery();
                query.setParam("DHFINAL", dataHoraAtual);
                query.setParam("IDEIATV", ideiatvFechar);
                query.update("UPDATE TPREIATV SET DHFINAL = {DHFINAL} WHERE IDEIATV = {IDEIATV}");
                query.close();

                // 2) Próximo IDEIATV para o registro de parada
                query = contexto.getQuery();
                query.nativeSelect("SELECT NVL(MAX(IDEIATV), 0) + 1 AS PROX_IDEIATV FROM TPREIATV");
                BigDecimal proxIdeiatv = query.next() ? query.getBigDecimal("PROX_IDEIATV") : BigDecimal.ONE;
                query.close();

                // 3) Inserir registro de parada (TIPO 'P', DHFINAL NULL). CODMTP = 1 por padrão (conforme logs_parar_produção).
                query = contexto.getQuery();
                query.setParam("CODEXEC", codUsu);
                query.setParam("CODMTP", BigDecimal.ONE);
                query.setParam("CODUSU", codUsu);
                query.setParam("DHINICIO", dataHoraAtual);
                query.setParam("IDEIATV", proxIdeiatv);
                query.setParam("IDIATV", idiatv);
                query.setParam("OBSERVACAO", observacao != null ? observacao : "");
                query.setParam("TIPO", "P");
                query.update(
                        "INSERT INTO TPREIATV (CODEXEC, CODMTP, CODUSU, DHFINAL, DHINICIO, IDEIATV, IDIATV, OBSERVACAO, TIPO) " +
                                "VALUES ({CODEXEC}, {CODMTP}, {CODUSU}, NULL, {DHINICIO}, {IDEIATV}, {IDIATV}, {OBSERVACAO}, {TIPO})"
                );
                query.close();

                paradas++;
            }

            if (paradas == 0) {
                contexto.mostraErro(
                    "Nenhum registro de execução (TPREIATV TIPO 'N') encontrado para as atividades em andamento. "
                        + "Se a produção foi iniciada pela tela customizada, atualize o JAR do botão 'Iniciar produção' (IniciarProducaoBTFromParam) que agora grava esse registro. "
                        + "IDIPROC: " + idiproc + "."
                );
                return;
            }

            StringBuilder mensagemSucesso = new StringBuilder();
            mensagemSucesso.append("Produção parada com sucesso!\n\n");
            mensagemSucesso.append("Informações:\n");
            mensagemSucesso.append("• IDIPROC: ").append(idiproc).append("\n");
            mensagemSucesso.append("• Lote: ").append(StringUtils.isEmpty(nrolote) ? "N/A" : nrolote).append("\n");
            mensagemSucesso.append("• Atividades paradas: ").append(paradas).append("\n");
            mensagemSucesso.append("• Usuário: ").append(codUsu).append("\n");
            mensagemSucesso.append("• Data/Hora: ").append(dataHoraAtual);

            contexto.setMensagemRetorno(mensagemSucesso.toString());
            System.out.println("Produção parada - IDIPROC: " + idiproc + ", Atividades paradas: " + paradas);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao parar produção: " + e.getMessage());
            System.out.println("Erro ao parar produção: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.PararProducaoBTFromParam - FIM");
    }

    /**
     * Obtém IDIPROC: primeiro do parâmetro IDIPROC ou idiproc (chamada via JX.acionarBotao no HTML5),
     * depois da linha selecionada (comportamento em tela nativa).
     * Normaliza para BigDecimal com escala 0 (inteiro) para evitar falhas de binding no driver/QueryExecutor.
     */
    private BigDecimal obterIdiproc(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("IDIPROC");
        if (param == null) {
            param = contexto.getParam("idiproc");
        }
        if (param != null) {
            System.out.println("PararProducaoBTFromParam - Parâmetro IDIPROC recebido (chamada do componente HTML5): " + param);
            if (param instanceof String && ((String) param).trim().isEmpty()) {
                contexto.mostraErro("Parâmetro IDIPROC não pode ser vazio.");
                return null;
            }
            BigDecimal parsed = parseBigDecimalIdiproc(param);
            if (parsed != null) {
                return parsed;
            }
            contexto.mostraErro("Parâmetro IDIPROC inválido: " + param);
            return null;
        }

        Registro[] linhas = contexto.getLinhas();
        if (linhas != null && linhas.length == 1) {
            Object idiprocObj = linhas[0].getCampo("IDIPROC");
            if (idiprocObj != null) {
                BigDecimal parsed = parseBigDecimalIdiproc(idiprocObj);
                if (parsed != null) {
                    return parsed;
                }
            }
        }

        contexto.mostraErro("Nenhum IDIPROC informado. No componente HTML5, clique no registro da guia Iniciadas; o IDIPROC será enviado automaticamente.");
        return null;
    }

    /** Converte para BigDecimal com escala 0 (inteiro) para uso em SQL. Retorna null se inválido. */
    private BigDecimal parseBigDecimalIdiproc(Object param) {
        if (param instanceof BigDecimal) {
            return ((BigDecimal) param).setScale(0, RoundingMode.DOWN);
        }
        if (param instanceof Number) {
            return BigDecimal.valueOf(((Number) param).longValue());
        }
        if (param instanceof String) {
            String s = ((String) param).trim();
            if (s.isEmpty()) {
                return null;
            }
            try {
                return new BigDecimal(s).setScale(0, RoundingMode.DOWN);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Obtém a observação da parada a partir do parâmetro OBSERVACAO (chamada via JX.acionarBotao no HTML5).
     * Tenta "OBSERVACAO" e "observacao" por compatibilidade. Retorna null se não informado ou vazio.
     */
    private String obterObservacao(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("OBSERVACAO");
        if (param == null) {
            param = contexto.getParam("observacao");
        }
        if (param == null) {
            return null;
        }
        String s = param.toString().trim();
        return s.isEmpty() ? null : s;
    }
}
