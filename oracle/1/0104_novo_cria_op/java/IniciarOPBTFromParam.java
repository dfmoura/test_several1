package br.com.triggerint.modulos.snk.acoes;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.mgeprod.model.helper.ControleProcessoHelper;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Inicia a instância de processo (OP) no mesmo caminho do serviço nativo
 * {@code OrdemProducaoSP.inicializarOrdens} / {@code OrdemProducaoSPBean.inicializarOrdens}:
 * {@link ControleProcessoHelper#iniciaOrdemDeProducao(java.math.BigDecimal)}.
 * <p>
 * Esse fluxo dispara o Activiti ({@code startProcessByKey}), obtém o {@code IDWFLOW} retornado pelo engine
 * e persiste em {@code TPRIPROC} via {@link ControleProcessoHelper#registraInicioDeProcesso},
 * preenchendo {@code DHINST} (quando aplicável) e alterando {@code STATUSPROC} (ex.: {@code R} → {@code A}).
 * <p>
 * Não utiliza UPDATE manual em {@code TPRIPROC}: evita inconsistência com BPMN/workflow.
 * Parâmetro / linha: {@code IDIPROC} (ou {@code idiproc}). Sem {@code mostraErro} / mensagem de retorno.
 */
public class IniciarOPBTFromParam implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.IniciarOPBTFromParam - INICIO");

        final BigDecimal idiproc = obterIdiproc(contexto);
        if (idiproc == null) {
            System.out.println("IniciarOPBTFromParam - IDIPROC nao informado; nada a fazer.");
            return;
        }

        JdbcWrapper jdbc = null;
        try {
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            ControleProcessoHelper cph = new ControleProcessoHelper(jdbc);
            EntityFacade dwf = EntityFacadeFactory.getDWFFacade();

            DynamicVO cab = (DynamicVO) dwf.findEntityByPrimaryKeyAsVO("CabecalhoInstanciaProcesso", idiproc);
            String statusProc = cab.asString("STATUSPROC");
            BigDecimal idProc = idSemDecimais(cab.asBigDecimal("IDPROC"));

            if ("A".equals(statusProc)) {
                System.out.println("IniciarOPBTFromParam - OP ja iniciada (STATUSPROC=A), ignorando. IDIPROC=" + idiproc);
                return;
            }

            if ("R".equals(statusProc)) {
                cph.validaObrigatoriedadeFormularioInicializacao(idiproc, idProc);
                cph.validaInicializacaoDoPAQuandoExistirSubOrdem(idiproc);
            }

            cph.iniciaOrdemDeProducao(idiproc);
            System.out.println("IniciarOPBTFromParam - OP iniciada via ControleProcessoHelper.iniciaOrdemDeProducao IDIPROC=" + idiproc);
        } catch (Exception e) {
            System.err.println("IniciarOPBTFromParam - falha IDIPROC=" + idiproc + " : " + e.getMessage());
            e.printStackTrace();
            throw e;
        } finally {
            JdbcWrapper.closeSession(jdbc);
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.IniciarOPBTFromParam - FIM");
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

    /**
     * IDs vindos de parâmetro HTTP / grid podem vir como {@code 12345.0} (escala maior que zero).
     * O JAPE exige escala 0 para chaves como {@code InstanciaAtividade.IDIPROC} (PROD_E00016).
     */
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
}
