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
 * Botão de ação Java para iniciar a produção (iniciar instância(s) de atividade),
 * espelhando o comportamento do serviço nativo OperacaoProducaoSP.iniciarInstanciaAtividades
 * conforme os logs em logs_iniciar_produção.
 *
 * Fluxo principal observado nos logs:
 * 1) Entrada: IDIATV (ou IDIPROC para obter a primeira atividade não iniciada).
 * 2) Validar existência do processo (TPRIPROC) e status permitido.
 * 3) Validar existência da(s) atividade(s) (TPRIATV) e que ainda não foram aceites (DHACEITE IS NULL).
 * 4) Iniciar produção:
 *    - UPDATE TPRIATV SET CODEXEC, CODUSU, DHACEITE, DHINICIO WHERE IDIATV = :idiatv
 *    - INSERT INTO TPREIATV (TIPO='N', DHINICIO, DHFINAL NULL, ...) para cada atividade.
 *    O registro em TPREIATV com TIPO 'N' é obrigatório para que "Parar a produção" (PararProducaoBTFromParam)
 *    encontre o trecho de execução a fechar e insira o registro de parada (TIPO 'P').
 *
 * Suporta execução via:
 * - Parâmetros IDIPROC e/ou IDIATV quando acionado pelo componente HTML5 (JSP) via JX.acionarBotao.
 * - Linha selecionada na grid (campos IDIPROC / IDIATV) em tela nativa.
 *
 * No Sankhya: cadastre um botão de ação Java apontando para esta classe e use
 * o ID desse botão no JSP (ex.: idBotao: XXX). Parâmetros: IDIPROC e/ou IDIATV.
 */
public class IniciarProducaoBTFromParam implements AcaoRotinaJava {

