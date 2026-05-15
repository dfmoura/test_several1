package br.com.triggerint.modulos.snk.acoes;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.mgeprod.model.helper.ControleProcessoHelper;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Botão de ação único que executa em sequência:
 * <ol>
 *   <li>{@code IniciarOPBTFromParam} — inicia a OP via {@link ControleProcessoHelper#iniciaOrdemDeProducao(java.math.BigDecimal)}</li>
 *   <li>{@code IniciarProducaoBTFromParam} — inicia produção (TPRIATV / TPREIATV)</li>
 *   <li>{@code CadastrarCabecApontamentoBTFromParam} — cadastra cabeçalho de apontamento (TPRAPO / TPRAPA / TPRAMP)</li>
 * </ol>
 * Parâmetros: {@code IDIPROC} / {@code idiproc} e, quando aplicável, {@code IDIATV} / {@code idiatv} (ou linha na grid).
 */
public class IniciarOPProducaoApontamentoSeqBTFromParam implements AcaoRotinaJava {

    private static final String[] STATUS_PROC_PERMITIDOS = { "A", "P", "P2", "R", "S", "S2" };

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.IniciarOPProducaoApontamentoSeqBTFromParam - INICIO");

        if (!executarIniciarOP(contexto)) {
            return;
        }
        if (!executarIniciarProducao(contexto)) {
            return;
        }
        if (!executarCadastrarCabecApontamento(contexto)) {
            return;
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.IniciarOPProducaoApontamentoSeqBTFromParam - FIM");
    }

    // -------------------------------------------------------------------------
    // Passo 1 — Iniciar OP (ControleProcessoHelper)
    // -------------------------------------------------------------------------

    private boolean executarIniciarOP(ContextoAcao contexto) throws Exception {
        System.out.println("IniciarOPProducaoApontamentoSeq - [1] IniciarOP - INICIO");

        final BigDecimal idiproc = obterIdiprocIniciarOP(contexto);
        if (idiproc == null) {
            System.out.println("IniciarOPProducaoApontamentoSeq - [1] IDIPROC nao informado; interrompendo fluxo.");
            contexto.mostraErro("IDIPROC obrigatório para o fluxo completo (parâmetro ou linha selecionada).");
            return false;
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
                System.out.println("IniciarOPProducaoApontamentoSeq - [1] OP ja iniciada (STATUSPROC=A), seguindo. IDIPROC=" + idiproc);
                return true;
            }

            if ("R".equals(statusProc)) {
                cph.validaObrigatoriedadeFormularioInicializacao(idiproc, idProc);
                cph.validaInicializacaoDoPAQuandoExistirSubOrdem(idiproc);
            }

            cph.iniciaOrdemDeProducao(idiproc);
            System.out.println("IniciarOPProducaoApontamentoSeq - [1] OP iniciada via ControleProcessoHelper.iniciaOrdemDeProducao IDIPROC=" + idiproc);
        } catch (Exception e) {
            System.err.println("IniciarOPProducaoApontamentoSeq - [1] falha IDIPROC=" + idiproc + " : " + e.getMessage());
            e.printStackTrace();
            throw e;
        } finally {
            JdbcWrapper.closeSession(jdbc);
        }

        System.out.println("IniciarOPProducaoApontamentoSeq - [1] IniciarOP - FIM");
        return true;
    }

    private static BigDecimal obterIdiprocIniciarOP(ContextoAcao contexto) throws Exception {
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

    // -------------------------------------------------------------------------
    // Passo 2 — Iniciar produção (TPRIATV / TPREIATV)
    // -------------------------------------------------------------------------

    private boolean executarIniciarProducao(ContextoAcao contexto) throws Exception {
        System.out.println("IniciarOPProducaoApontamentoSeq - [2] IniciarProducao - INICIO");

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return false;
        }

        BigDecimal idiproc = obterIdiprocProducao(contexto);
        BigDecimal idiatvParam = obterIdiatvParamProducao(contexto);

        List<BigDecimal> idiatvsParaIniciar = obterIdiatvsParaIniciar(contexto, idiproc, idiatvParam);
        if (idiatvsParaIniciar == null) {
            return false;
        }
        if (idiatvsParaIniciar.isEmpty()) {
            contexto.mostraErro("Nenhuma atividade elegível para iniciar. Informe IDIPROC e/ou IDIATV ou selecione uma linha com atividade ainda não iniciada (DHACEITE nulo).");
            return false;
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
            System.out.println("IniciarOPProducaoApontamentoSeq - [2] Produção iniciada - IDIATV(s): " + idiatvsParaIniciar);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao iniciar produção: " + e.getMessage());
            System.out.println("Erro ao iniciar produção: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("IniciarOPProducaoApontamentoSeq - [2] IniciarProducao - FIM");
        return true;
    }

    private BigDecimal obterIdiprocProducao(ContextoAcao contexto) throws Exception {
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

    private BigDecimal obterIdiatvParamProducao(ContextoAcao contexto) throws Exception {
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
                if (idiproc != null) {
                    validarProcesso(contexto, idiproc);
                } else if (idiprocDaAtv != null) {
                    validarProcesso(contexto, idiprocDaAtv);
                }
                lista.add(idiatvParam);
                return lista;
            }

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

    // -------------------------------------------------------------------------
    // Passo 3 — Cadastrar cabeçalho de apontamento (TPRAPO / TPRAPA / TPRAMP)
    // -------------------------------------------------------------------------

    private boolean executarCadastrarCabecApontamento(ContextoAcao contexto) throws Exception {
        System.out.println("IniciarOPProducaoApontamentoSeq - [3] CadastrarCabecApontamento - INICIO");

        BigDecimal idiproc = obterIdiprocApontamento(contexto);
        if (idiproc == null) {
            return false;
        }

        BigDecimal codUsu = contexto.getUsuarioLogado();
        if (codUsu == null) {
            contexto.mostraErro("Não foi possível identificar o usuário logado.");
            return false;
        }

        Timestamp dataHoraAtual = new Timestamp(new Date().getTime());

        QueryExecutor query = contexto.getQuery();
        try {
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect("SELECT IDIPROC, STATUSPROC, NROLOTE FROM TPRIPROC WHERE IDIPROC = {IDIPROC}");

            if (!query.next()) {
                query.close();
                contexto.mostraErro("Processo de produção não encontrado. IDIPROC: " + idiproc);
                return false;
            }

            String statusProc = query.getString("STATUSPROC");
            String nroLote = query.getString("NROLOTE");
            query.close();

            if (StringUtils.isEmpty(statusProc)) {
                contexto.mostraErro("Status do processo não definido para IDIPROC: " + idiproc);
                return false;
            }

            BigDecimal idiatv = obterIdiatvDoParamOuProcessoApontamento(contexto, idiproc);
            if (idiatv == null) {
                return false;
            }

            BigDecimal nuapo = gerarNovoNuapo(contexto);
            if (nuapo == null) {
                contexto.mostraErro("Não foi possível gerar um novo número de apontamento (NUAPO).");
                return false;
            }

            inserirCabecalhoApontamento(contexto, codUsu, dataHoraAtual, idiatv, nuapo);

            int itensCriados = inserirItensPA(contexto, idiproc, nuapo);

            int mpsCriadas = inserirMateriaisMP(contexto, idiproc, idiatv, nuapo);

            StringBuilder msg = new StringBuilder();
            msg.append("Apontamento criado com sucesso!\n\n");
            msg.append("Informações:\n");
            msg.append("• IDIPROC: ").append(idiproc).append("\n");
            msg.append("• Lote: ").append(StringUtils.isEmpty(nroLote) ? "N/A" : nroLote).append("\n");
            msg.append("• NUAPO (novo): ").append(nuapo).append("\n");
            msg.append("• Itens de PA gerados (TPRAPA): ").append(itensCriados).append("\n");
            msg.append("• Itens de MP gerados (TPRAMP): ").append(mpsCriadas).append("\n");
            msg.append("• Usuário: ").append(codUsu).append("\n");
            msg.append("• Data/Hora: ").append(dataHoraAtual).append("\n");

            contexto.setMensagemRetorno(msg.toString());
            System.out.println("IniciarOPProducaoApontamentoSeq - [3] Apontamento criado - IDIPROC: " + idiproc + ", NUAPO: " + nuapo + ", Itens PA: " + itensCriados);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao criar apontamento: " + e.getMessage());
            System.out.println("Erro ao criar apontamento: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("IniciarOPProducaoApontamentoSeq - [3] CadastrarCabecApontamento - FIM");
        return true;
    }

    private BigDecimal obterIdiprocApontamento(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("IDIPROC");
        if (param == null) {
            param = contexto.getParam("idiproc");
        }
        if (param != null) {
            System.out.println("IniciarOPProducaoApontamentoSeq - [3] Parâmetro IDIPROC recebido: " + param);
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

        contexto.mostraErro("Nenhum IDIPROC informado. No componente HTML5, selecione a OP; o IDIPROC será enviado automaticamente.");
        return null;
    }

    private BigDecimal obterIdiatvDoParamOuProcessoApontamento(ContextoAcao contexto, BigDecimal idiproc) throws Exception {
        Object paramIdiatv = contexto.getParam("IDIATV");
        if (paramIdiatv == null) {
            paramIdiatv = contexto.getParam("idiatv");
        }
        if (paramIdiatv != null) {
            BigDecimal idiatv = toBigDecimal(paramIdiatv);
            if (idiatv != null && idiatv.compareTo(BigDecimal.ZERO) > 0) {
                System.out.println("IniciarOPProducaoApontamentoSeq - [3] Parâmetro IDIATV recebido: " + idiatv);
                return idiatv;
            }
        }

        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);
        query.nativeSelect("SELECT NVL(MAX(IDIATV), 0) AS IDIATV FROM TPRIATV WHERE IDIPROC = {IDIPROC}");

        BigDecimal idiatv = null;
        if (query.next()) {
            idiatv = query.getBigDecimal("IDIATV");
        }
        query.close();

        if (idiatv == null || BigDecimal.ZERO.compareTo(idiatv) == 0) {
            contexto.mostraErro("Nenhuma atividade (IDIATV) encontrada para o processo IDIPROC: " + idiproc
                    + ". Envie o parâmetro IDIATV na chamada do botão (ex.: JX.acionarBotao({ IDIPROC: x, IDIATV: y })) para satisfazer a regra personalizada.");
            return null;
        }

        return idiatv;
    }

    private BigDecimal gerarNovoNuapo(ContextoAcao contexto) throws Exception {
        QueryExecutor query = contexto.getQuery();
        query.nativeSelect("SELECT NVL(MAX(NUAPO), 0) + 1 AS PROX_NUAPO FROM TPRAPO");

        BigDecimal nuapo = null;
        if (query.next()) {
            nuapo = query.getBigDecimal("PROX_NUAPO");
        }
        query.close();
        return nuapo;
    }

    private void inserirCabecalhoApontamento(ContextoAcao contexto,
                                             BigDecimal codUsu,
                                             Timestamp dataHoraAtual,
                                             BigDecimal idiatv,
                                             BigDecimal nuapo) throws Exception {
        QueryExecutor query = contexto.getQuery();
        query.setParam("CODUSU", codUsu);
        query.setParam("DHAPO", dataHoraAtual);
        query.setParam("IDIATV", idiatv);
        query.setParam("NUAPO", nuapo);
        query.setParam("OBSERVACAO", "");
        query.setParam("SITUACAO", "P");

        query.update(
                "INSERT INTO TPRAPO (CODUSU, DHAPO, IDIATV, NUAPO, OBSERVACAO, SITUACAO) " +
                        "VALUES ({CODUSU}, {DHAPO}, {IDIATV}, {NUAPO}, {OBSERVACAO}, {SITUACAO})"
        );
        query.close();
    }

    private int inserirItensPA(ContextoAcao contexto, BigDecimal idiproc, BigDecimal nuapo) throws Exception {
        int itensCriados = 0;

        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);

        String sqlItensPA =
                "SELECT TPRIPA.CODPRODPA AS CODPRODPA, " +
                        "       TPRIPA.CONTROLEPA AS CONTROLEPA, " +
                        "       TPRIPA.QTDPRODUZIR AS QTDPRODUZIR " +
                        "  FROM TPRIPA " +
                        " WHERE TPRIPA.IDIPROC = {IDIPROC}";

        query.nativeSelect(sqlItensPA);

        BigDecimal seqapaAtual = obterSeqapaBase(contexto, nuapo);

        while (query.next()) {
            BigDecimal codProdPa = query.getBigDecimal("CODPRODPA");
            String controlePa = query.getString("CONTROLEPA");
            BigDecimal qtdProduzir = query.getBigDecimal("QTDPRODUZIR");

            if (codProdPa == null || qtdProduzir == null) {
                continue;
            }

            seqapaAtual = seqapaAtual.add(BigDecimal.ONE);
            inserirItemPA(contexto, nuapo, seqapaAtual, codProdPa, controlePa, qtdProduzir);
            itensCriados++;
        }

        query.close();
        return itensCriados;
    }

    private BigDecimal obterSeqapaBase(ContextoAcao contexto, BigDecimal nuapo) throws Exception {
        QueryExecutor query = contexto.getQuery();
        query.setParam("NUAPO", nuapo);
        query.nativeSelect("SELECT NVL(MAX(SEQAPA), 0) AS SEQAPA FROM TPRAPA WHERE NUAPO = {NUAPO}");

        BigDecimal seqapa = BigDecimal.ZERO;
        if (query.next()) {
            BigDecimal valor = query.getBigDecimal("SEQAPA");
            if (valor != null) {
                seqapa = valor;
            }
        }

        query.close();
        return seqapa;
    }

    private void inserirItemPA(ContextoAcao contexto,
                               BigDecimal nuapo,
                               BigDecimal seqapa,
                               BigDecimal codProdPa,
                               String controlePa,
                               BigDecimal qtdApontada) throws Exception {

        BigDecimal zero = BigDecimal.ZERO;

        QueryExecutor query = contexto.getQuery();
        query.setParam("CODMPE", zero);
        query.setParam("CODPRODPA", codProdPa);
        query.setParam("CONTROLEPA", controlePa);
        query.setParam("NUAPO", nuapo);
        query.setParam("QTDAPONTADA", qtdApontada);
        query.setParam("QTDFAT", zero);
        query.setParam("QTDFATSP", zero);
        query.setParam("QTDMPE", zero);
        query.setParam("QTDPERDA", zero);
        query.setParam("SEQAPA", seqapa);

        query.update(
                "INSERT INTO TPRAPA (CODMPE, CODPRODPA, CONTROLEPA, NUAPO, QTDAPONTADA, QTDFAT, QTDFATSP, QTDMPE, QTDPERDA, SEQAPA) " +
                        "VALUES ({CODMPE}, {CODPRODPA}, {CONTROLEPA}, {NUAPO}, {QTDAPONTADA}, {QTDFAT}, {QTDFATSP}, {QTDMPE}, {QTDPERDA}, {SEQAPA})"
        );
        query.close();
    }

    private int inserirMateriaisMP(ContextoAcao contexto, BigDecimal idiproc, BigDecimal idiatv, BigDecimal nuapo) throws Exception {
        int mpsCriadas = 0;

        if (idiproc == null || nuapo == null) {
            return 0;
        }

        BigDecimal seqmpAtual = obterSeqmpBase(contexto, nuapo);

        BigDecimal idproc = obterIdprocPorIdiproc(contexto, idiproc);
        BigDecimal idefx = obterIdefxPorIdiatv(contexto, idiatv);
        if (idefx == null) {
            idefx = BigDecimal.ZERO;
        }

        if (idproc != null) {
            QueryExecutor queryPa = contexto.getQuery();
            queryPa.setParam("IDIPROC", idiproc);
            queryPa.nativeSelect(
                    "SELECT CODPRODPA, NVL(CONTROLEPA, ' ') AS CONTROLEPA, QTDPRODUZIR AS QTDAPONTADA " +
                            "FROM TPRIPA " +
                            "WHERE IDIPROC = {IDIPROC} " +
                            "  AND ROWNUM = 1"
            );

            BigDecimal codProdPaBase = null;
            String controlePaBase = null;
            BigDecimal qtdApontadaBase = null;

            if (queryPa.next()) {
                codProdPaBase = queryPa.getBigDecimal("CODPRODPA");
                controlePaBase = queryPa.getString("CONTROLEPA");
                qtdApontadaBase = queryPa.getBigDecimal("QTDAPONTADA");
            }
            queryPa.close();

            if (codProdPaBase != null && qtdApontadaBase != null) {
                BigDecimal seqapa = BigDecimal.ONE;
                String controlePaParam = (controlePaBase == null || controlePaBase.trim().isEmpty())
                        ? " "
                        : controlePaBase.trim();

                QueryExecutor queryLmp = contexto.getQuery();
                queryLmp.setParam("CONTROLEPA", controlePaParam);
                queryLmp.setParam("QTDAPONTADA", qtdApontadaBase);
                queryLmp.setParam("IDPROC", idproc);
                queryLmp.setParam("IDEFX", idefx);
                queryLmp.setParam("CODPRODPA", codProdPaBase);
                queryLmp.setParam("CONTROLEPA2", controlePaParam);
                queryLmp.setParam("CONTROLEPA3", controlePaParam);

                String sqlLmp =
                        "SELECT X.CODPRODMP, " +
                                "       X.CONTROLEMP, " +
                                "       SUM(X.QTDMISTURA) AS QTD, " +
                                "       X.CODVOL " +
                                "  FROM ( " +
                                "        SELECT LMP.CODPRODMP, " +
                                "               (CASE " +
                                "                    WHEN LMP.TIPOCONTROLEMP = 'L' THEN LMP.CONTROLEMP " +
                                "                    WHEN LMP.TIPOCONTROLEMP = 'H' THEN {CONTROLEPA} " +
                                "                    ELSE ' ' " +
                                "               END) AS CONTROLEMP, " +
                                "               (CASE WHEN LMP.TIPOQTD = 'V' THEN LMP.QTDMISTURA * {QTDAPONTADA} ELSE LMP.QTDMISTURA END) AS QTDMISTURA, " +
                                "               NVL(LMP.CODVOL, PRO.CODVOL) AS CODVOL " +
                                "          FROM TPRLMP LMP " +
                                "          INNER JOIN TPREFX EFX ON (EFX.IDEFX = LMP.IDEFX) " +
                                "          INNER JOIN TPRATV ATV ON (ATV.IDEFX = LMP.IDEFX) " +
                                "          INNER JOIN TGFPRO PRO ON (PRO.CODPROD = LMP.CODPRODMP) " +
                                "         WHERE EFX.IDPROC = {IDPROC} " +
                                "           AND (({IDEFX} = 0 AND ATV.LISTAMPPADRAO = 'S') OR ({IDEFX} > 0 AND ATV.IDEFX = {IDEFX})) " +
                                "           AND LMP.CODPRODPA = {CODPRODPA} " +
                                "       ) X " +
                                " GROUP BY X.CODPRODMP, X.CONTROLEMP, X.CODVOL";

                queryLmp.nativeSelect(sqlLmp);

                while (queryLmp.next()) {
                    BigDecimal codProdMp = queryLmp.getBigDecimal("CODPRODMP");
                    String controleMp = queryLmp.getString("CONTROLEMP");
                    BigDecimal qtd = queryLmp.getBigDecimal("QTD");
                    String codVol = queryLmp.getString("CODVOL");

                    if (codProdMp == null || qtd == null || qtd.compareTo(BigDecimal.ZERO) == 0) {
                        continue;
                    }

                    seqmpAtual = seqmpAtual.add(BigDecimal.ONE);
                    inserirItemMP(contexto, nuapo, seqapa, seqmpAtual, codProdMp, controleMp, qtd, codVol);
                    mpsCriadas++;
                }

                queryLmp.close();

                if (mpsCriadas > 0) {
                    return mpsCriadas;
                }
            }
        }

        BigDecimal seqapaFallback = BigDecimal.ONE;

        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);

        String sqlMp =
                "SELECT TGFITE.CODPROD AS CODPRODMP, " +
                        "       TGFITE.CONTROLE AS CONTROLEMP, " +
                        "       SUM(TGFITE.QTDNEG) AS QTD, " +
                        "       COALESCE(MAX(TGFPRO.CODVOL), 'UN') AS CODVOL " +
                        "  FROM TGFITE " +
                        "  INNER JOIN TGFCAB ON (TGFITE.NUNOTA = TGFCAB.NUNOTA) " +
                        "  INNER JOIN TGFPRO ON (TGFPRO.CODPROD = TGFITE.CODPROD) " +
                        " WHERE TGFCAB.IDIPROC = {IDIPROC} " +
                        "   AND TGFITE.SEQUENCIA > 0 " +
                        "   AND TGFCAB.TIPMOV <> 'F' " +
                        " GROUP BY TGFITE.CODPROD, TGFITE.CONTROLE";

        query.nativeSelect(sqlMp);

        boolean encontrouAlgumaMp = false;

        while (query.next()) {
            BigDecimal codProdMp = query.getBigDecimal("CODPRODMP");
            String controleMp = query.getString("CONTROLEMP");
            BigDecimal qtd = query.getBigDecimal("QTD");
            String codVol = query.getString("CODVOL");

            if (codProdMp == null || qtd == null || qtd.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            encontrouAlgumaMp = true;
            seqmpAtual = seqmpAtual.add(BigDecimal.ONE);
            inserirItemMP(contexto, nuapo, seqapaFallback, seqmpAtual, codProdMp, controleMp, qtd, codVol);
            mpsCriadas++;
        }

        query.close();

        if (encontrouAlgumaMp) {
            return mpsCriadas;
        }

        if (idefx == null) {
            idefx = obterIdefxPorIdiatv(contexto, idiatv);
        }
        if (idefx == null) {
            return mpsCriadas;
        }

        QueryExecutor queryFallback = contexto.getQuery();
        queryFallback.setParam("IDIPROC", idiproc);
        queryFallback.setParam("IDEFX", idefx);

        String sqlMpFallback =
                "SELECT X.CODPRODMP, " +
                        "       X.CONTROLEMP, " +
                        "       SUM(X.QTDNEG) AS QTD, " +
                        "       COALESCE(MAX(PRO.CODVOL), 'UN') AS CODVOL " +
                        "  FROM ( " +
                        "        SELECT TGFITE.CODPROD AS CODPRODMP, " +
                        "               TGFITE.CONTROLE AS CONTROLEMP, " +
                        "               SUM(CASE WHEN (TPRIATV.IDEFX = {IDEFX} OR {IDEFX} = 0) THEN TGFITE.QTDNEG ELSE 0 END) AS QTDNEG " +
                        "          FROM TGFITE " +
                        "          INNER JOIN TGFCAB ON (TGFITE.NUNOTA = TGFCAB.NUNOTA) " +
                        "          INNER JOIN (SELECT DISTINCT CODPROD, CONTROLE, DTVAL FROM TGFEST) TGFEST ON (TGFEST.CODPROD = TGFITE.CODPROD AND TGFEST.CONTROLE = TGFITE.CONTROLE) " +
                        "          INNER JOIN TPRROPE ON TGFCAB.NUNOTA = TPRROPE.NUNOTA " +
                        "          INNER JOIN TPRIATV ON (TPRIATV.IDIATV = TPRROPE.IDIATV AND TGFCAB.IDIPROC = TPRIATV.IDIPROC) " +
                        "         WHERE TGFCAB.IDIPROC = {IDIPROC} " +
                        "           AND TGFITE.SEQUENCIA > 0 " +
                        "           AND TGFCAB.TIPMOV <> 'F' " +
                        "           AND NOT EXISTS ( " +
                        "                 SELECT 1 " +
                        "                   FROM TPRAPO APO " +
                        "                   INNER JOIN TPRASP ASP ON (ASP.NUAPO = APO.NUAPO) " +
                        "                   INNER JOIN TPRLSP LSP ON (LSP.CODPRODSP = ASP.CODPRODSP) " +
                        "                  WHERE APO.IDIATV = TPRIATV.IDIATV " +
                        "                    AND LSP.IDEFX = TPRIATV.IDEFX " +
                        "               ) " +
                        "         GROUP BY TGFITE.CODPROD, TGFITE.CONTROLE, TGFEST.DTVAL, TPRIATV.IDEFX " +
                        "        UNION ALL " +
                        "        SELECT TGFITE.CODPROD AS CODPRODMP, " +
                        "               TGFITE.CONTROLE AS CONTROLEMP, " +
                        "               SUM(CASE WHEN TPRIATV.IDEFX <> {IDEFX} THEN TGFITE.QTDNEG ELSE 0 END) AS QTDNEG " +
                        "          FROM TGFITE " +
                        "          INNER JOIN TGFCAB ON (TGFITE.NUNOTA = TGFCAB.NUNOTA) " +
                        "          INNER JOIN (SELECT DISTINCT CODPROD, CONTROLE, DTVAL FROM TGFEST) TGFEST ON (TGFEST.CODPROD = TGFITE.CODPROD AND TGFEST.CONTROLE = TGFITE.CONTROLE) " +
                        "          INNER JOIN TPRROPE ON TGFCAB.NUNOTA = TPRROPE.NUNOTA " +
                        "          INNER JOIN TPRIATV ON (TPRIATV.IDIATV = TPRROPE.IDIATV AND TGFCAB.IDIPROC = TPRIATV.IDIPROC) " +
                        "         WHERE TGFCAB.IDIPROC = {IDIPROC} " +
                        "           AND TGFITE.SEQUENCIA > 0 " +
                        "           AND TGFCAB.TIPMOV <> 'F' " +
                        "           AND NOT EXISTS ( " +
                        "                 SELECT 1 " +
                        "                   FROM TPRAPO APO " +
                        "                   INNER JOIN TPRASP ASP ON (ASP.NUAPO = APO.NUAPO) " +
                        "                   INNER JOIN TPRLSP LSP ON (LSP.CODPRODSP = ASP.CODPRODSP) " +
                        "                  WHERE APO.IDIATV = TPRIATV.IDIATV " +
                        "                    AND LSP.IDEFX = TPRIATV.IDEFX " +
                        "               ) " +
                        "         GROUP BY TGFITE.CODPROD, TGFITE.CONTROLE, TGFEST.DTVAL, TPRIATV.IDEFX " +
                        "       ) X " +
                        "       INNER JOIN TGFPRO PRO ON (PRO.CODPROD = X.CODPRODMP) " +
                        " WHERE X.QTDNEG > 0 " +
                        " GROUP BY X.CODPRODMP, X.CONTROLEMP";

        queryFallback.nativeSelect(sqlMpFallback);

        while (queryFallback.next()) {
            BigDecimal codProdMp = queryFallback.getBigDecimal("CODPRODMP");
            String controleMp = queryFallback.getString("CONTROLEMP");
            BigDecimal qtd = queryFallback.getBigDecimal("QTD");
            String codVol = queryFallback.getString("CODVOL");

            if (codProdMp == null || qtd == null || qtd.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            seqmpAtual = seqmpAtual.add(BigDecimal.ONE);
            inserirItemMP(contexto, nuapo, seqapaFallback, seqmpAtual, codProdMp, controleMp, qtd, codVol);
            mpsCriadas++;
        }

        queryFallback.close();

        if (mpsCriadas > 0) {
            return mpsCriadas;
        }

        QueryExecutor queryRelax = contexto.getQuery();
        queryRelax.setParam("IDIPROC", idiproc);

        String sqlMpRelax =
                "SELECT TGFITE.CODPROD AS CODPRODMP, " +
                        "       TGFITE.CONTROLE AS CONTROLEMP, " +
                        "       SUM(TGFITE.QTDNEG) AS QTD, " +
                        "       COALESCE(MAX(TGFPRO.CODVOL), 'UN') AS CODVOL " +
                        "  FROM TGFITE " +
                        "  INNER JOIN TGFCAB ON (TGFITE.NUNOTA = TGFCAB.NUNOTA) " +
                        "  INNER JOIN TGFPRO ON (TGFPRO.CODPROD = TGFITE.CODPROD) " +
                        " WHERE TGFCAB.IDIPROC = {IDIPROC} " +
                        "   AND TGFITE.SEQUENCIA > 0 " +
                        " GROUP BY TGFITE.CODPROD, TGFITE.CONTROLE";

        queryRelax.nativeSelect(sqlMpRelax);

        while (queryRelax.next()) {
            BigDecimal codProdMp = queryRelax.getBigDecimal("CODPRODMP");
            String controleMp = queryRelax.getString("CONTROLEMP");
            BigDecimal qtd = queryRelax.getBigDecimal("QTD");
            String codVol = queryRelax.getString("CODVOL");

            if (codProdMp == null || qtd == null || qtd.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            seqmpAtual = seqmpAtual.add(BigDecimal.ONE);
            inserirItemMP(contexto, nuapo, seqapaFallback, seqmpAtual, codProdMp, controleMp, qtd, codVol);
            mpsCriadas++;
        }

        queryRelax.close();
        return mpsCriadas;
    }

    private BigDecimal obterIdefxPorIdiatv(ContextoAcao contexto, BigDecimal idiatv) throws Exception {
        if (idiatv == null) {
            return null;
        }
        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIATV", idiatv);
        query.nativeSelect("SELECT IDEFX FROM TPRIATV WHERE IDIATV = {IDIATV}");

        BigDecimal idefx = null;
        if (query.next()) {
            idefx = query.getBigDecimal("IDEFX");
        }

        query.close();
        return idefx;
    }

    private BigDecimal obterIdprocPorIdiproc(ContextoAcao contexto, BigDecimal idiproc) throws Exception {
        if (idiproc == null) {
            return null;
        }

        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);
        query.nativeSelect("SELECT IDPROC FROM TPRIPROC WHERE IDIPROC = {IDIPROC}");

        BigDecimal idproc = null;
        if (query.next()) {
            idproc = query.getBigDecimal("IDPROC");
        }

        query.close();
        return idproc;
    }

    private BigDecimal obterSeqmpBase(ContextoAcao contexto, BigDecimal nuapo) throws Exception {
        QueryExecutor query = contexto.getQuery();
        query.setParam("NUAPO", nuapo);
        query.nativeSelect("SELECT NVL(MAX(SEQMP), 0) AS SEQMP FROM TPRAMP WHERE NUAPO = {NUAPO}");

        BigDecimal seqmp = BigDecimal.ZERO;
        if (query.next()) {
            BigDecimal valor = query.getBigDecimal("SEQMP");
            if (valor != null) {
                seqmp = valor;
            }
        }

        query.close();
        return seqmp;
    }

    private void inserirItemMP(ContextoAcao contexto,
                               BigDecimal nuapo,
                               BigDecimal seqapa,
                               BigDecimal seqmp,
                               BigDecimal codProdMp,
                               String controleMp,
                               BigDecimal qtd,
                               String codVol) throws Exception {

        BigDecimal zero = BigDecimal.ZERO;
        BigDecimal codLocalBaixa = new BigDecimal("101");

        QueryExecutor query = contexto.getQuery();
        query.setParam("CODLOCALBAIXA", codLocalBaixa);
        query.setParam("CODPRODMP", codProdMp);
        query.setParam("CODVOL", codVol != null ? codVol : "UN");
        query.setParam("CONTROLEMP", (controleMp != null && !controleMp.trim().isEmpty()) ? controleMp : " ");
        query.setParam("NUAPO", nuapo);
        query.setParam("QTD", qtd);
        query.setParam("QTDPERDA", zero);
        query.setParam("SEQAPA", seqapa);
        query.setParam("SEQMP", seqmp);
        query.setParam("TIPOUSO", "C");
        query.setParam("VINCULOSERIEPA", "N");

        query.update(
                "INSERT INTO TPRAMP (CODLOCALBAIXA, CODMPE, CODPRODMP, CODVOL, CONTROLEMP, NUAPO, QTD, QTDMPE, QTDPERDA, SEQAPA, SEQMP, TIPOUSO, VINCULOSERIEPA) " +
                        "VALUES ({CODLOCALBAIXA}, NULL, {CODPRODMP}, {CODVOL}, {CONTROLEMP}, {NUAPO}, {QTD}, NULL, {QTDPERDA}, {SEQAPA}, {SEQMP}, {TIPOUSO}, {VINCULOSERIEPA})"
        );
        query.close();
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
