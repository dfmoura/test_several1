package br.com.triggerint.modulos.snk.acoes;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.StringUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.Date;

/**
 * Botão de ação Java para cadastrar um novo apontamento de produção
 * (cabeçalho em TPRAPO e itens de PA em TPRAPA) a partir do IDIPROC,
 * replicando o comportamento do serviço OperacaoProducaoSP.criarApontamento
 * conforme os logs em logs_casdastrar_cabec_apontamento.
 *
 * Fluxo principal:
 * 1) Obter IDIPROC (parâmetro ou linha selecionada).
 * 2) Obter IDIATV atual do processo:
 *    SELECT MAX(IDIATV) IDIATV FROM TPRIATV WHERE IDIPROC = ?
 * 3) Gerar novo NUAPO:
 *    SELECT NVL(MAX(NUAPO),0) + 1 AS PROX_NUAPO FROM TPRAPO
 * 4) Inserir cabeçalho em TPRAPO:
 *    CODUSU = usuário logado, DHAPO = SYSDATE, IDIATV = passo 2,
 *    NUAPO = passo 3, OBSERVACAO = NULL, SITUACAO = 'P'.
 * 5) Inserir item de produto acabado em TPRAPA usando query de apoio
 *    (CODPRODPA, CONTROLEPA, QTDPRODUZIR -> QTDAPONTADA; QTDFAT, QTDFATSP, QTDPERDA = 0):
 *
 *    SELECT TPRIPA.CODPRODPA AS CODPRODPA,
 *           TPRIPA.CONCLUIDO AS CONCLUIDO,
 *           TPRIPA.CONTROLEPA AS CONTROLEPA,
 *           TPRIPA.DTFAB AS DTFAB,
 *           TPRIPA.DTVAL AS DTVAL,
 *           TPRIPA.IDIPROC AS IDIPROC,
 *           TPRIPA.NROLOTE AS NROLOTE,
 *           TPRIPA.QTDPRODUZIR AS QTDPRODUZIR,
 *           TPRIPA.QTDPRODUZIR_ORIGINAL AS QTDPRODUZIR_ORIGINAL,
 *           ( SELECT REFERENCIA FROM TGFPRO PRO WHERE CODPROD = TPRIPA.CODPRODPA) AS REFERENCIA,
 *           ( ... ) AS SALDO
 *      FROM TPRIPA
 *     WHERE TPRIPA.IDIPROC = ?
 *
 * 6) Inserir materiais (matérias-primas) em TPRAMP para o NUAPO/SEQAPA gerados,
 *    seguindo o padrão observado nos logs:
 *
 *    INSERT INTO TPRAMP ( CODLOCALBAIXA,CODMPE,CODPRODMP,CODVOL,CONTROLEMP,NUAPO,
 *                         QTD,QTDMPE,QTDPERDA,SEQAPA,SEQMP,TIPOUSO,VINCULOSERIEPA )
 *    VALUES (101, NULL, <CODPRODMP>, <CODVOL>, <CONTROLEMP>, <NUAPO>,
 *            <QTD>, NULL, 0, <SEQAPA>, <SEQMP>, 'C', 'N');
 *
 *    com SEQAPA = 1 (para o primeiro apontamento de PA criado pela rotina) e SEQMP
 *    incremental por NUAPO (1, 2, 3, ...), conforme exemplos:
 *    - CODPRODMP=23, SEQMP=1
 *    - CODPRODMP=22, SEQMP=2
 *    - CODPRODMP=7,  SEQMP=3
 *    - CODPRODMP=50, SEQMP=4
 *
 *    As quantidades (QTD) e controles (CONTROLEMP) vêm de uma query de apoio de MP.
 */
public class CadastrarCabecApontamentoBTFromParam implements AcaoRotinaJava {

    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("br.com.triggerint.modulos.snk.acoes.CadastrarCabecApontamentoBTFromParam - INICIO");

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
            // 1) Validar processo básico (opcional, mas ajuda a retornar mensagens mais claras)
            query.setParam("IDIPROC", idiproc);
            query.nativeSelect("SELECT IDIPROC, STATUSPROC, NROLOTE FROM TPRIPROC WHERE IDIPROC = {IDIPROC}");

