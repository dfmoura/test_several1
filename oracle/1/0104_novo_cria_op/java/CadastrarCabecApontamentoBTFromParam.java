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

            // 2) Obter IDIATV atual do processo (máximo IDIATV para o IDIPROC)
            BigDecimal idiatv = obterIdiatvAtual(contexto, idiproc);
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
            int mpsCriadas = inserirMateriaisMP(contexto, idiproc, nuapo);

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
     * Obter IDIATV atual com base no IDIPROC:
     * SELECT MAX(IDIATV) IDIATV FROM TPRIATV WHERE IDIPROC = ?
     */
    private BigDecimal obterIdiatvAtual(ContextoAcao contexto, BigDecimal idiproc) throws Exception {
        QueryExecutor query = contexto.getQuery();
        query.setParam("IDIPROC", idiproc);
        query.nativeSelect("SELECT NVL(MAX(IDIATV), 0) AS IDIATV FROM TPRIATV WHERE IDIPROC = {IDIPROC}");

        BigDecimal idiatv = null;
        if (query.next()) {
            idiatv = query.getBigDecimal("IDIATV");
        }
        query.close();

        if (idiatv == null || BigDecimal.ZERO.compareTo(idiatv) == 0) {
            contexto.mostraErro("Nenhuma atividade (IDIATV) encontrada para o processo IDIPROC: " + idiproc);
            return null;
        }

        return idiatv;
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
     * Insere registros de matéria-prima em TPRAMP para o NUAPO recém-criado,
     * seguindo o padrão observado nos logs de criarApontamento:
     *
     * - CODLOCALBAIXA = 101 (conforme params dos INSERTs em TPRAMP)
     * - CODMPE = NULL
     * - CODPRODMP, CONTROLEMP, QTD, CODVOL vêm de uma query de apoio de MP
     * - QTDMPE = NULL
     * - QTDPERDA = 0
     * - SEQAPA = 1 (primeiro apontamento de PA gerado nesta rotina)
     * - SEQMP incremental por NUAPO (MAX(SEQMP)+1)
     * - TIPOUSO = 'C'
     * - VINCULOSERIEPA = 'N'
     */
    private int inserirMateriaisMP(ContextoAcao contexto, BigDecimal idiproc, BigDecimal nuapo) throws Exception {
        int mpsCriadas = 0;

        // Considera o SEQAPA gerado como 1 para o primeiro apontamento criado pela rotina.
        // Caso existam outros SEQAPA para o mesmo NUAPO, eles serão respeitados pela consulta de base.
        BigDecimal seqapa = BigDecimal.ONE;

        // Obter SEQMP base existente para o NUAPO (pode já existir MP de outros apontamentos)
        BigDecimal seqmpAtual = obterSeqmpBase(contexto, nuapo);

        // Query de apoio para materiais, baseada nos trechos do log que somam QTD por CODPROD/CONTROLE:
        // Estrutura simplificada que agrega MP por IDIPROC (ajuste pode ser necessário conforme regras).
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

        while (query.next()) {
            BigDecimal codProdMp = query.getBigDecimal("CODPRODMP");
            String controleMp = query.getString("CONTROLEMP");
            BigDecimal qtd = query.getBigDecimal("QTD");
            String codVol = query.getString("CODVOL");

            if (codProdMp == null || qtd == null || qtd.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            seqmpAtual = seqmpAtual.add(BigDecimal.ONE);
            inserirItemMP(contexto, nuapo, seqapa, seqmpAtual, codProdMp, controleMp, qtd, codVol);
            mpsCriadas++;
        }

        query.close();
        return mpsCriadas;
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
        // Algumas regras personalizadas não aceitam CODMPE nulo; usamos 0 como padrão "sem motivo de perda".
        query.setParam("CODMPE", zero);
        query.setParam("CODPRODMP", codProdMp);
        query.setParam("CODVOL", codVol);
        query.setParam("CONTROLEMP", controleMp);
        query.setParam("NUAPO", nuapo);
        query.setParam("QTD", qtd);
        // Algumas regras personalizadas não aceitam QTDMPE nulo; usamos 0 como padrão.
        query.setParam("QTDMPE", zero);
        query.setParam("QTDPERDA", zero);
        query.setParam("SEQAPA", seqapa);
        query.setParam("SEQMP", seqmp);
        query.setParam("TIPOUSO", "C");
        query.setParam("VINCULOSERIEPA", "N");

        query.update(
                "INSERT INTO TPRAMP (CODLOCALBAIXA, CODMPE, CODPRODMP, CODVOL, CONTROLEMP, NUAPO, QTD, QTDMPE, QTDPERDA, SEQAPA, SEQMP, TIPOUSO, VINCULOSERIEPA) " +
                        "VALUES ({CODLOCALBAIXA}, {CODMPE}, {CODPRODMP}, {CODVOL}, {CONTROLEMP}, {NUAPO}, {QTD}, {QTDMPE}, {QTDPERDA}, {SEQAPA}, {SEQMP}, {TIPOUSO}, {VINCULOSERIEPA})"
        );
        query.close();
    }
}