    /** Status de processo que permitem iniciar produção (conforme consultas nos logs). */
    private static final String[] STATUS_PROC_PERMITIDOS = { "A", "P", "P2", "R", "S", "S2" };

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.IniciarProducaoBTFromParam - INICIO");

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return;
        }

        BigDecimal idiproc = obterIdiproc(contexto);
        BigDecimal idiatvParam = obterIdiatvParam(contexto);

        List<BigDecimal> idiatvsParaIniciar = obterIdiatvsParaIniciar(contexto, idiproc, idiatvParam);
        if (idiatvsParaIniciar == null) {
            return;
        }
        if (idiatvsParaIniciar.isEmpty()) {
            contexto.mostraErro("Nenhuma atividade elegível para iniciar. Informe IDIPROC e/ou IDIATV ou selecione uma linha com atividade ainda não iniciada (DHACEITE nulo).");
            return;
        }

        QueryExecutor query = contexto.getQuery();
        Timestamp dataHoraAtual = new Timestamp(new Date().getTime());

        try {
            for (BigDecimal idiatv : idiatvsParaIniciar) {
                validarAtividadeAindaNaoIniciada(contexto, idiatv);
                query = contexto.getQuery();
                query.setParam("CODEXEC", codUsu);
                query.setParam("CODUSU", codUsu);
                query.setParam("DHACEITE", dataHoraAtual);
                query.setParam("DHINICIO", dataHoraAtual);
                query.setParam("IDIATV", idiatv);
                query.update(
                    "UPDATE TPRIATV SET CODEXEC = {CODEXEC}, CODUSU = {CODUSU}, DHACEITE = {DHACEITE}, DHINICIO = {DHINICIO} WHERE IDIATV = {IDIATV}"
                );
                query.close();

                // Registro de execução (TIPO 'N') em TPREIATV: obrigatório para que "Parar a produção" possa
                // fechar este trecho e inserir o registro de parada (TIPO 'P'). Espelha OperacaoProducaoSP.iniciarInstanciaAtividades.
                query = contexto.getQuery();
                query.nativeSelect("SELECT NVL(MAX(IDEIATV), 0) + 1 AS PROX_IDEIATV FROM TPREIATV");
                BigDecimal proxIdeiatv = query.next() ? query.getBigDecimal("PROX_IDEIATV") : BigDecimal.ONE;
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
                    "INSERT INTO TPREIATV (CODEXEC, CODMTP, CODUSU, DHFINAL, DHINICIO, IDEIATV, IDIATV, OBSERVACAO, TIPO) "
                        + "VALUES ({CODEXEC}, {CODMTP}, {CODUSU}, NULL, {DHINICIO}, {IDEIATV}, {IDIATV}, NULL, {TIPO})"
                );
                query.close();
            }

            StringBuilder msg = new StringBuilder();
            msg.append("Produção iniciada com sucesso!\n\n");
            msg.append("Informações:\n");
            msg.append("• Atividade(s) iniciada(s) (IDIATV): ").append(idiatvsParaIniciar.size()).append("\n");
            msg.append("• Usuário: ").append(codUsu).append("\n");
            msg.append("• Data/Hora aceite: ").append(dataHoraAtual).append("\n");
            if (idiproc != null) {
                msg.append("• IDIPROC: ").append(idiproc).append("\n");
            }

            contexto.setMensagemRetorno(msg.toString());
            System.out.println("IniciarProducaoBTFromParam - Produção iniciada - IDIATV(s): " + idiatvsParaIniciar);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao iniciar produção: " + e.getMessage());
            System.out.println("Erro ao iniciar produção: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.IniciarProducaoBTFromParam - FIM");
    }

    /**
     * Obtém IDIPROC: parâmetro IDIPROC (ou idiproc), depois linha selecionada.
     */
    private BigDecimal obterIdiproc(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("IDIPROC");
        if (param == null) {
            param = contexto.getParam("idiproc");
        }
        if (param != null) {
            BigDecimal v = toBigDecimal(param);
            if (v != null && v.compareTo(BigDecimal.ZERO) > 0) {
                return v;
            }
        }
        Registro[] linhas = contexto.getLinhas();
        if (linhas != null && linhas.length == 1) {
            Object v = linhas[0].getCampo("IDIPROC");
            if (v != null) {
                BigDecimal b = toBigDecimal(v);
                if (b != null && b.compareTo(BigDecimal.ZERO) > 0) {
                    return b;
                }
            }
        }
        return null;
    }

    /**
     * Obtém IDIATV apenas do parâmetro (ou linha), não do processo.
     */
    private BigDecimal obterIdiatvParam(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("IDIATV");
        if (param == null) {
            param = contexto.getParam("idiatv");
        }
        if (param != null) {
            BigDecimal v = toBigDecimal(param);
            if (v != null && v.compareTo(BigDecimal.ZERO) > 0) {
                return v;
            }
        }
        Registro[] linhas = contexto.getLinhas();
        if (linhas != null && linhas.length == 1) {
            Object v = linhas[0].getCampo("IDIATV");
            if (v != null) {
                BigDecimal b = toBigDecimal(v);
                if (b != null && b.compareTo(BigDecimal.ZERO) > 0) {
                    return b;
                }
            }
        }
        return null;
    }

    /**
     * Define a lista de IDIATV a iniciar:
     * - Se IDIATV foi informado e ainda não foi iniciado (DHACEITE IS NULL): inicia só ele.
     * - Se IDIATV foi informado mas já foi iniciado: obtém IDIPROC dessa atividade e inicia
     *   as atividades do processo que ainda estão com DHACEITE nulo (comportamento alinhado à rotina nativa).
     * - Se só IDIPROC foi informado: inicia todas as atividades do processo com DHACEITE IS NULL.
     */
    private List<BigDecimal> obterIdiatvsParaIniciar(ContextoAcao contexto, BigDecimal idiproc, BigDecimal idiatvParam) throws Exception {
        List<BigDecimal> lista = new ArrayList<>();

        if (idiatvParam != null) {
            QueryExecutor q = contexto.getQuery();
            q.setParam("IDIATV", idiatvParam);
            q.nativeSelect("SELECT IDIATV, IDIPROC, DHACEITE FROM TPRIATV WHERE IDIATV = {IDIATV}");
            if (!q.next()) {
                q.close();
                contexto.mostraErro("Atividade não encontrada. IDIATV: " + idiatvParam);
                return null;
            }
            BigDecimal idiprocDaAtv = q.getBigDecimal("IDIPROC");
            Timestamp dhAceite = q.getTimestamp("DHACEITE");
            q.close();

            if (dhAceite == null) {
                // Atividade ainda não iniciada: inicia só esta
                if (idiproc != null) {
                    validarProcesso(contexto, idiproc);
                } else if (idiprocDaAtv != null) {
                    validarProcesso(contexto, idiprocDaAtv);
                }
                lista.add(idiatvParam);
                return lista;
            }

            // Atividade já iniciada: usar IDIPROC (dessa atividade ou informado) e iniciar as que estão com DHACEITE nulo
            BigDecimal idiprocUsar = idiproc != null ? idiproc : idiprocDaAtv;
            if (idiprocUsar == null) {
                contexto.mostraErro("Atividade informada já foi iniciada (IDIATV: " + idiatvParam + "). Informe IDIPROC para iniciar as próximas atividades do processo.");
                return null;
            }
            validarProcesso(contexto, idiprocUsar);
            return buscarAtividadesNaoIniciadas(contexto, idiprocUsar);
        }

        if (idiproc == null) {
            contexto.mostraErro("Nenhum IDIPROC ou IDIATV informado. No componente HTML5, envie IDIPROC e/ou IDIATV no JX.acionarBotao.");
            return null;
        }

        validarProcesso(contexto, idiproc);
        return buscarAtividadesNaoIniciadas(contexto, idiproc);
    }

    /**
     * Retorna lista de IDIATV do processo com DHACEITE IS NULL (atividades ainda não iniciadas).
     */
    private List<BigDecimal> buscarAtividadesNaoIniciadas(ContextoAcao contexto, BigDecimal idiproc) throws Exception {
        List<BigDecimal> lista = new ArrayList<>();
        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);
        query.nativeSelect(
            "SELECT IDIATV FROM TPRIATV WHERE IDIPROC = {IDIPROC} AND DHACEITE IS NULL ORDER BY IDIATV"
        );
        while (query.next()) {
            BigDecimal idiatv = query.getBigDecimal("IDIATV");
            if (idiatv != null) {
                lista.add(idiatv);
            }
        }
        query.close();
        return lista;
    }

    private void validarProcesso(ContextoAcao contexto, BigDecimal idiproc) throws Exception {
        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);
        query.nativeSelect("SELECT IDIPROC, STATUSPROC FROM TPRIPROC WHERE IDIPROC = {IDIPROC}");

        if (!query.next()) {
            query.close();
            contexto.mostraErro("Processo não encontrado. IDIPROC: " + idiproc);
            throw new IllegalStateException("Processo não encontrado");
        }

        String statusProc = query.getString("STATUSPROC");
        query.close();

        if (StringUtils.isEmpty(statusProc)) {
            contexto.mostraErro("Status do processo não definido para IDIPROC: " + idiproc);
            throw new IllegalStateException("Status do processo não definido");
        }

        String st = statusProc.toUpperCase();
        boolean permitido = false;
        for (String s : STATUS_PROC_PERMITIDOS) {
            if (s.equals(st)) {
                permitido = true;
                break;
            }
        }
        if (!permitido) {
            contexto.mostraErro("Processo não está em status válido para iniciar produção. Status atual: " + statusProc + " | IDIPROC: " + idiproc);
            throw new IllegalStateException("Status inválido para iniciar produção");
        }
    }

    private void validarAtividadeAindaNaoIniciada(ContextoAcao contexto, BigDecimal idiatv) throws Exception {
        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIATV", idiatv);
        query.nativeSelect("SELECT IDIATV, DHACEITE FROM TPRIATV WHERE IDIATV = {IDIATV}");

        if (!query.next()) {
            query.close();
            contexto.mostraErro("Atividade não encontrada. IDIATV: " + idiatv);
            throw new IllegalStateException("Atividade não encontrada");
        }

        Timestamp dhAceite = query.getTimestamp("DHACEITE");
        query.close();

        if (dhAceite != null) {
            contexto.mostraErro("Atividade já foi iniciada (DHACEITE preenchido). IDIATV: " + idiatv);
            throw new IllegalStateException("Atividade já iniciada");
        }
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue());
        if (value instanceof String) {
            String s = ((String) value).trim();
            if (s.isEmpty()) return null;
            try {
                return new BigDecimal(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