            if (!query.next()) {
                contexto.mostraErro("Processo de produção não encontrado. IDIPROC: " + idiproc);
                return;
            }

            String statusProc = query.getString("STATUSPROC");
            String nroLote = query.getString("NROLOTE");
            query.close();

            if (StringUtils.isEmpty(statusProc)) {
                contexto.mostraErro("Status do processo não definido para IDIPROC: " + idiproc);
                return;
            }

            // 2) Obter IDIATV: primeiro do parâmetro IDIATV (exigido pela regra personalizada CORE_E01128),
            //    depois do processo (MAX(IDIATV) para o IDIPROC).
            BigDecimal idiatv = obterIdiatvDoParamOuProcesso(contexto, idiproc);
            if (idiatv == null) {
                return;
            }

            // 3) Gerar novo NUAPO com base no maior NUAPO existente (similar a IDEIATV em ContinuarProducaoBT)
            BigDecimal nuapo = gerarNovoNuapo(contexto);
            if (nuapo == null) {
                contexto.mostraErro("Não foi possível gerar um novo número de apontamento (NUAPO).");
                return;
            }

            // 4) Inserir cabeçalho em TPRAPO (cadastrar cabeçalho de apontamento)
            inserirCabecalhoApontamento(contexto, codUsu, dataHoraAtual, idiatv, nuapo);

            // 5) Inserir item de PA em TPRAPA, conforme query de apoio (QTDPRODUZIR -> QTDAPONTADA)
            int itensCriados = inserirItensPA(contexto, idiproc, nuapo);

