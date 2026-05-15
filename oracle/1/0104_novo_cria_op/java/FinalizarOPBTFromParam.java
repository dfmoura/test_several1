package br.com.triggerint.modulos.snk.acoes;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.mgeprod.model.helper.OperacaoProducaoHelper;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;

/**
 * Botão de ação Java para finalizar atividades em aberto da OP (instâncias de atividade),
 * no mesmo caminho do serviço nativo {@code OperacaoProducaoSP.finalizarInstanciaAtividades}:
 * {@link OperacaoProducaoHelper#finalizarInstanciaAtividades(java.util.ArrayList, boolean, JdbcWrapper, java.sql.Timestamp)}.
 * <p>
 * Fluxo observado nos logs em {@code logs_finalizar} (ex.: {@code server.log}, {@code Monitor_Consulta.log}):
 * HTTP/SanWS → {@code OperacaoProducaoSPBean#finalizarInstanciaAtividades} → {@code JapeSession.open} / JDBC →
 * {@code OperacaoProducaoHelper#finalizarInstanciaAtividades} → {@code finalizarInstanciaAtividade} /
 * {@code finalizarExecucaoInsanciaAtividade} e engine Activiti ({@code completeTask}).
 * <p>
 * Parâmetros suportados (alinhado ao {@code JX.acionarBotao} no {@code prod82.jsp}):
 * <ul>
 *   <li>{@code IDIPROC} ou {@code idiproc} — obrigatório quando não há linha na grid.</li>
 *   <li>{@code CONFIRMAR_APONT_DIVERGENTES} ou {@code confirmarApontamentosDivergentes} — opcional,
 *       {@code true}/{@code S}/{@code 1} espelha o atributo XML {@code confirmarApontamentosDivergentes} do serviço nativo
 *       (ignorar apontamentos divergentes na finalização).</li>
 *   <li>{@code IGNORA_VALIDACAO_FORMULARIO} ou {@code ignoraValidacaoFormulario} — opcional; se {@code true}/{@code S},
 *       não chama {@code validaObrigatoriedadeFormularioAtividade} (espelha {@code ignoraValidacaoFormulario} do XML nativo).</li>
 * </ul>
 * <p>
 * Os {@code IDIATV} enviados ao helper são todos de {@code TPRIATV} com {@code DHFINAL IS NULL} para o processo,
 * equivalente ao critério {@code InstanciaAtividade} usado em {@code ControleProcessoHelper} nos trechos de execução.
 * <p>
 * Erro "null" na tela costuma vir de {@code e.getMessage()} nulo em exceções encapsuladas ({@code MGEModelException}
 * com texto "Sem mensagem de erro" enquanto a causa real está em {@code InvocationTargetException} /
 * {@code ActivitiException}). Este botão usa {@link #mensagemAmigavel(Throwable)} para exibir a mensagem da causa.
 */
