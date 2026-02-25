package main.java.br.com.triggerint;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Botão de ação para continuar produção de uma instância de processo (TPRIPROC).
 * Fecha paradas em aberto (TPREIATV com DHFINAL IS NULL e TIPO em P/T/S) e insere
 * novo registro de execução (TIPO 'N') para retomar a atividade.
 * Baseado no serviço OperacaoProducaoSP.continuarInstanciaAtividades e logs em Logs_continuar_producao.
 *
 * Suporta execução via:
 * - Linha selecionada na tabela (comportamento padrão)
 * - Parâmetro IDIPROC quando acionado remotamente via JX.acionarBotao (tipo JAVA, idBotao 298)
 */
public class ContinuarProducaoBT implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.ContinuarProducaoBT - INICIO");

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
            // Validar processo e obter NROLOTE
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect("SELECT IDIPROC, STATUSPROC, NROLOTE FROM TPRIPROC WHERE IDIPROC = {IDIPROC}");

            if (!query.next()) {
                contexto.mostraErro("Processo não encontrado. IDIPROC: " + idiproc);
                return;
            }

            String statusProc = query.getString("STATUSPROC");
            String nrolote = query.getString("NROLOTE");
            query.close();

            // Status válidos para continuar: processo em andamento (não concluído/cancelado)
            if (StringUtils.isEmpty(statusProc) ||
                (statusProc.equals("C") || statusProc.equals("AP") || statusProc.equals("P"))) {
                contexto.mostraErro("Processo não está em status válido para continuar produção. Status atual: " + statusProc);
                return;
            }

            // Buscar paradas em aberto do processo: TPREIATV com DHFINAL IS NULL e TIPO em ('P','T','S')
            // para atividades (TPRIATV) deste IDIPROC que tenham DHINICIO preenchido e DHFINAL NULL
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

                // 1) Fechar a parada: UPDATE TPREIATV SET DHFINAL = ? WHERE IDEIATV = ?
                query = contexto.getQuery();
                query.setParam("DHFINAL", dataHoraAtual);
                query.setParam("IDEIATV", ideiatv);
                query.update("UPDATE TPREIATV SET DHFINAL = {DHFINAL} WHERE IDEIATV = {IDEIATV}");
                query.close();

                // 2) Obter próximo IDEIATV para o novo registro de execução (continuação)
                query = contexto.getQuery();
                query.nativeSelect("SELECT NVL(MAX(IDEIATV), 0) + 1 AS PROX_IDEIATV FROM TPREIATV");
                BigDecimal proxIdeiatv;
                if (query.next()) {
                    proxIdeiatv = query.getBigDecimal("PROX_IDEIATV");
                } else {
                    proxIdeiatv = BigDecimal.ONE;
                }
                query.close();

                // 3) Inserir novo registro em TPREIATV (retomada - TIPO 'N')
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

        System.out.println("br.com.triggerint.ContinuarProducaoBT - FIM");
    }

    /**
     * Obtém IDIPROC do parâmetro (quando acionado via JX.acionarBotao) ou do registro selecionado (grid).
     * Parâmetro esperado pelo JX: IDIPROC (nome exato usado no acionarBotao).
     */
    private BigDecimal obterIdiproc(ContextoAcao contexto) throws Exception {
        // 1) Chamada via JX.acionarBotao: parâmetro IDIPROC
        Object paramIdiproc = contexto.getParam("IDIPROC");
        if (paramIdiproc != null) {
            System.out.println("ContinuarProducaoBT - Parâmetro IDIPROC recebido (chamada remota): " + paramIdiproc);
            if (paramIdiproc instanceof BigDecimal) {
                return (BigDecimal) paramIdiproc;
            }
            if (paramIdiproc instanceof Number) {
                return BigDecimal.valueOf(((Number) paramIdiproc).doubleValue());
            }
            if (paramIdiproc instanceof String) {
                String s = (String) paramIdiproc;
                if (StringUtils.isEmpty(s)) {
                    contexto.mostraErro("Parâmetro IDIPROC não pode ser vazio.");
                    return null;
                }
                try {
                    return BigDecimalUtil.valueOf(s);
                } catch (Exception e) {
                    contexto.mostraErro("Parâmetro IDIPROC inválido: " + s);
                    return null;
                }
            }
            contexto.mostraErro("Parâmetro IDIPROC possui formato inválido.");
            return null;
        }

        // 2) Comportamento padrão: linha selecionada na grid
        Registro[] linhas = contexto.getLinhas();
        if (linhas.length == 0) {
            contexto.mostraErro("Nenhum registro selecionado e parâmetro IDIPROC não informado. Selecione uma OP na guia Paradas ou informe o parâmetro IDIPROC.");
            return null;
        }
        if (linhas.length > 1) {
            contexto.mostraErro("Apenas um registro deve ser selecionado. Registros selecionados: " + linhas.length);
            return null;
        }

        Registro registroSelecionado = linhas[0];
        Object idiprocObj = registroSelecionado.getCampo("IDIPROC");
        if (idiprocObj == null) {
            contexto.mostraErro("Campo IDIPROC não encontrado ou vazio no registro selecionado.");
            return null;
        }

        if (idiprocObj instanceof BigDecimal) {
            return (BigDecimal) idiprocObj;
        }
        if (idiprocObj instanceof Number) {
            return BigDecimal.valueOf(((Number) idiprocObj).doubleValue());
        }
        contexto.mostraErro("Campo IDIPROC possui formato inválido.");
        return null;
    }
}