            // 6) Inserir materiais em TPRAMP, seguindo o padrão observado nos logs
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
            System.out.println("Apontamento criado - IDIPROC: " + idiproc + ", NUAPO: " + nuapo + ", Itens PA: " + itensCriados);

        } catch (Exception e) {
            contexto.mostraErro("Erro ao criar apontamento: " + e.getMessage());
            System.out.println("Erro ao criar apontamento: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }

        System.out.println("br.com.triggerint.modulos.snk.acoes.CadastrarCabecApontamentoBTFromParam - FIM");
    }

    /**
     * Obtém IDIPROC: primeiro do parâmetro IDIPROC (chamada via JX.acionarBotao no HTML5),
     * depois da linha selecionada (comportamento em tela nativa).
     */
    private BigDecimal obterIdiproc(ContextoAcao contexto) throws Exception {
        Object param = contexto.getParam("IDIPROC");
        if (param != null) {
            System.out.println("CadastrarCabecApontamentoBTFromParam - Parâmetro IDIPROC recebido: " + param);
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

    /**
     * Obtém IDIATV: primeiro do parâmetro IDIATV (para satisfazer a regra personalizada CORE_E01128
     * que exige "Parâmetro IDIATV é obrigatório para criar o apontamento"); se não informado,
     * obtém do processo: SELECT MAX(IDIATV) FROM TPRIATV WHERE IDIPROC = ?
     * Recomenda-se que o frontend (JX.acionarBotao) envie IDIATV junto com IDIPROC quando disponível.
     */
    private BigDecimal obterIdiatvDoParamOuProcesso(ContextoAcao contexto, BigDecimal idiproc) throws Exception {
        Object paramIdiatv = contexto.getParam("IDIATV");
        if (paramIdiatv != null) {
            BigDecimal idiatv = toBigDecimal(paramIdiatv);
            if (idiatv != null && idiatv.compareTo(BigDecimal.ZERO) > 0) {
                System.out.println("CadastrarCabecApontamentoBTFromParam - Parâmetro IDIATV recebido: " + idiatv);
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

    /**
     * Gera novo NUAPO baseado no maior NUAPO existente:
     * SELECT NVL(MAX(NUAPO),0) + 1 AS PROX_NUAPO FROM TPRAPO
     */
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

    /**
     * Insere o cabeçalho do apontamento em TPRAPO, na situação 'P'.
     */
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
        // Alguns ambientes/regas personalizadas não aceitam parâmetro nulo para OBSERVACAO.
        // Usamos string vazia para representar "sem observação".
        query.setParam("OBSERVACAO", "");
        query.setParam("SITUACAO", "P");

        query.update(
                "INSERT INTO TPRAPO (CODUSU, DHAPO, IDIATV, NUAPO, OBSERVACAO, SITUACAO) " +
                        "VALUES ({CODUSU}, {DHAPO}, {IDIATV}, {NUAPO}, {OBSERVACAO}, {SITUACAO})"
        );
        query.close();
    }

    /**
     * Insere itens de PA (TPRAPA) para o NUAPO recém-criado, usando a query de apoio
     * para obter CODPRODPA, CONTROLEPA e QTDPRODUZIR (-> QTDAPONTADA).
     *
     * Para cada produto retornado:
     * - NUAPO = NUAPO recém-criado
     * - CODMPE = NULL
     * - QTDAPONTADA = QTDPRODUZIR
     * - QTDFAT = 0
     * - QTDFATSP = 0
     * - QTDMPE = 0
     * - QTDPERDA = 0
     * - SEQAPA = MAX(SEQAPA) + 1 por NUAPO
     */
    private int inserirItensPA(ContextoAcao contexto, BigDecimal idiproc, BigDecimal nuapo) throws Exception {
        int itensCriados = 0;

        // Buscar todos os PAs elegíveis para apontamento para este IDIPROC
        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);

        String sqlItensPA =
                "SELECT TPRIPA.CODPRODPA AS CODPRODPA, " +
                        "       TPRIPA.CONTROLEPA AS CONTROLEPA, " +
                        "       TPRIPA.QTDPRODUZIR AS QTDPRODUZIR " +
                        "  FROM TPRIPA " +
                        " WHERE TPRIPA.IDIPROC = {IDIPROC}";

        query.nativeSelect(sqlItensPA);

        // Obter SEQAPA base para este NUAPO
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

    /**
     * Obtém o maior SEQAPA já existente para o NUAPO, para encadear o próximo:
     * SELECT NVL(MAX(SEQAPA), 0) AS SEQAPA FROM TPRAPA WHERE NUAPO = ?
     */
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

    /**
     * Insere um registro em TPRAPA para o NUAPO informado.
     */
    private void inserirItemPA(ContextoAcao contexto,
                               BigDecimal nuapo,
                               BigDecimal seqapa,
                               BigDecimal codProdPa,
                               String controlePa,
                               BigDecimal qtdApontada) throws Exception {

        BigDecimal zero = BigDecimal.ZERO;

        QueryExecutor query = contexto.getQuery();
        // Algumas regras personalizadas não aceitam CODMPE nulo; usamos 0 como padrão "sem motivo de perda".
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

    /**
     * Insere registros de matéria-prima em TPRAMP para o NUAPO recém-criado.
     *
     * A lógica foi reescrita para espelhar de forma mais fiel o comportamento
     * observado nos logs do serviço nativo OperacaoProducaoSP.criarApontamento,
     * utilizando a lista de materiais TPRLMP amarrada ao processo (IDPROC/IDEFX)
     * e ao produto acabado (CODPRODPA/CONTROLEPA) efetivamente apontado em TPRAPA.
     *
     * Para cada item de PA já criado em TPRAPA para o NUAPO:
     *  - obtém a QTDAPONTADA e o SEQAPA;
     *  - calcula as MPs pela query baseada em TPRLMP (QTDMISTURA * QTDAPONTADA para TIPOQTD = 'V');
     *  - insere em TPRAMP com SEQMP incremental por NUAPO.
     */
    private int inserirMateriaisMP(ContextoAcao contexto, BigDecimal idiproc, BigDecimal idiatv, BigDecimal nuapo) throws Exception {
        int mpsCriadas = 0;

        if (idiproc == null || nuapo == null) {
            return 0;
        }

        // IDPROC (processo modelado) e IDEFX (elemento de fluxo) são usados
        // pela mesma query que o serviço nativo utiliza para montar as MPs.
        BigDecimal idproc = obterIdprocPorIdiproc(contexto, idiproc);
        BigDecimal idefx = obterIdefxPorIdiatv(contexto, idiatv);

        if (idproc == null) {
            return 0;
        }
        if (idefx == null) {
            idefx = BigDecimal.ZERO;
        }

        // SEQMP base já existente para o NUAPO (caso haja MPs prévias).
        BigDecimal seqmpAtual = obterSeqmpBase(contexto, nuapo);

        // Percorre os itens de PA já gravados em TPRAPA para este NUAPO.
        QueryExecutor queryApa = contexto.getQuery();
        queryApa.setParam("NUAPO", nuapo);
        queryApa.nativeSelect(
                "SELECT CODPRODPA, CONTROLEPA, QTDAPONTADA, SEQAPA " +
                        "  FROM TPRAPA " +
                        " WHERE NUAPO = {NUAPO}"
        );

        while (queryApa.next()) {
            BigDecimal codProdPa = queryApa.getBigDecimal("CODPRODPA");
            String controlePa = queryApa.getString("CONTROLEPA");
            BigDecimal qtdApontada = queryApa.getBigDecimal("QTDAPONTADA");
            BigDecimal seqapa = queryApa.getBigDecimal("SEQAPA");

            if (codProdPa == null || qtdApontada == null || seqapa == null) {
                continue;
            }

            String controlePaParam = (controlePa == null || controlePa.trim().isEmpty()) ? " " : controlePa.trim();
            String tipoMaterial = "T"; // mesmo parâmetro usado no log: considera MPs normais

            QueryExecutor queryMp = contexto.getQuery();
            queryMp.setParam("CONTROLEPA", controlePaParam);
            queryMp.setParam("QTDAPONTADA", qtdApontada);
            queryMp.setParam("IDPROC", idproc);
            queryMp.setParam("IDEFX", idefx);
            queryMp.setParam("TIPOMAT", tipoMaterial);
            queryMp.setParam("CODPRODPA", codProdPa);
            queryMp.setParam("CONTROLEPA2", controlePaParam);
            queryMp.setParam("CONTROLEPA3", controlePaParam);

            String sqlMpLmp =
                    "SELECT X.CODPRODMP, " +
                            "       X.CONTROLEMP, " +
                            "       SUM(X.QTDMISTURA) AS QTDMISTURA, " +
                            "       X.CODVOL, " +
                            "       X.CODLOCALORIG, " +
                            "       X.TIPOUSOMP, " +
                            "       X.FIXAQTDAPO, " +
                            "       X.TIPOQTD, " +
                            "       X.VINCULOSERIEPA " +
                            "  FROM ( " +
                            "        SELECT LMP.CODPRODMP, " +
                            "               (CASE " +
                            "                   WHEN LMP.TIPOCONTROLEMP = 'L' THEN LMP.CONTROLEMP " +
                            "                   WHEN LMP.TIPOCONTROLEMP = 'H' THEN {CONTROLEPA} " +
                            "                   ELSE ' ' " +
                            "               END) AS CONTROLEMP, " +
                            "               (CASE WHEN LMP.TIPOQTD = 'V' THEN LMP.QTDMISTURA * {QTDAPONTADA} ELSE LMP.QTDMISTURA END) AS QTDMISTURA, " +
                            "               LMP.PROPMPFIXA, " +
                            "               NVL(LMP.CODVOL, PRO.CODVOL) AS CODVOL, " +
                            "               LMP.CODLOCALORIG, " +
                            "               LMP.TIPOUSOMP, " +
                            "               LMP.FIXAQTDAPO, " +
                            "               LMP.TIPOQTD, " +
                            "               NVL(LMP.VINCULOSERIEPA, 'N') AS VINCULOSERIEPA " +
                            "          FROM TPRLMP LMP " +
                            "          INNER JOIN TPREFX EFX ON (EFX.IDEFX = LMP.IDEFX) " +
                            "          INNER JOIN TPRATV ATV ON (ATV.IDEFX = LMP.IDEFX) " +
                            "          INNER JOIN TGFPRO PRO ON (PRO.CODPROD = LMP.CODPRODMP) " +
                            "         WHERE EFX.IDPROC = {IDPROC} " +
                            "           AND (({IDEFX} = 0 AND ATV.LISTAMPPADRAO = 'S') OR ({IDEFX} > 0 AND ATV.IDEFX = {IDEFX})) " +
                            "           AND ({TIPOMAT} = 'T' OR LMP.GERAREQUISICAO = {TIPOMAT}) " +
                            "           AND LMP.CODPRODPA = {CODPRODPA} " +
                            "           AND LMP.TIPOUSOMP IN ('N') " +
                            "           AND ( " +
                            "                 (NVL(LMP.CONTROLEPA, ' ') <> ' ' AND NVL(LMP.CONTROLEPA, ' ') = {CONTROLEPA2}) " +
                            "                 OR (NVL(LMP.CONTROLEPA, ' ') = ' ' AND NOT EXISTS ( " +
                            "                        SELECT 1 " +
                            "                          FROM TPRLMP LMP2 " +
                            "                         WHERE LMP2.IDEFX = LMP.IDEFX " +
                            "                           AND LMP2.CODPRODPA = LMP.CODPRODPA " +
                            "                           AND NVL(LMP2.CONTROLEPA, ' ') = {CONTROLEPA3} " +
                            "                           AND LMP2.CODPRODMP = LMP.CODPRODMP " +
                            "                           AND LMP2.CONTROLEMP = LMP.CONTROLEMP " +
                            "                           AND LMP2.SEQMP <> LMP.SEQMP " +
                            "                     ) " +
                            "                 ) " +
                            "             ) " +
                            "        ) X " +
                            " GROUP BY X.CODPRODMP, X.PROPMPFIXA, X.CONTROLEMP, X.CODVOL, X.CODLOCALORIG, X.TIPOUSOMP, X.FIXAQTDAPO, X.TIPOQTD, X.VINCULOSERIEPA";

            queryMp.nativeSelect(sqlMpLmp);

            while (queryMp.next()) {
                BigDecimal codProdMp = queryMp.getBigDecimal("CODPRODMP");
                String controleMp = queryMp.getString("CONTROLEMP");
                BigDecimal qtd = queryMp.getBigDecimal("QTDMISTURA");
                String codVol = queryMp.getString("CODVOL");

                if (codProdMp == null || qtd == null || qtd.compareTo(BigDecimal.ZERO) == 0) {
                    continue;
                }

                seqmpAtual = seqmpAtual.add(BigDecimal.ONE);
                inserirItemMP(contexto, nuapo, seqapa, seqmpAtual, codProdMp, controleMp, qtd, codVol);
                mpsCriadas++;
            }

            queryMp.close();
        }

        queryApa.close();
        return mpsCriadas;
    }

    /**
     * Obtém o IDEFX (elemento de fluxo) associado a um IDIATV.
     * Usado para espelhar a lógica nativa de montagem de MPs.
     */
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

    /**
     * Obtém o IDPROC (processo modelado) a partir do IDIPROC (instância do processo).
     */
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

    /**
     * Obtém o maior SEQMP já existente para o NUAPO:
     * SELECT NVL(MAX(SEQMP), 0) AS SEQMP FROM TPRAMP WHERE NUAPO = ?
     */
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

    /**
     * Insere um registro em TPRAMP para o NUAPO/SEQAPA informado.
     */
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
        query.setParam("CONTROLEMP", controleMp);
        query.setParam("NUAPO", nuapo);
        query.setParam("QTD", qtd);
        query.setParam("QTDPERDA", zero);
        query.setParam("SEQAPA", seqapa);
        query.setParam("SEQMP", seqmp);
        query.setParam("TIPOUSO", "C");
        query.setParam("VINCULOSERIEPA", "N");

        // Conforme logs (OperacaoProducaoSP.criarApontamento): CODMPE e QTDMPE = NULL em TPRAMP
        query.update(
                "INSERT INTO TPRAMP (CODLOCALBAIXA, CODMPE, CODPRODMP, CODVOL, CONTROLEMP, NUAPO, QTD, QTDMPE, QTDPERDA, SEQAPA, SEQMP, TIPOUSO, VINCULOSERIEPA) " +
                        "VALUES ({CODLOCALBAIXA}, NULL, {CODPRODMP}, {CODVOL}, {CONTROLEMP}, {NUAPO}, {QTD}, NULL, {QTDPERDA}, {SEQAPA}, {SEQMP}, {TIPOUSO}, {VINCULOSERIEPA})"
        );
        query.close();
    }
}