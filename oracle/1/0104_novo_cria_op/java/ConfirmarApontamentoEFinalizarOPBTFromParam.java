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
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;

/**
 * Botão de ação Java que executa em sequência o fluxo de
 * {@link ConfirmarApontamentoBTFromParam} e em seguida o de {@link FinalizarOPBTFromParam}:
 * confirma o apontamento (TPRAPO/TPRAPA) e finaliza as instâncias de atividade em aberto da OP.
 * <p>
 * Parâmetros:
 * <ul>
 *   <li>{@code NUAPO} ou {@code nuapo} — obrigatório (ou linha da grid com NUAPO), igual ao confirmador.</li>
 *   <li>{@code IDIPROC} ou {@code idiproc} — obrigatório para a finalização se não puder ser deduzido;
 *       se omitido, é obtido por {@code TPRAPO → TPRIATV} a partir do {@code NUAPO} informado.</li>
 *   <li>{@code CONFIRMAR_APONT_DIVERGENTES} / {@code confirmarApontamentosDivergentes} — opcional (finalização).</li>
 *   <li>{@code IGNORA_VALIDACAO_FORMULARIO} / {@code ignoraValidacaoFormulario} — opcional (finalização).</li>
 * </ul>
 */
public class ConfirmarApontamentoEFinalizarOPBTFromParam implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.ConfirmarApontamentoEFinalizarOPBTFromParam - INICIO");

        BigDecimal nuapo = obterNuapo(contexto);
        if (nuapo == null) {
            return;
        }

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return;
        }

        // --- Trecho equivalente a ConfirmarApontamentoBTFromParam#doAction ---
        QueryExecutor query = contexto.getQuery();
        try {
            query.setParam("NUAPO", nuapo);
            query.nativeSelect("SELECT NUAPO, SITUACAO FROM TPRAPO WHERE NUAPO = {NUAPO}");

            if (!query.next()) {
                contexto.mostraErro("Apontamento não encontrado. NUAPO: " + nuapo);
                return;
            }

            String situacao = query.getString("SITUACAO");
            query.close();

            if (StringUtils.isEmpty(situacao)) {
                contexto.mostraErro("Situação do apontamento não definida para NUAPO: " + nuapo);
                return;
            }

            if ("C".equalsIgnoreCase(situacao)) {
                contexto.mostraErro("Apontamento já confirmado. NUAPO: " + nuapo);
                return;
            }

            if (!"P".equalsIgnoreCase(situacao)) {
                contexto.mostraErro("Somente apontamentos pendentes (situação 'P') podem ser confirmados. Situação atual: "
                        + situacao + " | NUAPO: " + nuapo);
                return;
            }

            query = contexto.getQuery();
            query.setParam("NUAPO", nuapo);
            query.nativeSelect(
                    "SELECT 1 FROM TPRAPA PA " +
                            "WHERE PA.QTDAPONTADA = 0 " +
                            "AND PA.NUAPO = {NUAPO}"
            );

            if (query.next()) {
                query.close();
                contexto.mostraErro("Não é possível confirmar o apontamento. Existem itens com quantidade apontada igual a zero para o NUAPO: " + nuapo + ".");
                return;
            }
            query.close();

            query = contexto.getQuery();
            query.setParam("SITUACAO", "C");
            query.setParam("NUAPO", nuapo);
            query.update("UPDATE TPRAPO SET SITUACAO = {SITUACAO} WHERE NUAPO = {NUAPO}");
            query.close();

            System.out.println("ConfirmarApontamentoEFinalizarOPBTFromParam - Apontamento confirmado NUAPO: " + nuapo);
        } catch (Exception e) {
            String detalhe = mensagemAmigavel(e);
            contexto.mostraErro("Erro ao confirmar apontamento: " + detalhe);
            System.err.println("Erro ao confirmar apontamento: " + detalhe);
            e.printStackTrace();
            throw e;
        }

        // --- Trecho equivalente a FinalizarOPBTFromParam#doAction ---
        BigDecimal idiproc = obterIdiproc(contexto);
        if (idiproc == null) {
            idiproc = obterIdiprocPorNuapo(contexto, nuapo);
        }
        if (idiproc == null) {
            contexto.mostraErro(
                    "Apontamento confirmado, mas não foi possível obter IDIPROC. Informe IDIPROC no JX.acionarBotao ou selecione linha com IDIPROC."
            );
            return;
        }

        final boolean ignorarApontamentosDivergentes = obterIgnorarApontamentosDivergentes(contexto);
        final boolean ignoraValidacaoFormulario = obterIgnoraValidacaoFormulario(contexto);

        ArrayList<BigDecimal> idiatvs = new ArrayList<>();
        query = contexto.getQuery();
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
            contexto.mostraErro("Apontamento confirmado (NUAPO: " + nuapo + "), porém não há instância de atividade em aberto (DHFINAL nulo) para o IDIPROC: " + idiproc + ".");
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
            msg.append("Apontamento confirmado e atividades da OP finalizadas com sucesso.\n\n");
            msg.append("Confirmação:\n");
            msg.append("• NUAPO: ").append(nuapo).append("\n");
            msg.append("• Usuário: ").append(codUsu).append("\n\n");
            msg.append("Finalização:\n");
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
            System.out.println("ConfirmarApontamentoEFinalizarOPBTFromParam - OK NUAPO=" + nuapo + " IDIPROC=" + idiproc + " idiatvs=" + idiatvs.size());
        } catch (Exception e) {
            String detalhe = mensagemAmigavel(e);
            contexto.mostraErro("Apontamento já confirmado (NUAPO: " + nuapo + "), porém erro ao finalizar OP: " + detalhe);
            System.err.println("ConfirmarApontamentoEFinalizarOPBTFromParam - falha na finalização IDIPROC=" + idiproc + " : " + detalhe);
            e.printStackTrace();
            throw e;
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.ConfirmarApontamentoEFinalizarOPBTFromParam - FIM");
    }

    private static BigDecimal obterIdiprocPorNuapo(ContextoAcao contexto, BigDecimal nuapo) throws Exception {
        QueryExecutor q = contexto.getQuery();
        try {
            q.setParam("NUAPO", nuapo);
            q.nativeSelect(
                    "SELECT IATV.IDIPROC FROM TPRAPO APO "
                            + "INNER JOIN TPRIATV IATV ON IATV.IDIATV = APO.IDIATV "
                            + "WHERE APO.NUAPO = {NUAPO}"
            );
            if (q.next()) {
                BigDecimal v = q.getBigDecimal("IDIPROC");
                if (v != null && v.compareTo(BigDecimal.ZERO) > 0) {
                    return idSemDecimais(v);
                }
            }
        } finally {
            q.close();
        }
        return null;
    }

    /**
     * Mesma regra de {@link ConfirmarApontamentoBTFromParam#obterNuapo(ContextoAcao)}.
     */
    private BigDecimal obterNuapo(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("NUAPO");
        if (param == null) {
            param = contexto.getParam("nuapo");
        }

        if (param != null) {
            System.out.println("ConfirmarApontamentoEFinalizarOPBTFromParam - Parâmetro NUAPO recebido: " + param);
            if (param instanceof BigDecimal) {
                return (BigDecimal) param;
            }
            if (param instanceof Number) {
                return BigDecimal.valueOf(((Number) param).doubleValue());
            }
            if (param instanceof String) {
                String s = ((String) param).trim();
                if (s.isEmpty()) {
                    contexto.mostraErro("Parâmetro NUAPO não pode ser vazio.");
                    return null;
                }
                try {
                    return new BigDecimal(s);
                } catch (NumberFormatException e) {
                    contexto.mostraErro("Parâmetro NUAPO inválido: " + s);
                    return null;
                }
            }
            contexto.mostraErro("Parâmetro NUAPO possui formato inválido.");
            return null;
        }

        Registro[] linhas = contexto.getLinhas();
        if (linhas != null && linhas.length == 1) {
            Object nuapoObj = linhas[0].getCampo("NUAPO");
            if (nuapoObj != null) {
                if (nuapoObj instanceof BigDecimal) {
                    return (BigDecimal) nuapoObj;
                }
                if (nuapoObj instanceof Number) {
                    return BigDecimal.valueOf(((Number) nuapoObj).doubleValue());
                }
                if (nuapoObj instanceof String) {
                    String s = ((String) nuapoObj).trim();
                    if (!s.isEmpty()) {
                        try {
                            return new BigDecimal(s);
                        } catch (NumberFormatException e) {
                            contexto.mostraErro("Valor de NUAPO inválido na linha selecionada: " + s);
                            return null;
                        }
                    }
                }
            }
        }

        contexto.mostraErro("Nenhum NUAPO informado. No componente HTML5, envie o NUAPO no JX.acionarBotao({ NUAPO: x }).");
        return null;
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
     * Igual a {@link FinalizarOPBTFromParam#mensagemAmigavel(Throwable)} — percorre causas para mensagem útil.
     */
    private static String mensagemAmigavel(Throwable t) {
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