public class FinalizarOPBTFromParam implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.FinalizarOPBTFromParam - INICIO");

        final BigDecimal idiproc = obterIdiproc(contexto);
        if (idiproc == null) {
            contexto.mostraErro(
                "Nenhum IDIPROC informado. No componente HTML5, envie IDIPROC no JX.acionarBotao ou selecione uma linha com IDIPROC."
            );
            return;
        }

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return;
        }

        final boolean ignorarApontamentosDivergentes = obterIgnorarApontamentosDivergentes(contexto);
        final boolean ignoraValidacaoFormulario = obterIgnoraValidacaoFormulario(contexto);

        ArrayList<BigDecimal> idiatvs = new ArrayList<>();
        QueryExecutor query = contexto.getQuery();
        try {
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect(
                "SELECT IATV.IDIATV FROM TPRIATV IATV "
                    + "WHERE IATV.IDIPROC = {IDIPROC} AND IATV.DHFINAL IS NULL "
                    + "ORDER BY IATV.IDIATV"
            );
            while (query.next()) {
                idiatvs.add(query.getBigDecimal("IDIATV"));
            }
        } finally {
            query.close();
        }

        if (idiatvs.isEmpty()) {
            contexto.mostraErro("Nenhuma instância de atividade em aberto (DHFINAL nulo) para o IDIPROC: " + idiproc + ".");
            return;
        }

        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;
        try {
            hnd = JapeSession.open();
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbc.openSession();

            JapeSession.putProperty("br.com.sankhya.mgeprod.apontamento.user", codUsu);

            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();
            helper.setCodUserExecutante(codUsu);

            if (!ignoraValidacaoFormulario) {
                EntityFacade dwf = EntityFacadeFactory.getDWFFacade();
                DynamicVO cab = (DynamicVO) dwf.findEntityByPrimaryKeyAsVO("CabecalhoInstanciaProcesso", idiproc);
                BigDecimal idProc = idSemDecimais(cab.asBigDecimal("IDPROC"));
                for (BigDecimal idiatv : idiatvs) {
                    QueryExecutor qAtv = contexto.getQuery();
                    try {
                        qAtv.setParam("IDIATV", idiatv);
                        qAtv.nativeSelect("SELECT IDEFX FROM TPRIATV WHERE IDIATV = {IDIATV}");
                        if (!qAtv.next()) {
                            continue;
                        }
                        BigDecimal idEfx = idSemDecimais(qAtv.getBigDecimal("IDEFX"));
                        OperacaoProducaoHelper.getInstance()
                            .validaObrigatoriedadeFormularioAtividade(idiproc, idProc, idEfx, jdbc);
                    } finally {
                        qAtv.close();
                    }
                }
            }

            helper.finalizarInstanciaAtividades(idiatvs, ignorarApontamentosDivergentes, jdbc, null);

            StringBuilder msg = new StringBuilder();
            msg.append("Atividades finalizadas com sucesso (fluxo nativo OperacaoProducaoHelper).\n\n");
            msg.append("• IDIPROC: ").append(idiproc).append("\n");
            msg.append("• Quantidade de instâncias (IDIATV): ").append(idiatvs.size()).append("\n");
            msg.append("• Usuário executante: ").append(codUsu).append("\n");
            if (ignorarApontamentosDivergentes) {
                msg.append("• Apontamentos divergentes: confirmação ativa (confirmar apontamentos divergentes).\n");
            }
            if (ignoraValidacaoFormulario) {
                msg.append("• Validação de formulário da atividade foi ignorada (parâmetro).\n");
            }
            contexto.setMensagemRetorno(msg.toString());
            System.out.println("FinalizarOPBTFromParam - OK IDIPROC=" + idiproc + " idiatvs=" + idiatvs.size());
        } catch (Exception e) {
            String detalhe = mensagemAmigavel(e);
            contexto.mostraErro("Erro ao finalizar OP: " + detalhe);
            System.err.println("FinalizarOPBTFromParam - falha IDIPROC=" + idiproc + " : " + detalhe);
            e.printStackTrace();
            throw e;
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.FinalizarOPBTFromParam - FIM");
    }

    private static boolean obterIgnoraValidacaoFormulario(ContextoAcao contexto) throws Exception {
        Object p = contexto.getParam("IGNORA_VALIDACAO_FORMULARIO");
        if (p == null) {
            p = contexto.getParam("ignoraValidacaoFormulario");
        }
        if (p == null) {
            return false;
        }
        if (p instanceof Boolean) {
            return (Boolean) p;
        }
        String s = p.toString().trim();
        return "true".equalsIgnoreCase(s) || "S".equalsIgnoreCase(s) || "1".equals(s) || "sim".equalsIgnoreCase(s);
    }

    private static boolean obterIgnorarApontamentosDivergentes(ContextoAcao contexto) throws Exception {
        Object p = contexto.getParam("CONFIRMAR_APONT_DIVERGENTES");
        if (p == null) {
            p = contexto.getParam("confirmarApontamentosDivergentes");
        }
        if (p == null) {
            return false;
        }
        if (p instanceof Boolean) {
            return (Boolean) p;
        }
        String s = p.toString().trim();
        if (s.isEmpty()) {
            return false;
        }
        return "true".equalsIgnoreCase(s) || "S".equalsIgnoreCase(s) || "1".equals(s) || "sim".equalsIgnoreCase(s);
    }

    private static BigDecimal obterIdiproc(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("IDIPROC");
        if (param == null) {
            param = contexto.getParam("idiproc");
        }
        if (param != null) {
            BigDecimal v = toBigDecimal(param);
            if (v != null && v.compareTo(BigDecimal.ZERO) > 0) {
                return idSemDecimais(v);
            }
        }
        Registro[] linhas = contexto.getLinhas();
        if (linhas != null && linhas.length >= 1) {
            Object v = linhas[0].getCampo("IDIPROC");
            if (v != null) {
                BigDecimal b = toBigDecimal(v);
                if (b != null && b.compareTo(BigDecimal.ZERO) > 0) {
                    return idSemDecimais(b);
                }
            }
        }
        return null;
    }

    private static BigDecimal idSemDecimais(BigDecimal v) {
        if (v == null) {
            return null;
        }
        return v.setScale(0, RoundingMode.DOWN);
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Long || value instanceof Integer || value instanceof Short || value instanceof Byte) {
            return BigDecimal.valueOf(((Number) value).longValue());
        }
        if (value instanceof Number) {
            return new BigDecimal(value.toString());
        }
        if (value instanceof String) {
            String s = ((String) value).trim();
            if (s.isEmpty()) {
                return null;
            }
            try {
                return new BigDecimal(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Percorre a cadeia de causas (incl. {@link java.lang.reflect.InvocationTargetException#getTargetException()})
     * para obter texto útil; evita exibir "null" quando {@code getMessage()} vem vazio na exceção superficial.
     */
    static String mensagemAmigavel(Throwable t) {
        if (t == null) {
            return "erro desconhecido";
        }
        Throwable c = t;
        int depth = 0;
        while (c != null && depth++ < 25) {
            if (c instanceof java.lang.reflect.InvocationTargetException) {
                java.lang.reflect.InvocationTargetException ite = (java.lang.reflect.InvocationTargetException) c;
                Throwable tgt = ite.getTargetException();
                if (tgt != null) {
                    String m = tgt.getMessage();
                    if (m != null && !m.trim().isEmpty()) {
                        return m.trim();
                    }
                    c = tgt;
                    continue;
                }
            }
            String m = c.getMessage();
            if (m != null && !m.trim().isEmpty()) {
                String trimmed = m.trim();
                if (!"Sem mensagem de erro".equals(trimmed)) {
                    return trimmed;
                }
            }
            c = c.getCause();
        }
        return t.getClass().getName();
    }
}
