//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by Fernflower decompiler)
//

package br.com.sankhya.mgeprod.model.helper;

import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.bmp.PersistentLocalEntity;
import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.jape.util.FinderWrapper;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.EntityVO;
import br.com.sankhya.jape.wrapper.JapeFactory;
import br.com.sankhya.jape.wrapper.JapeWrapper;
import br.com.sankhya.jape.wrapper.fluid.FluidUpdateVO;
import br.com.sankhya.mgeprod.model.engine.ActivitiProcessEngine;
import br.com.sankhya.mgeprod.model.lancamento.SubProdutoLancamentoOPBean;
import br.com.sankhya.mgeprod.model.utils.ActivitiUtils;
import br.com.sankhya.mgeprod.model.utils.ProdutoControle;
import br.com.sankhya.modelcore.auth.AuthenticationInfo;
import br.com.sankhya.modelcore.comercial.ComercialUtils;
import br.com.sankhya.modelcore.comercial.centrais.CACHelper;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;
import br.com.sankhya.modelcore.util.I18nServerSideBundle;
import br.com.sankhya.util.troubleshooting.SKError;
import br.com.sankhya.util.troubleshooting.TSLevel;
import br.com.sankhya.ws.ServiceCanceledException;
import br.com.sankhya.ws.ServiceContext;
import com.sankhya.util.JdbcUtils;
import com.sankhya.util.StringFormat;
import com.sankhya.util.StringUtils;
import com.sankhya.util.TimeUtils;
import com.sankhya.util.XMLUtils;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.security.InvalidParameterException;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import javax.ejb.FinderException;
import javax.ejb.ObjectNotFoundException;
import org.jdom.Document;
import org.jdom.Element;
import org.jdom.output.XMLOutputter;

public class ControleProcessoHelper {
    JdbcWrapper jdbc;
    private static final String BPMN20_XML_FILE_EXTENSION = ".bpmn20.xml";
    private static final String TIPO_SERIE_AUTOMATICA = "A";
    private static final String TIPO_SERIE_MANUAL_LANCAMENTO = "L";
    private static final String TIPO_SERIE_AUTOMATICA_GLOBAL = "G";
    private static final String MASCARA_SERIE_AUTOMATICA_GLOBAL = "AAA#A##MMYY";
    private Map<BigDecimal, BigDecimal> mapSeqCop = new HashMap();
    private JapeWrapper cabecalhoInstanciaProcessoDAO;

    public ControleProcessoHelper(JdbcWrapper jdbc) {
        this.jdbc = jdbc;
        this.cabecalhoInstanciaProcessoDAO = JapeFactory.dao("CabecalhoInstanciaProcesso");
    }

    public Collection<DynamicVO> getPAsInstanciaProcesso(BigDecimal idiproc) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        FinderWrapper finder = null;
        finder = new FinderWrapper("ProdutoAcabadoAProduzir", "this.IDIPROC = ? ", idiproc);
        return dwfEntityFacade.findByDynamicFinderAsVO(finder);
    }

    public static BigDecimal getIDIPROCByIDWFLOW(String idwflow) {
        return (BigDecimal)ActivitiProcessEngine.getInstance().getProcessVariable(idwflow, "IDIPROC");
    }

    public BigDecimal getIDPROCByIDWFLOW(String idwflow) throws Exception {
        BigDecimal idproc = null;
        NativeSql queInstanciaProcesso = null;
        ResultSet rs = null;

        try {
            queInstanciaProcesso = new NativeSql(this.jdbc);
            queInstanciaProcesso.appendSql("SELECT IDPROC ");
            queInstanciaProcesso.appendSql("FROM TPRIPROC ");
            queInstanciaProcesso.appendSql("WHERE IDWFLOW = :IDWFLOW ");
            queInstanciaProcesso.setNamedParameter("IDWFLOW", idwflow);
            rs = queInstanciaProcesso.executeQuery();
            if (rs.next()) {
                idproc = rs.getBigDecimal("IDPROC");
            }
        } finally {
            JdbcUtils.closeResultSet(rs);
            NativeSql.releaseResources(queInstanciaProcesso);
        }

        return idproc;
    }

    private BigDecimal getUltimaVersaoProcesso(BigDecimal codPrc) throws Exception {
        BigDecimal lastVersion = null;
        NativeSql queVersao = null;
        ResultSet rset = null;

        try {
            queVersao = new NativeSql(this.jdbc);
            queVersao.appendSql("SELECT PRC.VERSAO ");
            queVersao.appendSql("FROM TPRPRC PRC ");
            queVersao.appendSql("INNER JOIN( ");
            queVersao.appendSql("    SELECT CODPRC, max(VERSAO) VERSAO ");
            queVersao.appendSql("    FROM TPRPRC ");
            queVersao.appendSql("    GROUP BY CODPRC ");
            queVersao.appendSql(") X ON PRC.CODPRC = X.CODPRC AND PRC.VERSAO = X.VERSAO ");
            queVersao.appendSql("WHERE PRC.CODPRC = :CODPRC AND ");
            queVersao.appendSql("PRC.XMLBPMN IS NOT NULL");
            queVersao.setNamedParameter("CODPRC", codPrc);
            rset = queVersao.executeQuery();
            if (rset.next()) {
                lastVersion = rset.getBigDecimal("VERSAO");
            }
        } finally {
            JdbcUtils.closeResultSet(rset);
            NativeSql.releaseResources(queVersao);
        }

        return lastVersion;
    }

    private BigDecimal getIdVersaoMaisRecenteProcesso(BigDecimal codPrc) throws Exception {
        BigDecimal idProc = null;
        NativeSql queIdProc = null;
        ResultSet rset = null;

        try {
            queIdProc = new NativeSql(this.jdbc);
            queIdProc.appendSql(" SELECT PRC.IDPRC AS IDPROC ");
            queIdProc.appendSql(" FROM TPRPRC PRC ");
            queIdProc.appendSql(" INNER JOIN( ");
            queIdProc.appendSql("     SELECT CODPRC, max(VERSAO) VERSAO ");
            queIdProc.appendSql("     FROM TPRPRC ");
            queIdProc.appendSql("     GROUP BY CODPRC ");
            queIdProc.appendSql(" ) X ON PRC.CODPRC = X.CODPRC AND PRC.VERSAO = X.VERSAO ");
            queIdProc.appendSql(" WHERE PRC.CODPRC = :CODPRC ");
            queIdProc.setNamedParameter("CODPRC", codPrc);
            rset = queIdProc.executeQuery();
            if (rset.next()) {
                idProc = rset.getBigDecimal("IDPROC");
            }
        } finally {
            JdbcUtils.closeResultSet(rset);
            NativeSql.releaseResources(queIdProc);
        }

        return idProc;
    }

    public BigDecimal getIdVersaoNaoDeployed(BigDecimal codPrc) throws Exception {
        BigDecimal idProcesso = null;
        NativeSql queUlitimaVersao = null;
        ResultSet rset = null;

        try {
            queUlitimaVersao = new NativeSql(this.jdbc);
            queUlitimaVersao.appendSql("SELECT IDPRC FROM TPRPRC PRC ");
            queUlitimaVersao.appendSql("WHERE CODPRC = :CODPRC AND ");
            queUlitimaVersao.appendSql("PRC.XMLBPMN IS NULL");
            queUlitimaVersao.setNamedParameter("CODPRC", codPrc);
            rset = queUlitimaVersao.executeQuery();
            if (rset.next()) {
                idProcesso = rset.getBigDecimal("VERSAO");
            }
        } finally {
            JdbcUtils.closeResultSet(rset);
            NativeSql.releaseResources(queUlitimaVersao);
        }

        return idProcesso;
    }

    public BigDecimal getCodEmpInstanciaProcesso(BigDecimal idiproc) {
        BigDecimal codemp = null;
        NativeSql queProc = null;
        ResultSet rs = null;

        try {
            queProc = new NativeSql(this.jdbc);
            queProc.appendSql("SELECT TPRPLP.CODEMP ");
            queProc.appendSql("FROM TPRIPROC JOIN TPRPLP ON (TPRIPROC.CODPLP = TPRPLP.CODPLP) ");
            queProc.appendSql("WHERE TPRIPROC.IDIPROC = :IDIPROC ");
            queProc.setNamedParameter("IDIPROC", idiproc);
            rs = queProc.executeQuery();
            if (rs.next()) {
                codemp = rs.getBigDecimal("CODEMP");
            }
        } catch (Exception var9) {
            System.out.println("instância de processo sem CODEMP associado.");
        } finally {
            JdbcUtils.closeResultSet(rs);
            NativeSql.releaseResources(queProc);
        }

        return codemp;
    }

    private BigDecimal getMaiorPrioridadeAtiva() throws Exception {
        BigDecimal prioridade = BigDecimal.ONE;
        NativeSql queProc = null;
        ResultSet rs = null;

        try {
            queProc = new NativeSql(this.jdbc);
            queProc.appendSql("SELECT MAX(PRIORIDADE) AS PRIORIDADE ");
            queProc.appendSql("FROM TPRIPROC ");
            queProc.appendSql("WHERE STATUSPROC NOT IN (:STATUS_CANCELADO, :STATUS_CANCELANDO, :STATUS_FINALIZADO) ");
            queProc.setNamedParameter("STATUS_CANCELADO", "C");
            queProc.setNamedParameter("STATUS_CANCELANDO", "C2");
            queProc.setNamedParameter("STATUS_FINALIZADO", "F");
            rs = queProc.executeQuery();
            if (rs.next()) {
                prioridade = rs.getBigDecimal("PRIORIDADE");
                if (prioridade == null) {
                    prioridade = BigDecimal.ONE;
                }
            }
        } finally {
            JdbcUtils.closeResultSet(rs);
            NativeSql.releaseResources(queProc);
        }

        return prioridade;
    }

    public static boolean isMultipleOf(BigDecimal multiple, BigDecimal base) {
        if (multiple.compareTo(base) == 0) {
            return true;
        } else {
            try {
                multiple.divide(base, 0, 7);
                return true;
            } catch (ArithmeticException var3) {
                return false;
            }
        }
    }

    public BigDecimal instanciaOrdemProducao(BigDecimal codplp, BigDecimal idproc, List<ItemProducaoPA> listaPA, Map<BigDecimal, BigDecimal> mapAlocacoesWC, HashMap<BigDecimal, BigDecimal> mapTerceirosPorAtividade, boolean aguardarSubOP, BigDecimal numps, BigDecimal nunota, HashMap<ProdutoControle, List<MaterialAlternativoBean>> materialAlternativo, BigDecimal nulop, BigDecimal seqnota, BigDecimal seqOP, BigDecimal codParc, Collection<SubProdutoLancamentoOPBean> subProdutos) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        DynamicVO processoProdutivoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ProcessoProdutivo", idproc);
        boolean ignorarProcessoAlocacao = JapeSession.getPropertyAsBoolean("br.com.sankhya.mgeprod.ignorar.processo.alocacao.centro.trabalho", Boolean.FALSE);
        this.validarProcessoProdutivo(processoProdutivoVO);
        if (!ignorarProcessoAlocacao) {
            this.validaAlocacaoDeWorkCenter(codplp, processoProdutivoVO, mapAlocacoesWC);
        }

        this.validaProdutosAcabados(processoProdutivoVO, listaPA);
        String tipoIncia = processoProdutivoVO.asString("TIPOINICIA");
        if (codplp == null) {
            codplp = processoProdutivoVO.asBigDecimal("CODPLP");
        }

        DynamicVO cabecalhoInstanciaProcessoVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("CabecalhoInstanciaProcesso");
        cabecalhoInstanciaProcessoVO.setProperty("IDPROC", idproc);
        cabecalhoInstanciaProcessoVO.setProperty("NUMPS", numps);
        cabecalhoInstanciaProcessoVO.setProperty("CODPLP", codplp);
        cabecalhoInstanciaProcessoVO.setProperty("STATUSPROC", "R");
        cabecalhoInstanciaProcessoVO.setProperty("CODUSUINC", AuthenticationInfo.getCurrent().getUserID());
        cabecalhoInstanciaProcessoVO.setProperty("PRIORIDADE", this.getMaiorPrioridadeAtiva().add(BigDecimal.ONE));
        cabecalhoInstanciaProcessoVO.setProperty("NROLOTE", ((ItemProducaoPA)listaPA.get(0)).numLote);
        cabecalhoInstanciaProcessoVO.setProperty("NUNOTA", nunota);
        cabecalhoInstanciaProcessoVO.setProperty("SEQNOTA", seqnota);
        cabecalhoInstanciaProcessoVO.setProperty("CODPARC", codParc);
        DynamicVO ilopVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ItemDeLancamentoDeOP", new Object[]{nulop, seqOP});
        cabecalhoInstanciaProcessoVO.setProperty("DTPREVENT", ilopVO.asTimestamp("DTPREVENT"));
        cabecalhoInstanciaProcessoVO.setProperty("DTINICIOMAX", ilopVO.asTimestamp("DTINICIOMAX"));
        cabecalhoInstanciaProcessoVO.setProperty("TEMPOATRAVESS", ilopVO.asBigDecimal("TEMPOATRAVESS"));
        BigDecimal codParcTerc = (BigDecimal)mapTerceirosPorAtividade.get(BigDecimal.ZERO);
        if (codParcTerc != null) {
            cabecalhoInstanciaProcessoVO.setProperty("CODPARCTERC", codParcTerc);
        }

        entityFacade.createEntity("CabecalhoInstanciaProcesso", (EntityVO)cabecalhoInstanciaProcessoVO);
        BigDecimal idiproc = cabecalhoInstanciaProcessoVO.asBigDecimal("IDIPROC");
        this.buildInstanciaItemNota(nulop, seqOP, idiproc);
        BigDecimal idIcop = this.buildInstanciaCoProduto(nulop, seqOP, idiproc);
        if (idIcop != null) {
            DynamicVO iProcVO = this.cabecalhoInstanciaProcessoDAO.findByPK(new Object[]{idiproc});
            FluidUpdateVO updateIprocVO = this.cabecalhoInstanciaProcessoDAO.prepareToUpdate(iProcVO);
            updateIprocVO.set("IDICOP", idIcop);
            updateIprocVO.update();
        }

        boolean processoProdutivoUsaLoteCuringa = "MN".equals(processoProdutivoVO.asString("TIPONROLOTE")) && StringUtils.isNotEmpty(processoProdutivoVO.asString("LOTECURINGA"));

        for(ItemProducaoPA itemProducaoPA : listaPA) {
            DynamicVO produtoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("Produto", itemProducaoPA.codProd);
            boolean isControladoPorLote = "L".equals(produtoVO.asString("TIPCONTEST"));
            DynamicVO produtoAcabadoVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("ProdutoAcabadoAProduzir");
            produtoAcabadoVO.setProperty("IDIPROC", idiproc);
            produtoAcabadoVO.setProperty("CODPRODPA", itemProducaoPA.codProd);
            produtoAcabadoVO.setProperty("CONTROLEPA", processoProdutivoUsaLoteCuringa && isControladoPorLote ? itemProducaoPA.numLote : itemProducaoPA.controle);
            produtoAcabadoVO.setProperty("QTDPRODUZIR", itemProducaoPA.qtdLote);
            produtoAcabadoVO.setProperty("QTDPRODUZIR_ORIGINAL", itemProducaoPA.qtdLoteOriginal);
            produtoAcabadoVO.setProperty("NROLOTE", itemProducaoPA.numLote);
            produtoAcabadoVO.setProperty("CONCLUIDO", "N");
            entityFacade.createEntity("ProdutoAcabadoAProduzir", (EntityVO)produtoAcabadoVO);
            this.gerarNroSeriePA(idiproc, idproc, itemProducaoPA, itemProducaoPA.qtdLote, ((ItemProducaoPA)listaPA.get(0)).numLote, nulop, seqOP);
        }

        if (!materialAlternativo.isEmpty()) {
            JapeSession.putProperty("br.com.sankhya.mgeprod.lancamento.material.alternativo", seqOP);
            this.lancarMaterialAnternativo(entityFacade, idiproc, listaPA, materialAlternativo, nulop, processoProdutivoUsaLoteCuringa);
        }

        if (!ignorarProcessoAlocacao) {
            Set<BigDecimal> processadosAlocWC = new HashSet();

            for(Map.Entry<BigDecimal, BigDecimal> alocacaoWC : mapAlocacoesWC.entrySet()) {
                if (!processadosAlocWC.contains(alocacaoWC.getKey())) {
                    processadosAlocWC.add(alocacaoWC.getKey());

                    for(DynamicVO voAtv : entityFacade.findByDynamicFinderAsVO(new FinderWrapper("Atividade", "this.IDPROC = ? AND this.IDAWC = ? ", new Object[]{idproc, alocacaoWC.getKey()}))) {
                        DynamicVO workCenterPorProcessoVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("WorkCenterPorInstanciaProcesso");
                        workCenterPorProcessoVO.setProperty("IDIPROC", idiproc);
                        workCenterPorProcessoVO.setProperty("IDAWC", alocacaoWC.getKey());
                        workCenterPorProcessoVO.setProperty("CODWCP", alocacaoWC.getValue());
                        workCenterPorProcessoVO.setProperty("IDEFX", voAtv.asBigDecimal("IDEFX"));
                        entityFacade.createEntity("WorkCenterPorInstanciaProcesso", (EntityVO)workCenterPorProcessoVO);
                    }
                }
            }
        }

        for(Map.Entry<BigDecimal, BigDecimal> entry : mapTerceirosPorAtividade.entrySet()) {
            BigDecimal idEfx = (BigDecimal)entry.getKey();
            codParcTerc = (BigDecimal)entry.getValue();
            if (codParcTerc != null) {
                DynamicVO terceiroPorAtividadeVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("TerceiroAtividade");
                terceiroPorAtividadeVO.setProperty("IDIPROC", idiproc);
                terceiroPorAtividadeVO.setProperty("IDEFX", idEfx);
                terceiroPorAtividadeVO.setProperty("CODPARCTERC", codParcTerc);
                entityFacade.createEntity("TerceiroAtividade", (EntityVO)terceiroPorAtividadeVO);
                Collection<DynamicVO> atividadePreProcesso = entityFacade.findByDynamicFinderAsVO(new FinderWrapper("ElementoFluxo", "this.IDPROC = ? AND this.TIPO = ?", new Object[]{idproc, new BigDecimal(1111)}));
                if (atividadePreProcesso.size() > 0) {
                    DynamicVO terceiroPorAtiviVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("TerceiroAtividade");
                    terceiroPorAtividadeVO.setProperty("IDIPROC", idiproc);
                    idEfx = ((DynamicVO)atividadePreProcesso.iterator().next()).asBigDecimal("IDEFX");
                    terceiroPorAtividadeVO.setProperty("IDEFX", idEfx);
                    terceiroPorAtividadeVO.setProperty("CODPARCTERC", codParcTerc);
                    entityFacade.createEntity("TerceiroAtividade", (EntityVO)terceiroPorAtividadeVO);
                }
            }
        }

        boolean usaConfiguracaoNroLoteSubProduto = "S".equals(processoProdutivoVO.asString("USACONFNROLOTESP"));
        if (usaConfiguracaoNroLoteSubProduto) {
            for(SubProdutoLancamentoOPBean subProduto : subProdutos) {
                DynamicVO instanciaSubProdutoVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("InstanciaSubProduto");
                instanciaSubProdutoVO.setProperty("IDIPROC", idiproc);
                instanciaSubProdutoVO.setProperty("IDEFX", subProduto.getIdefx());
                instanciaSubProdutoVO.setProperty("SEQLSP", subProduto.getSeqLSP());
                instanciaSubProdutoVO.setProperty("CODPRODPA", subProduto.getCodprodPA());
                instanciaSubProdutoVO.setProperty("CONTROLEPA", subProduto.getControlePA());
                instanciaSubProdutoVO.setProperty("CODPRODSP", subProduto.getCodprodSP());
                instanciaSubProdutoVO.setProperty("CONTROLESP", subProduto.getControleSP());
                instanciaSubProdutoVO.setProperty("NROLOTE", subProduto.getNrolote());
                entityFacade.createEntity("InstanciaSubProduto", (EntityVO)instanciaSubProdutoVO);
            }
        }

        if (!JapeSession.getPropertyAsBoolean("br.com.sankhya.mgeprod.ignorar.inicio.automatico.op", Boolean.FALSE)) {
            JapeSession.putProperty("br.com.sankhya.mgeprod.instanciando.ordem.producao.seqop", seqOP);
            this.executaOperacoesEstoquePreProcesso(idproc, idiproc);
        }

        if ("I".equals(tipoIncia) && !JapeSession.getPropertyAsBoolean("br.com.sankhya.mgeprod.ignorar.inicio.automatico.op", Boolean.FALSE) && !aguardarSubOP) {
            this.iniciaOrdemDeProducao(idiproc);
        }

        return idiproc;
    }

    private void buildInstanciaItemNota(BigDecimal nulop, BigDecimal seqOP, BigDecimal idiproc) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        Collection<DynamicVO> itemNotaLancamentoOPVO = entityFacade.findByDynamicFinderAsVO(new FinderWrapper("ItemLancamentoOPItemNota", "this.NULOP = ? AND this.SEQOP = ?", new Object[]{nulop, seqOP}));
        if (!itemNotaLancamentoOPVO.isEmpty()) {
            for(DynamicVO item : itemNotaLancamentoOPVO) {
                DynamicVO instanciaItemNota = (DynamicVO)entityFacade.getDefaultValueObjectInstance("InstanciaItemNota");
                instanciaItemNota.setProperty("IDIPROC", idiproc);
                instanciaItemNota.setProperty("NUNOTA", item.asBigDecimal("NUNOTA"));
                instanciaItemNota.setProperty("SEQNOTA", item.asBigDecimal("SEQNOTA"));
                instanciaItemNota.setProperty("DTPREVENT", item.asTimestamp("DTPREVENT"));
                entityFacade.createEntity("InstanciaItemNota", (EntityVO)instanciaItemNota);
            }
        }

    }

    private void validarProcessoProdutivo(DynamicVO processoProdutivoVO) throws Exception {
        if ("S".equals(processoProdutivoVO.asString("TIPOPROC"))) {
            BigDecimal codigoProcesso = processoProdutivoVO.asBigDecimal("CODPRC");
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00449", new Exception("Não é possível iniciar subprocessos manualmente. (Processo Código " + codigoProcesso + ")"));
        } else if (processoProdutivoVO.getProperty("XMLBPMN") == null) {
            BigDecimal codigoProcesso = processoProdutivoVO.asBigDecimal("CODPRC");
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00450", new Exception("Não é possível iniciar processos que não foram publicados. (Processo Código " + codigoProcesso + ")"));
        }
    }

    private void validaProdutosAcabados(DynamicVO processoProdutivoVO, List<ItemProducaoPA> listaPA) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        BigDecimal idproc = processoProdutivoVO.asBigDecimal("IDPROC");
        BigDecimal codigoProcesso = processoProdutivoVO.asBigDecimal("CODPRC");
        if (listaPA != null && listaPA.size() != 0) {
            Boolean multiControle = "S".equals(processoProdutivoVO.asString("MULTICONTROLE"));
            if (listaPA.size() > 1) {
                if (!multiControle) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00452", new Exception("Processo não permite múltiplos PAs. (Processo Código " + codigoProcesso + ")"));
                }

                BigDecimal codProd = ((ItemProducaoPA)listaPA.get(0)).codProd;

                for(ItemProducaoPA itemProducaoPA : listaPA) {
                    if (!itemProducaoPA.codProd.equals(codProd)) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00453", new Exception("Processo permite múltiplos controles do mesmo PA, porém foram informados PAs diferentes. (Processo Código " + codigoProcesso + ")"));
                    }
                }
            }

            boolean processoEhMultiControle = "S".equals(processoProdutivoVO.asString("MULTICONTROLE"));
            if (processoEhMultiControle) {
                BigDecimal codprod = null;

                for(ItemProducaoPA itemProducao : listaPA) {
                    if (codprod == null) {
                        codprod = itemProducao.codProd;
                    } else if (codprod.compareTo(itemProducao.codProd) != 0) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00455", new Exception("O processo não suporta múltiplos PA, apenas múltiplos Produtos do mesmo tipo com controles diferentes. (Processo Código " + codigoProcesso + ")"));
                    }
                }
            } else if (listaPA.size() > 1) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00454", new Exception("O processo não suporta múltiplos PA. (Processo Código " + codigoProcesso + ")"));
            }

            for(ItemProducaoPA itemProducao : listaPA) {
                if (itemProducao.qtdLote.compareTo(BigDecimal.ZERO) <= 0) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00459", new Exception("Não é possível iniciar Processo Produtivo para produzir um lote de tamanho 0. (Processo Código " + codigoProcesso + ")"));
                }

                DynamicVO produtoAcabadoVO = null;

                try {
                    produtoAcabadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idproc, itemProducao.codProd, itemProducao.controle});
                } catch (ObjectNotFoundException var14) {
                    try {
                        produtoAcabadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idproc, itemProducao.codProd, " "});
                    } catch (ObjectNotFoundException var13) {
                    }
                }

                if (produtoAcabadoVO == null) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00458", new Exception("O processo " + codigoProcesso + " não está configurado para produzir o produto " + itemProducao.codProd + (StringUtils.getEmptyAsNull(itemProducao.controle) != null ? " (" + itemProducao.controle + ")" : "")));
                }

                BigDecimal multiploLote = produtoAcabadoVO.asBigDecimal("MULTIDEAL");
                BigDecimal loteMinimo = produtoAcabadoVO.asBigDecimal("QTDPRODMIN");
                if (itemProducao.qtdLote.compareTo(loteMinimo) < 0) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00457", new Exception("Não é possível iniciar Processo Produtivo para produzir um lote menor que o mínimo permitido. (Processo Código " + codigoProcesso + ")"));
                }

                if (multiploLote.compareTo(BigDecimal.ZERO) != 0 && !isMultipleOf(itemProducao.qtdLote, multiploLote)) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00456", new Exception("Não é possível iniciar Processo Produtivo para produzir um lote que não seja múltiplo do Múltiplo Ideal definido para o produto. (Processo Código " + codigoProcesso + ", Produto " + itemProducao.codProd + ")"));
                }
            }

        } else {
            throw (InvalidParameterException)SKError.registry(TSLevel.ERROR, "PROD_E00451", new InvalidParameterException("Não é possível iniciar um processo produtivo sem produtos acabados."));
        }
    }

    private void validaAlocacaoDeWorkCenter(BigDecimal codplp, DynamicVO processoProdutivoVO, Map<BigDecimal, BigDecimal> mapAlocacoesWC) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        BigDecimal codigoProcesso = processoProdutivoVO.asBigDecimal("CODPRC");
        BigDecimal idproc = processoProdutivoVO.asBigDecimal("IDPROC");

        for(DynamicVO alocacao : entityFacade.findByDynamicFinderAsVO(new FinderWrapper("AlocacaoWorkCenterProcesso", "this.IDPROC = ?", new Object[]{idproc}))) {
            String tipoAlocacao = alocacao.asString("TIPALOCACAO");
            BigDecimal categoriaWCAlocacao = alocacao.asBigDecimal("CODCWC");
            BigDecimal idawc = alocacao.asBigDecimal("IDAWC");
            BigDecimal wcSelecionado = (BigDecimal)mapAlocacoesWC.get(idawc);
            if (wcSelecionado == null) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00460", new Exception("Centro de Trabalho não informado para a alocação " + idawc + " (Cód.Proc.Produtivo " + codigoProcesso + "). Verifique se as alocações de centro de trabalho desse processo são compatíveis com a planta de manufatura selecionada (Cód.Planta = " + codplp + ")."));
            }

            if ("E".equals(tipoAlocacao)) {
                categoriaWCAlocacao = alocacao.asDymamicVO("WorkCenter").asBigDecimal("CODCWC");
                DynamicVO workCenterSelecionadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("WorkCenter", wcSelecionado);
                if (workCenterSelecionadoVO != null && !workCenterSelecionadoVO.asBigDecimal("CODCWC").equals(categoriaWCAlocacao)) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00461", new Exception("O Centro de Trabalho " + wcSelecionado + " não pertence à categoria de Centro de Trabalho " + categoriaWCAlocacao + " necessária para o Processo " + codigoProcesso));
                }
            } else if ("P".equals(tipoAlocacao)) {
                DynamicVO categoriaWCVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("CategoriaWorkCenter", categoriaWCAlocacao);
                BigDecimal codigoWCPadraoCategoria = categoriaWCVO.asBigDecimal("CODWCPPADRAO");
                if (codigoWCPadraoCategoria == null) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00463", new Exception("Centro de Trabalho Padrão não definido para a categoria " + categoriaWCAlocacao + " (Processo Código " + codigoProcesso + ")"));
                }

                if (!codigoWCPadraoCategoria.equals(wcSelecionado)) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00462", new Exception("Processo configurado para utilizar o Centro de Trabalho padrão da categoria, porém o Centro de Trabalho informado é diferente do padrão da categoria " + categoriaWCAlocacao + " (Processo Código " + codigoProcesso + ")"));
                }
            } else {
                DynamicVO workCenterSelecionadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("WorkCenter", wcSelecionado);
                if (!workCenterSelecionadoVO.asBigDecimal("CODCWC").equals(categoriaWCAlocacao)) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00461", new Exception("O Centro de Trabalho " + wcSelecionado + " não pertence à categoria de Centro de Trabalho " + categoriaWCAlocacao + " necessária para o Processo " + codigoProcesso));
                }
            }
        }

    }

    private void executaOperacoesEstoquePreProcesso(BigDecimal idproc, BigDecimal idiproc) throws Exception {
        OperacoesEstoqueHelper operacoesEstoqueHelper = new OperacoesEstoqueHelper(this.jdbc);
        operacoesEstoqueHelper.executarOperacoesEstoquePreProcesso(idproc, idiproc);
    }

    public void iniciaOrdemDeProducao(BigDecimal idiproc) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        PersistentLocalEntity entityCipPLE = entityFacade.findEntityByPrimaryKey("CabecalhoInstanciaProcesso", idiproc);
        DynamicVO cabecalhoInstanciaProcessoVO = (DynamicVO)entityCipPLE.getValueObject();
        String statusproc = cabecalhoInstanciaProcessoVO.asString("STATUSPROC");
        if (!"C".equals(statusproc) && !"C2".equals(statusproc)) {
            if ("S2".equals(statusproc)) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00466", new Exception(I18nServerSideBundle.getString("msgErroOrdemProdEmSuspensão", ControleProcessoHelper.class, new Object[]{idiproc})));
            } else if ("F".equals(statusproc)) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00465", new Exception(I18nServerSideBundle.getString("msgErroOrdemProdFinalizada", ControleProcessoHelper.class, new Object[]{idiproc})));
            } else if ("A".equals(statusproc)) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00464", new Exception(I18nServerSideBundle.getString("msgErroOrdemProdJaIniciada", ControleProcessoHelper.class, new Object[]{idiproc})));
            } else {
                BigDecimal idproc = cabecalhoInstanciaProcessoVO.asBigDecimal("IDPROC");
                if (!"S".equals(statusproc)) {
                    this.iniciaRepositorioInicialProcesso(idproc, idiproc);
                }

                for(PersistentLocalEntity produtoAcababoAProduzirEntity : entityFacade.findByDynamicFinder(new FinderWrapper("ProdutoAcabadoAProduzir", "this.IDIPROC = ?", new Object[]{idiproc}))) {
                    DynamicVO produtoAcabadoAProduzirVO = (DynamicVO)produtoAcababoAProduzirEntity.getValueObject();
                    DynamicVO produtoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{produtoAcabadoAProduzirVO.asBigDecimal("CODPRODPA")});
                    DynamicVO produtoAcabadoVO = null;

                    try {
                        produtoAcabadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idproc, produtoAcabadoAProduzirVO.asBigDecimal("CODPRODPA"), ComercialUtils.trimControleEstoque(produtoAcabadoAProduzirVO.asString("CONTROLEPA"))});
                    } catch (FinderException var15) {
                        produtoAcabadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idproc, produtoAcabadoAProduzirVO.asBigDecimal("CODPRODPA"), " "});
                    }

                    if (produtoVO.asBoolean("USALOTEDTVAL") && "I".equals(produtoAcabadoVO.asString("BASCALCDTVAL"))) {
                        Timestamp dtVal = new Timestamp(TimeUtils.add(TimeUtils.getNow().getTime(), produtoVO.asInt("PRAZOVAL"), 5));
                        produtoAcabadoAProduzirVO.setProperty("DTVAL", TimeUtils.clearTime(dtVal));
                    }

                    if (produtoVO.asBoolean("USALOTEDTFAB") && "I".equals(produtoAcabadoVO.asString("BASCALCDTVAL"))) {
                        produtoAcabadoAProduzirVO.setProperty("DTFAB", TimeUtils.clearTime(TimeUtils.getNow()));
                    }

                    produtoAcababoAProduzirEntity.setValueObject((EntityVO)produtoAcabadoAProduzirVO);
                }

                for(PersistentLocalEntity instanciaSubProdutoEntity : entityFacade.findByDynamicFinder(new FinderWrapper("InstanciaSubProduto", "this.IDIPROC = ?", new Object[]{idiproc}))) {
                    DynamicVO instanciaSubProdutoVO = (DynamicVO)instanciaSubProdutoEntity.getValueObject();
                    DynamicVO produtoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{instanciaSubProdutoVO.asBigDecimal("CODPRODSP")});
                    DynamicVO subProdutoVO = null;
                    subProdutoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ListaSubprodutos", new Object[]{instanciaSubProdutoVO.asBigDecimal("IDEFX"), instanciaSubProdutoVO.asBigDecimal("SEQLSP")});
                    if (produtoVO.asBoolean("USALOTEDTVAL") && "I".equals(subProdutoVO.asString("BASCALCDTVALSP"))) {
                        Timestamp dtVal = new Timestamp(TimeUtils.add(TimeUtils.getNow().getTime(), produtoVO.asInt("PRAZOVAL"), 5));
                        instanciaSubProdutoVO.setProperty("DTVAL", TimeUtils.clearTime(dtVal));
                    }

                    if (produtoVO.asBoolean("USALOTEDTFAB") && "I".equals(subProdutoVO.asString("BASCALCDTVALSP"))) {
                        instanciaSubProdutoVO.setProperty("DTFAB", TimeUtils.clearTime(TimeUtils.getNow()));
                    }

                    instanciaSubProdutoEntity.setValueObject((EntityVO)instanciaSubProdutoVO);
                }

                if ("S".equals(statusproc)) {
                    cabecalhoInstanciaProcessoVO.setProperty("STATUSPROC", "A");
                    entityCipPLE.setValueObject((EntityVO)cabecalhoInstanciaProcessoVO);
                    String activitiProcessId = ActivitiUtils.getIDWFLOWbyIDIPROC(idiproc);
                    ActivitiProcessEngine.getInstance().activateProcessInstance(activitiProcessId);
                } else {
                    String activitiProcessId = ActivitiUtils.converteSkwToActivitiProcessId(idproc);
                    if (!ActivitiProcessEngine.getInstance().processHasBeenDeployed(activitiProcessId)) {
                        this.deployProcesso(idproc);
                    }

                    String idwflow = ActivitiProcessEngine.getInstance().startProcessByKey(activitiProcessId, idiproc);
                    this.registraInicioDeProcesso(idwflow, idiproc);
                }

                this.finalizarTodaExecucaoSuspensa(idiproc);
            }
        } else {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00467", new Exception(I18nServerSideBundle.getString("msgErroOrdemProdCancelada", ControleProcessoHelper.class, new Object[]{idiproc})));
        }
    }

    private void iniciaRepositorioInicialProcesso(BigDecimal idproc, BigDecimal idiproc) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        PersistentLocalEntity entityProcessoPLE = entityFacade.findEntityByPrimaryKey("ProcessoProdutivo", idproc);
        DynamicVO instanciaProcessoVO = (DynamicVO)entityProcessoPLE.getValueObject();
        BigDecimal idRPAInicial = instanciaProcessoVO.asBigDecimal("IDRPAINICIAL");
        if (idRPAInicial != null) {
            Collection<DynamicVO> listaPAsProcesso = this.getPAsInstanciaProcesso(idiproc);
            HashMap<ProdutoControle, BigDecimal> quantidadesPorProdControle = new HashMap();

            for(DynamicVO dynamicVO : listaPAsProcesso) {
                ProdutoControle produtoControle = new ProdutoControle(dynamicVO.asBigDecimal("CODPRODPA"), dynamicVO.asString("CONTROLEPA"));
                quantidadesPorProdControle.put(produtoControle, dynamicVO.asBigDecimal("QTDPRODUZIR"));
            }

            ControleRepositorioPAHelper repositorioPAHelper = new ControleRepositorioPAHelper(this.jdbc);
            repositorioPAHelper.iniciaRepositorioProcesso(idRPAInicial, quantidadesPorProdControle, idiproc);
        }
    }

    public void registraInicioDeProcesso(String idwflow, BigDecimal idiproc) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        PersistentLocalEntity entityCIPLocalEntity = entityFacade.findEntityByPrimaryKey("CabecalhoInstanciaProcesso", idiproc);
        DynamicVO cabecalhoInstanciaProcessoVO = (DynamicVO)entityCIPLocalEntity.getValueObject();
        cabecalhoInstanciaProcessoVO.setProperty("IDWFLOW", idwflow);
        if (!InicializacaoAutomaticaHelper.isInclusaoDataManual(idiproc)) {
            cabecalhoInstanciaProcessoVO.setProperty("DHINST", TimeUtils.getNow());
        }

        if (!cabecalhoInstanciaProcessoVO.asString("STATUSPROC").equals("F")) {
            cabecalhoInstanciaProcessoVO.setProperty("STATUSPROC", "A");
        }

        entityCIPLocalEntity.setValueObject((EntityVO)cabecalhoInstanciaProcessoVO);
    }

    public BigDecimal deployProcesso(BigDecimal idPrc) throws Exception {
        String deployedVersion = null;
        GeradorXMLActivitiHelper helper = GeradorXMLActivitiHelper.getInstance();
        Element processXMLElement = helper.buildXML(idPrc, this.jdbc);
        if (processXMLElement != null) {
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            PersistentLocalEntity pleProcessoProdutivo = dwfEntityFacade.findEntityByPrimaryKey("ProcessoProdutivo", idPrc);
            DynamicVO elementoVO = (DynamicVO)pleProcessoProdutivo.getValueObject();
            BigDecimal codPrc = elementoVO.asBigDecimal("CODPRC");
            elementoVO.setProperty("XMLBPMN", XMLUtils.elementToString(processXMLElement).toCharArray());
            pleProcessoProdutivo.setValueObject((EntityVO)elementoVO);
            deployedVersion = ActivitiProcessEngine.getInstance().deployProcess(this.elementToInputStream(processXMLElement), codPrc.toString() + ".bpmn20.xml");
        }

        return deployedVersion == null ? BigDecimal.ZERO : new BigDecimal(deployedVersion);
    }

    private byte[] elementToByteArray(Element element) {
        Document document = new Document();
        document.setContent(element);
        XMLOutputter outputter = new XMLOutputter();
        return outputter.outputString(element).getBytes(Charset.forName("UTF-8"));
    }

    private InputStream elementToInputStream(Element element) {
        byte[] nodeBytes = this.elementToByteArray(element);
        return new ByteArrayInputStream(nodeBytes);
    }

    public void registraFimDeProcesso(BigDecimal idiproc, Timestamp endTimestamp) throws Exception {
        this.processarPerdaUltimoApontamento(this.jdbc, idiproc);
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        PersistentLocalEntity entityCIPLocalEntity = entityFacade.findEntityByPrimaryKey("CabecalhoInstanciaProcesso", idiproc);
        DynamicVO cabecalhoInstanciaProcessoVO = (DynamicVO)entityCIPLocalEntity.getValueObject();
        cabecalhoInstanciaProcessoVO.setProperty("DHTERMINO", endTimestamp);
        cabecalhoInstanciaProcessoVO.setProperty("STATUSPROC", "F");
        cabecalhoInstanciaProcessoVO.setProperty("CODUSUFINAL", AuthenticationInfo.getCurrent().getUserID());
        entityCIPLocalEntity.setValueObject((EntityVO)cabecalhoInstanciaProcessoVO);
        this.marcarItemPedidoReservaNaoPendente(idiproc);
    }

    private void marcarItemPedidoReservaNaoPendente(BigDecimal idIproc) throws Exception {
        EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
        NativeSql queItensPendentesPedidosReserva = null;
        ResultSet rset = null;

        try {
            queItensPendentesPedidosReserva = new NativeSql(dwfFacade.getJdbcWrapper(), this.getClass(), "ControleProcessoHelper_queItensPendentesPedidosReserva.sql");
            queItensPendentesPedidosReserva.setNamedParameter("IDIPROC", idIproc);
            rset = queItensPendentesPedidosReserva.executeQuery();

            while(rset.next()) {
                try {
                    PersistentLocalEntity itemNotaEntity = dwfFacade.findEntityByPrimaryKey("ItemNota", new Object[]{rset.getBigDecimal("NUNOTA"), rset.getBigDecimal("SEQUENCIA")});
                    DynamicVO itemNotaVO = (DynamicVO)itemNotaEntity.getValueObject();
                    itemNotaVO.setProperty("PENDENTE", "N");
                    itemNotaEntity.setValueObject((EntityVO)itemNotaVO);
                } catch (FinderException var10) {
                }
            }
        } finally {
            JdbcUtils.closeResultSet(rset);
            NativeSql.releaseResources(queItensPendentesPedidosReserva);
        }

    }

    public void atualizaStatusProcesso(BigDecimal idiproc, String statusProc) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        PersistentLocalEntity entityCipPLE = entityFacade.findEntityByPrimaryKey("CabecalhoInstanciaProcesso", idiproc);
        DynamicVO cabecalhoInstanciaProcessoVO = (DynamicVO)entityCipPLE.getValueObject();
        cabecalhoInstanciaProcessoVO.setProperty("STATUSPROC", statusProc);
        entityCipPLE.setValueObject((EntityVO)cabecalhoInstanciaProcessoVO);
    }

    public void suspenderOrdemDeProducao(BigDecimal idiproc, boolean isValidarUsoCentroTrabalho) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        PersistentLocalEntity entityCipPLE = entityFacade.findEntityByPrimaryKey("CabecalhoInstanciaProcesso", idiproc);
        DynamicVO cabecalhoInstanciaProcessoVO = (DynamicVO)entityCipPLE.getValueObject();
        String statusproc = cabecalhoInstanciaProcessoVO.asString("STATUSPROC");
        if ("S".equals(statusproc)) {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00468", new Exception("Ordem de produção " + idiproc + " já está suspensa."));
        } else if (!"A".equals(statusproc)) {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00469", new Exception("Ordem de produção " + idiproc + " não está em andamento."));
        } else {
            cabecalhoInstanciaProcessoVO.setProperty("STATUSPROC", "S");
            entityCipPLE.setValueObject((EntityVO)cabecalhoInstanciaProcessoVO);
            String activitiProcessId = ActivitiUtils.getIDWFLOWbyIDIPROC(idiproc);
            if (activitiProcessId != null) {
                ActivitiProcessEngine.getInstance().suspendProcessInstance(activitiProcessId);
            }

            this.liberarCentroDeTrabalhoAoSuspender(idiproc, isValidarUsoCentroTrabalho);
            this.pararExecucaoAtualECriarExecucaoSuspensa(idiproc);
        }
    }

    public void cancelarOrdemDeProducao(BigDecimal idiproc) throws Exception {
        this.cancelarOrdemDeProducao(idiproc, (ServiceContext)null);
    }

    public void cancelarOrdemDeProducao(final BigDecimal idiproc, ServiceContext ctx) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        PersistentLocalEntity entityCipPLE = entityFacade.findEntityByPrimaryKey("CabecalhoInstanciaProcesso", idiproc);
        DynamicVO cabecalhoInstanciaProcessoVO = (DynamicVO)entityCipPLE.getValueObject();
        String statusproc = cabecalhoInstanciaProcessoVO.asString("STATUSPROC");
        if ("F".equals(statusproc)) {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00472", new Exception(I18nServerSideBundle.getString("msgErroOrdemProdFinalizada", ControleProcessoHelper.class, new Object[]{idiproc})));
        } else if (!"C".equals(statusproc) && !"C2".equals(statusproc)) {
            if ("S".equals(statusproc)) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00470", new Exception(I18nServerSideBundle.getString("msgErroOrdemProdSuspensaNaoCancelavel", ControleProcessoHelper.class, new Object[]{idiproc})));
            } else {
                cabecalhoInstanciaProcessoVO.setProperty("DHTERMINO", TimeUtils.getNow());
                cabecalhoInstanciaProcessoVO.setProperty("STATUSPROC", "C");
                entityCipPLE.setValueObject((EntityVO)cabecalhoInstanciaProcessoVO);
                StringBuffer whereOperacoesEstoque = new StringBuffer();
                whereOperacoesEstoque.append(" EXISTS( ");
                whereOperacoesEstoque.append("                SELECT 1 ");
                whereOperacoesEstoque.append("                    FROM TPROEST OEST , TPRIATV IATV ");
                whereOperacoesEstoque.append("                    INNER JOIN TPRIPROC IPROC ON (IPROC.IDIPROC = IATV.IDIPROC) ");
                whereOperacoesEstoque.append("                    WHERE IATV.IDIATV = this.IDIATV  ");
                whereOperacoesEstoque.append("                        AND OEST.IDEFX = this.IDEFX AND OEST.SEQOPER = this.SEQOPER ");
                whereOperacoesEstoque.append("                        AND IPROC.IDIPROC = ? ");
                whereOperacoesEstoque.append("                        AND OEST.ANULAOPEREST = 'S' )");
                Element ordensElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "ordens");
                Element param = XMLUtils.getChild(ordensElem, "clientEventParams");
                boolean deleteNotaConfirmada = false;
                if (param != null) {
                    deleteNotaConfirmada = XMLUtils.getAttributeAsBoolean(param, "deleteNotaConfirmada");
                }

                FinderWrapper finder = new FinderWrapper("RegistroOperacaoEstoque", whereOperacoesEstoque.toString(), new Object[]{idiproc});
                finder.setOrderBy("IDIATV DESC, NUNOTA DESC");
                Collection<PersistentLocalEntity> registrosOperacoesEstoque = entityFacade.findByDynamicFinder(finder);
                Element notas = null;
                if (!registrosOperacoesEstoque.isEmpty()) {
                    notas = new Element("notas");
                }

                ArrayList<BigDecimal> notasEletronicasConfirmadas = new ArrayList();
                Set<BigDecimal> setNuNota = new HashSet();

                for(PersistentLocalEntity registrosOPEntity : registrosOperacoesEstoque) {
                    DynamicVO operacaoEstoqueVO = (DynamicVO)registrosOPEntity.getValueObject();
                    DynamicVO cabVO = operacaoEstoqueVO.asDymamicVO("CabecalhoNota");
                    if (cabVO != null) {
                        BigDecimal nuNota = operacaoEstoqueVO.asBigDecimal("NUNOTA");
                        if ("L".equals(cabVO.asString("STATUSNOTA"))) {
                            if (!ComercialUtils.ehNFE(cabVO) && !ComercialUtils.ehNFSE(cabVO) && !ComercialUtils.ehCTE(cabVO)) {
                                if (param == null) {
                                    ctx.addClientEvent("br.com.mgeprod.clientEvent.cancelaOP.deleteNotaConfirmada", new Element("event"));
                                    throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00473", new ServiceCanceledException());
                                }

                                if (deleteNotaConfirmada && !setNuNota.contains(nuNota)) {
                                    setNuNota.add(nuNota);
                                    Element nota = new Element("nota");
                                    XMLUtils.addAttributeElement(nota, "NUNOTA", nuNota);
                                    notas.addContent(nota);
                                }
                            } else {
                                notasEletronicasConfirmadas.add(cabVO.asBigDecimal("NUNOTA"));
                            }
                        } else if (!setNuNota.contains(nuNota)) {
                            setNuNota.add(nuNota);
                            Element nota = new Element("nota");
                            XMLUtils.addAttributeElement(nota, "NUNOTA", nuNota);
                            notas.addContent(nota);
                        }
                    }

                    registrosOPEntity.remove();
                }

                if (!notasEletronicasConfirmadas.isEmpty()) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00474", new Exception(String.format("Não é possível cancelar a OP, pois alguns dos documentos %s gerados é um documento eletrônico (NF-e, NFS-e ou CT-e), cancele esses documentos antes de cancelar a OP.", notasEletronicasConfirmadas.toString())));
                } else {
                    if (notas != null) {
                        ctx.getRequestBody().addContent(notas);
                        CACHelper cacHelper = new CACHelper();
                        cacHelper.excluirNotas(ctx);
                        ctx.getRequestBody().removeContent(notas);
                    }

                    String activitiProcessId = ActivitiUtils.getIDWFLOWbyIDIPROC(idiproc);
                    if (activitiProcessId != null) {
                        try {
                            ActivitiProcessEngine.getInstance().cancelProcessInstance(activitiProcessId);
                        } catch (Exception var22) {
                            System.out.println("Erro na activiti 'runtimeService.suspendProcessInstanceById' ao cancelar Ordem de Producao.");
                            JapeSession.execWithAutonomousTX(new JapeSession.NewTXBody() {
                                public Object run() throws Exception {
                                    EntityFacadeFactory.getDWFFacade().removeByCriteria(new FinderWrapper("InstanciaAtividade", "this.IDIPROC = ?", new Object[]{idiproc}));
                                    return null;
                                }
                            });
                        }
                    }

                    for(PersistentLocalEntity historicoWCEntity : entityFacade.findByDynamicFinder(new FinderWrapper("HistoricoWorkCenterAtividade", "this.IDIPROC = ? ", new Object[]{idiproc}))) {
                        DynamicVO historicoWCVO = (DynamicVO)historicoWCEntity.getValueObject();
                        if (historicoWCVO.asTimestamp("DHLIBALOC") == null) {
                            if (!JapeSession.getPropertyAsBoolean("br.com.sankhya.mgeprod.libera.wc", false)) {
                                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.libera.wc", (Element)null);
                                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00473", new ServiceCanceledException());
                            }

                            historicoWCVO.setProperty("DHLIBALOC", TimeUtils.getNow());
                            historicoWCVO.setProperty("CODUSULIBALOC", AuthenticationInfo.getCurrent().getUserID());
                            historicoWCEntity.setValueObject((EntityVO)historicoWCVO);
                        }
                    }

                    entityFacade.removeByCriteria(new FinderWrapper("DependenciaEntreOps", "this.IDIPROCPA = ?", new Object[]{idiproc}));
                    entityFacade.removeByCriteria(new FinderWrapper("DependenciaEntreOps", "this.IDIPROCPI = ?", new Object[]{idiproc}));
                    ProducaoHelper.getInstance().deletaPesagemVolumeNaoUtilizados(idiproc);
                }
            }
        } else {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00471", new Exception(I18nServerSideBundle.getString("msgErroOrdemProdCancelada", ControleProcessoHelper.class, new Object[]{idiproc})));
        }
    }

    private void lancarMaterialAnternativo(EntityFacade entityFacade, BigDecimal idiproc, List<ItemProducaoPA> listaPA, HashMap<ProdutoControle, List<MaterialAlternativoBean>> materialAlternativo, BigDecimal nulop, boolean processoProdutivoUsaLoteCuringa) throws Exception {
        if (!materialAlternativo.isEmpty()) {
            List<ProdutoControle> materiasPrimaPorPA = new ArrayList();
            ExtratoMateriaisHelper helper = new ExtratoMateriaisHelper(this.jdbc);

            try {
                for(ItemProducaoPA itemProducaoPA : listaPA) {
                    ProdutoControle produtoPA = new ProdutoControle(itemProducaoPA.codProd, itemProducaoPA.controle);

                    for(MaterialAlternativoBean mp : (List)materialAlternativo.get(produtoPA)) {
                        DynamicVO itemMpAlternativa = (DynamicVO)entityFacade.getDefaultValueObjectInstance("ItemMateriaPrimaAlternativa");
                        itemMpAlternativa.setProperty("IDIPROC", idiproc);
                        itemMpAlternativa.setProperty("CODPRODPA", itemProducaoPA.codProd);
                        itemMpAlternativa.setProperty("CONTROLEPA", itemProducaoPA.controle);
                        itemMpAlternativa.setProperty("CODPRODMP", mp.getMateriaPrima().getCodProd());
                        itemMpAlternativa.setProperty("CONTROLEMP", mp.getMateriaPrima().getControle());
                        itemMpAlternativa.setProperty("CODPRODMPALT", mp.getMaterialSubstituido().getCodProd());
                        itemMpAlternativa.setProperty("CONTROLEMPALT", mp.getMaterialSubstituido().getControle());
                        itemMpAlternativa.setProperty("QTDMISTURA", mp.getQtdMistura());
                        itemMpAlternativa.setProperty("ORDEM", mp.getOrdem());
                        entityFacade.createEntity("ItemMateriaPrimaAlternativa", (EntityVO)itemMpAlternativa);
                        if (!materiasPrimaPorPA.contains(mp.getMateriaPrima())) {
                            materiasPrimaPorPA.add(mp.getMateriaPrima());
                        }
                    }

                    for(ProdutoControle materiaPrima : materiasPrimaPorPA) {
                        BigDecimal qtdUsar = helper.getQtdUsarMateriaPrima(nulop, produtoPA, materiaPrima);
                        if (qtdUsar.doubleValue() > (double)0.0F) {
                            DynamicVO itemMpAlternativa = (DynamicVO)entityFacade.getDefaultValueObjectInstance("ItemMateriaPrimaAlternativa");
                            itemMpAlternativa.setProperty("IDIPROC", idiproc);
                            itemMpAlternativa.setProperty("CODPRODPA", produtoPA.getCodProd());
                            itemMpAlternativa.setProperty("CONTROLEPA", produtoPA.getControleOrEmpty());
                            itemMpAlternativa.setProperty("CODPRODMP", materiaPrima.getCodProd());
                            itemMpAlternativa.setProperty("CONTROLEMP", materiaPrima.getControle());
                            itemMpAlternativa.setProperty("CODPRODMPALT", materiaPrima.getCodProd());
                            itemMpAlternativa.setProperty("CONTROLEMPALT", materiaPrima.getControle());
                            itemMpAlternativa.setProperty("ORDEM", BigDecimal.ZERO);
                            itemMpAlternativa.setProperty("QTDMISTURA", qtdUsar);
                            itemMpAlternativa.setProperty("QTDFATNOTA", BigDecimal.ZERO);
                            entityFacade.createEntity("ItemMateriaPrimaAlternativa", (EntityVO)itemMpAlternativa);
                        }
                    }
                }
            } finally {
                ExtratoMateriaisHelper.releaseResources(helper);
            }

        }
    }

    private void processarPerdaUltimoApontamento(JdbcWrapper jdbc, BigDecimal idiproc) throws Exception {
        NativeSql query = null;
        RedimensionamentoLoteHelper helper = null;

        try {
            helper = RedimensionamentoLoteHelper.getInstance();
            helper.setXmlEventRedimensionarPA((Element)JapeSession.getProperty("br.com.sankhya.mgeprod.redimensionar.op.pa.perda"));
            query = new NativeSql(jdbc, this.getClass(), "ControleProcessoHelper_queBuscaQtdTotalPerdaOP.sql");
            query.setNamedParameter("IDIPROC", idiproc);
            ResultSet rset = query.executeQuery();

            while(rset.next()) {
                if (rset.getDouble("QTDPERDA") > (double)0.0F) {
                    helper.redimensionar(idiproc, rset.getBigDecimal("CODPRODPA"), rset.getString("CONTROLEPA"), rset.getBigDecimal("QTDPERDA"), true);
                }
            }

            rset.close();
        } finally {
            RedimensionamentoLoteHelper.releaseResources(helper);
            NativeSql.releaseResources(query);
        }

    }

    private HashMap<String, String> verificaNroSerie(ItemProducaoPA itemProducaoPA) throws Exception {
        HashMap<String, String> seriesPA = new HashMap();
        ResultSet rsetCountSeriesProdutoAcabado = null;
        NativeSql sqlCountSeriesProdutoAcabado = null;

        HashMap var5;
        try {
            sqlCountSeriesProdutoAcabado = new NativeSql(this.jdbc);
            sqlCountSeriesProdutoAcabado.appendSql(" SELECT SERIEPA AS SERIEPA  ");
            sqlCountSeriesProdutoAcabado.appendSql(" FROM TPRSERPA WHERE CODPRODPA = :CODPRODPA ");
            sqlCountSeriesProdutoAcabado.setNamedParameter("CODPRODPA", itemProducaoPA.codProd);
            rsetCountSeriesProdutoAcabado = sqlCountSeriesProdutoAcabado.executeQuery();

            while(rsetCountSeriesProdutoAcabado.next()) {
                seriesPA.put(rsetCountSeriesProdutoAcabado.getString("SERIEPA"), rsetCountSeriesProdutoAcabado.getString("SERIEPA"));
            }

            var5 = seriesPA;
        } finally {
            NativeSql.releaseResources(sqlCountSeriesProdutoAcabado);
            JdbcUtils.closeResultSet(rsetCountSeriesProdutoAcabado);
        }

        return var5;
    }

    private void gerarNroSeriePA(BigDecimal idIproc, BigDecimal idProc, ItemProducaoPA itemProducaoPA, BigDecimal qtdProduzir, String nroLoteOP, BigDecimal nulop, BigDecimal seqOP) throws Exception {
        EntityFacade entityFacade = EntityFacadeFactory.getDWFFacade();
        DynamicVO produtoAcabadoVO = null;

        try {
            produtoAcabadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idProc, itemProducaoPA.codProd, ComercialUtils.trimControleEstoque(itemProducaoPA.controle)});
        } catch (Exception var17) {
            produtoAcabadoVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idProc, itemProducaoPA.codProd, " "});
        }

        if ("A".equals(produtoAcabadoVO.asString("TIPOGERASERIE"))) {
            String mascSerie = produtoAcabadoVO.asString("MASCSERIE");
            HashMap<String, String> seriesPA = this.verificaNroSerie(itemProducaoPA);
            if (StringUtils.isEmpty(mascSerie)) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00475", new Exception("Máscara para série não cadastrada para o produto: " + produtoAcabadoVO.asLong("CODPRODPA")));
            }

            if (mascSerie.indexOf(76) > -1) {
                String mascNroLoteOP = mascSerie.substring(mascSerie.indexOf(76), mascSerie.lastIndexOf(76) + 1);
                String convertMascNroLoteToZero = mascNroLoteOP.replace("L", "0");
                String formatedNroLoteOP = (convertMascNroLoteToZero + nroLoteOP).substring(nroLoteOP.length());
                mascSerie = mascSerie.replaceAll(mascNroLoteOP, formatedNroLoteOP);
            }

            int qtdSeriesExistentePorProdutoAcadado = this.getQtdSeriesExistentesPorProdutoAcabado(itemProducaoPA);

            for(int i = 1; i <= qtdProduzir.intValue(); ++i) {
                StringFormat sf = new StringFormat();
                sf.setPattern(mascSerie + "%rev%");
                sf.setDefaultChar('0');
                ++qtdSeriesExistentePorProdutoAcadado;

                String nroSerie;
                for(nroSerie = sf.format(String.valueOf(qtdSeriesExistentePorProdutoAcadado)); seriesPA.containsValue(nroSerie); nroSerie = sf.format(String.valueOf(qtdSeriesExistentePorProdutoAcadado))) {
                    ++qtdSeriesExistentePorProdutoAcadado;
                }

                DynamicVO serieProdutoAcabadoVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("SerieProdutoAcabado");
                serieProdutoAcabadoVO.setProperty("IDIPROC", idIproc);
                serieProdutoAcabadoVO.setProperty("CODPRODPA", itemProducaoPA.codProd);
                serieProdutoAcabadoVO.setProperty("SERIEPA", nroSerie);
                serieProdutoAcabadoVO.setProperty("PERDA", "N");
                serieProdutoAcabadoVO.setProperty("LIBERADO", "N");
                entityFacade.createEntity("SerieProdutoAcabado", (EntityVO)serieProdutoAcabadoVO);
            }
        } else if ("L".equals(produtoAcabadoVO.asString("TIPOGERASERIE"))) {
            for(DynamicVO serieLancamentoOPVO : entityFacade.findByDynamicFinderAsVO(new FinderWrapper("SerieLancamentoOP", "this.NULOP = ? AND this.SEQOP = ? AND this.CODPRODPA = ?", new Object[]{nulop, seqOP, itemProducaoPA.codProd}))) {
                DynamicVO serieProdutoAcabadoVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("SerieProdutoAcabado");
                serieProdutoAcabadoVO.setProperty("IDIPROC", idIproc);
                serieProdutoAcabadoVO.setProperty("CODPRODPA", serieLancamentoOPVO.asBigDecimal("CODPRODPA"));
                serieProdutoAcabadoVO.setProperty("SERIEPA", serieLancamentoOPVO.asString("SERIEPA"));
                serieProdutoAcabadoVO.setProperty("PERDA", "N");
                serieProdutoAcabadoVO.setProperty("LIBERADO", "N");
                entityFacade.createEntity("SerieProdutoAcabado", (EntityVO)serieProdutoAcabadoVO);
            }

            entityFacade.removeByCriteria(new FinderWrapper("SerieLancamentoOP", "this.NULOP = ? AND this.SEQOP = ? AND this.CODPRODPA = ?", new Object[]{nulop, seqOP, itemProducaoPA.codProd}));
        } else if ("G".equals(produtoAcabadoVO.asString("TIPOGERASERIE"))) {
            for(int i = 1; i <= qtdProduzir.intValue(); ++i) {
                String nroSerie = this.geraNumeroSerieUnicoPA();
                DynamicVO serieProdutoAcabadoVO = (DynamicVO)entityFacade.getDefaultValueObjectInstance("SerieProdutoAcabado");
                serieProdutoAcabadoVO.setProperty("IDIPROC", idIproc);
                serieProdutoAcabadoVO.setProperty("CODPRODPA", itemProducaoPA.codProd);
                serieProdutoAcabadoVO.setProperty("SERIEPA", nroSerie);
                serieProdutoAcabadoVO.setProperty("PERDA", "N");
                serieProdutoAcabadoVO.setProperty("LIBERADO", "N");
                entityFacade.createEntity("SerieProdutoAcabado", (EntityVO)serieProdutoAcabadoVO);
            }
        }

    }

    private String geraNumeroSerieUnicoPA() throws Exception {
        char[] letras = new char[]{'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'};
        char[] numeros = new char[]{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9'};
        String randomValues = "AAA#A##MMYY".substring("AAA#A##MMYY".indexOf("A"), "AAA#A##MMYY".lastIndexOf("#") + 1);
        char[] arrayValues = randomValues.toCharArray();
        Random random = new Random();
        boolean nroSerieJaExiste = true;
        String nroSerie = "";

        while(nroSerieJaExiste) {
            for(int j = 0; j < arrayValues.length; ++j) {
                if (arrayValues[j] == 'A') {
                    int index = random.nextInt(letras.length);
                    nroSerie = nroSerie + letras[index];
                } else if (arrayValues[j] == '#') {
                    int index = random.nextInt(numeros.length);
                    nroSerie = nroSerie + numeros[index];
                }
            }

            Timestamp dataDeHoje = new Timestamp(System.currentTimeMillis());
            String anoMasc = StringUtils.formatTimestamp(dataDeHoje, "YY");
            String mesMasc = StringUtils.formatTimestamp(dataDeHoje, "MM");
            nroSerie = nroSerie + mesMasc + anoMasc;
            ResultSet rsetSerieProdutoAcabado = null;
            NativeSql sqlSerieProdutoAcabado = null;

            try {
                sqlSerieProdutoAcabado = new NativeSql(this.jdbc);
                sqlSerieProdutoAcabado.appendSql("SELECT CODPRODPA, SERIEPA FROM TPRSERPA WHERE SERIEPA = :SERIEPA ");
                sqlSerieProdutoAcabado.setNamedParameter("SERIEPA", nroSerie);
                sqlSerieProdutoAcabado.setReuseStatements(true);
                rsetSerieProdutoAcabado = sqlSerieProdutoAcabado.executeQuery();
                if (rsetSerieProdutoAcabado.next()) {
                    nroSerie = "";
                } else {
                    nroSerieJaExiste = false;
                }
            } finally {
                NativeSql.releaseResources(sqlSerieProdutoAcabado);
                JdbcUtils.closeResultSet(rsetSerieProdutoAcabado);
            }
        }

        return nroSerie;
    }

    private int getQtdSeriesExistentesPorProdutoAcabado(ItemProducaoPA itemProducaoPA) throws Exception {
        int countSerie = 0;
        ResultSet rsetCountSeriesProdutoAcabado = null;
        NativeSql sqlCountSeriesProdutoAcabado = null;

        int var5;
        try {
            sqlCountSeriesProdutoAcabado = new NativeSql(this.jdbc);
            sqlCountSeriesProdutoAcabado.appendSql(" SELECT COUNT(DISTINCT SERIEPA) AS COUNTSERIE  ");
            sqlCountSeriesProdutoAcabado.appendSql(" FROM TPRSERPA WHERE CODPRODPA = :CODPRODPA ");
            sqlCountSeriesProdutoAcabado.setNamedParameter("CODPRODPA", itemProducaoPA.codProd);
            rsetCountSeriesProdutoAcabado = sqlCountSeriesProdutoAcabado.executeQuery();
            if (rsetCountSeriesProdutoAcabado.next()) {
                countSerie = rsetCountSeriesProdutoAcabado.getInt("COUNTSERIE");
            }

            var5 = countSerie;
        } finally {
            NativeSql.releaseResources(sqlCountSeriesProdutoAcabado);
            JdbcUtils.closeResultSet(rsetCountSeriesProdutoAcabado);
        }

        return var5;
    }

    public void validaObrigatoriedadeFormularioInicializacao(BigDecimal idIproc, BigDecimal idProc) throws Exception {
        ResultSet resultObrigForm = null;
        ResultSet resultInitializForm = null;

        try {
            NativeSql queryObrigForm = new NativeSql(this.jdbc);
            queryObrigForm.setReuseStatements(true);
            queryObrigForm.setIdStatementFromCache("ControleProcessoHelper_sqlObrigatoriedadeFormularioAtividade");
            queryObrigForm.appendSql("SELECT FORMULARIO.NOMETAB, FORMU.DESCRICAO ");
            queryObrigForm.appendSql("FROM TPRFORM FORMU ");
            queryObrigForm.appendSql("\t\tINNER JOIN ( ");
            queryObrigForm.appendSql("\t\t\tSELECT NOMEINSTANCIA, NOMETAB ");
            queryObrigForm.appendSql("\t \t\t\tFROM TDDINS INS ");
            queryObrigForm.appendSql("\t \t\tWHERE TIPOFORM IS NOT NULL ");
            queryObrigForm.appendSql("\t \t) FORMULARIO ON (FORMULARIO.NOMEINSTANCIA = FORMU.NOMEINSTANCIAREF) ");
            queryObrigForm.appendSql("WHERE IDPROC = :IDPROC ");
            queryObrigForm.appendSql("\tAND FORMU.TIPOFORM = 'I' ");
            queryObrigForm.appendSql("\tAND FORMU.OBRIGATORIOINICIA = 'S' ");
            queryObrigForm.setNamedParameter("IDPROC", idProc);
            resultObrigForm = queryObrigForm.executeQuery();

            while(resultObrigForm.next()) {
                NativeSql queryResult = new NativeSql(this.jdbc);
                queryResult.appendSql("SELECT 1 ");
                queryResult.appendSql("FROM " + resultObrigForm.getString("NOMETAB"));
                queryResult.appendSql("\tWHERE IDIPROC = :IDIPROC ");
                queryResult.appendSql("\tAND IDEFX = 0 ");
                queryResult.setNamedParameter("IDIPROC", idIproc);
                resultInitializForm = queryResult.executeQuery();
                if (!resultInitializForm.next()) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00476", new Exception(I18nServerSideBundle.getString("msgErroAoInicializarOP", ControleProcessoHelper.class, (String)null, new Object[]{resultObrigForm.getString("DESCRICAO")})));
                }
            }
        } finally {
            JdbcUtils.closeResultSet(resultObrigForm);
            JdbcUtils.closeResultSet(resultInitializForm);
        }

    }

    public void validaFinalizarAtvSemMovimentacaoManual(BigDecimal idIproc) throws Exception {
        JapeWrapper cabecalhoInstanciaProcessoDAO = JapeFactory.dao("CabecalhoInstanciaProcesso");
        JapeWrapper operacoesEstoqueDAO = JapeFactory.dao("OperacoesEstoque");
        JapeWrapper registroOperacaoEstoqueDAO = JapeFactory.dao("RegistroOperacaoEstoque");
        DynamicVO cabecalhoInstanciaProcessoVO = cabecalhoInstanciaProcessoDAO.findByPK(new Object[]{idIproc});

        for(DynamicVO operacaoEstoqueVO : operacoesEstoqueDAO.find("this.IDEFX IN (SELECT EFX.IDEFX FROM TPREFX EFX WHERE EFX.TIPO = '1111' AND EFX.IDPROC = ?) AND this.TIPOOPER = 'M' AND this.OBRIGATORIO = 'S'", new Object[]{cabecalhoInstanciaProcessoVO.asBigDecimal("IDPROC")})) {
            Collection<DynamicVO> registroesOperacoesEstoqueVO = registroOperacaoEstoqueDAO.find("this.IDEFX = ? AND this.SEQOPER = ? AND this.IDIATV IN (SELECT IDIATV FROM TPRIATV WHERE IDIPROC = ?)", new Object[]{operacaoEstoqueVO.asBigDecimal("IDEFX"), operacaoEstoqueVO.asBigDecimal("SEQOPER"), idIproc});
            if (registroesOperacoesEstoqueVO.isEmpty()) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00477", new Exception("Não é possível finalizar atividade, pois existe operação de estoque manual pendente para a Ordem de produção."));
            }
        }

    }

    private BigDecimal buildInstanciaCoProduto(BigDecimal nuLop, BigDecimal seqOp, BigDecimal idIproc) throws Exception {
        BigDecimal idIcop = null;
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        JapeWrapper ilopDAO = JapeFactory.dao("ItemDeLancamentoDeOP");
        DynamicVO ilopVO = ilopDAO.findByPK(new Object[]{nuLop, seqOp});
        if (ilopVO.asInt("SEQCOP") > 0) {
            if (this.mapSeqCop.containsKey(ilopVO.asBigDecimal("SEQCOP"))) {
                idIcop = (BigDecimal)this.mapSeqCop.get(ilopVO.asBigDecimal("SEQCOP"));
            }

            if (idIcop == null) {
                idIcop = this.getMaxIdIcop();
            }

            JapeWrapper copLopDAO = JapeFactory.dao("CoProdutosLancamento");
            DynamicVO copLopVO = copLopDAO.findOne("this.NULOP = ? AND this.SEQCOP = ?", new Object[]{nuLop, ilopVO.asInt("SEQCOP")});
            DynamicVO iCopVO = (DynamicVO)dwfEntityFacade.getDefaultValueObjectInstance("InstanciaCoProdutos");
            iCopVO.setProperty("IDIPROC", idIproc);
            iCopVO.setProperty("IDICOP", idIcop);
            iCopVO.setProperty("IDCOP", copLopVO.asBigDecimal("IDCOP"));
            iCopVO.setProperty("QTDCONSUMIDA", copLopVO.asBigDecimal("QTDCONSUMIDA"));
            dwfEntityFacade.createEntity("InstanciaCoProdutos", (EntityVO)iCopVO);
            this.mapSeqCop.put(ilopVO.asBigDecimal("SEQCOP"), idIcop);
        }

        return idIcop;
    }

    private BigDecimal getMaxIdIcop() throws Exception {
        BigDecimal seqCop = BigDecimal.ONE;
        NativeSql nativeSql = new NativeSql(this.jdbc);
        nativeSql.setIdStatementFromCache("ControleProcessoHelper_getMaxIdIcop");
        nativeSql.setReuseStatements(true);
        ResultSet result = nativeSql.executeQuery("SELECT nullValue(MAX(IDICOP), 0) + 1 AS MAXIDICOP FROM TPRICOP");
        if (result.next()) {
            seqCop = result.getBigDecimal("MAXIDICOP");
        }

        NativeSql.releaseResources(nativeSql);
        result.close();
        return seqCop;
    }

    public void validaFinalizarAtvSemOperacaoEncadeadaManual(BigDecimal idIproc) throws Exception {
        JapeWrapper operacoesEstoqueDAO = JapeFactory.dao("OperacoesEstoque");
        JapeWrapper registroOperacaoEstoqueDAO = JapeFactory.dao("RegistroOperacaoEstoque");
        StringBuffer strNotasEncadeadasWhere = new StringBuffer();
        strNotasEncadeadasWhere.append(" EXISTS (SELECT 1 FROM TPRROPE ROPE INNER JOIN TPROEST OEST ON (OEST.IDEFX = ROPE.IDEFX AND OEST.SEQOPER = ROPE.SEQOPER) ");
        strNotasEncadeadasWhere.append("\t\t\t INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = ROPE.NUNOTA) ");
        strNotasEncadeadasWhere.append("\t\t\t INNER JOIN TGFTOP TP ON (TP.CODTIPOPER = CAB.CODTIPOPER) ");
        strNotasEncadeadasWhere.append("\t\t\t WHERE OEST.NUMODELOENCAD IS NOT NULL AND OEST.IDEFX = ? AND OEST.SEQOPER = ? AND ROPE.IDIATV = ? ");
        strNotasEncadeadasWhere.append("\t\t\t AND TP.TIPMOV <> 'F' AND TP.DHALTER = (SELECT MAX(T.DHALTER) FROM TGFTOP T WHERE T.CODTIPOPER = TP.CODTIPOPER)) ");
        strNotasEncadeadasWhere.append(" AND this.NUNOTA IN (SELECT ROPE.NUNOTA FROM TPRROPE ROPE INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = ROPE.NUNOTA) ");
        strNotasEncadeadasWhere.append("\t\t\t\t\t   WHERE CAB.TIPMOV <> 'F' AND ROPE.NUAPO IS NULL AND ROPE.IDIATV = ? AND ROPE.IDEFX = ? AND ROPE.SEQOPER = ?) ");
        BigDecimal idIatv = JapeSession.getPropertyAsBigDecimal("br.com.sankhya.mgeprod.finaliza.atv.idiatv");

        for(DynamicVO operacaoEstoqueVO : operacoesEstoqueDAO.find("this.IDEFX IN (SELECT IATV.IDEFX FROM TPRIATV IATV WHERE IATV.IDIATV = ?) AND this.TIPOOPERENCAD = 'M' AND this.OBRIGENCAD = 'S'", new Object[]{idIatv == null ? BigDecimal.ZERO : idIatv})) {
            Collection<Object> params = new ArrayList();
            params.add(operacaoEstoqueVO.asBigDecimal("IDEFX"));
            params.add(operacaoEstoqueVO.asBigDecimal("SEQOPER"));
            params.add(idIatv);
            params.add(idIatv);
            params.add(operacaoEstoqueVO.asBigDecimal("IDEFX"));
            params.add(operacaoEstoqueVO.asBigDecimal("SEQOPER"));
            Collection<DynamicVO> registroesOperacoesEstoqueVO = registroOperacaoEstoqueDAO.find(strNotasEncadeadasWhere.toString(), params.toArray());
            if (registroesOperacoesEstoqueVO.isEmpty()) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00568", new Exception("Não é possível finalizar atividade, pois existe operação encadeada pendente para a Ordem de produção."));
            }
        }

    }

    private void liberarCentroDeTrabalhoAoSuspender(BigDecimal idIproc, boolean isValidarUsoCentroTrabalho) throws Exception {
        JapeWrapper historicoWorkCenterAtividadeDAO = JapeFactory.dao("HistoricoWorkCenterAtividade");
        Collection<DynamicVO> listaHistoricoWorkCenter = historicoWorkCenterAtividadeDAO.find("this.IDIPROC = ? AND DHLIBALOC IS NULL", new Object[]{idIproc});
        if (!listaHistoricoWorkCenter.isEmpty()) {
            if (!isValidarUsoCentroTrabalho) {
                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.libera.wc.suspender", (Element)null);
                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00539", new ServiceCanceledException());
            }

            for(DynamicVO historicoWCVO : listaHistoricoWorkCenter) {
                FluidUpdateVO historicoCTupdate = historicoWorkCenterAtividadeDAO.prepareToUpdate(historicoWCVO);
                historicoCTupdate.set("DHLIBALOC", TimeUtils.getNow());
                historicoCTupdate.set("CODUSULIBALOC", AuthenticationInfo.getCurrent().getUserID());
                historicoCTupdate.update();
            }
        }

    }

    private void pararExecucaoAtualECriarExecucaoSuspensa(BigDecimal idIproc) throws Exception {
        JapeWrapper instanciaAtividadeDAO = JapeFactory.dao("InstanciaAtividade");
        Collection<DynamicVO> instanciasAtividadesVO = instanciaAtividadeDAO.find("this.IDIPROC = ? AND this.DHFINAL IS NULL", new Object[]{idIproc});
        BigDecimal codUserExec = AuthenticationInfo.getCurrent().getUserID();
        OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();

        for(DynamicVO instanciaAtividadeVO : instanciasAtividadesVO) {
            BigDecimal idIatv = instanciaAtividadeVO.asBigDecimal("IDIATV");
            DynamicVO execucaoVO = helper.getExecucaoInstanciaAtividadeAberta(idIatv, codUserExec);
            if (execucaoVO != null) {
                helper.finalizarExecucaoInsanciaAtividade(execucaoVO.asBigDecimal("IDEIATV"), TimeUtils.getNow());
                helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, codUserExec, codUserExec, idIatv, "S", (BigDecimal)null, (String)null);
            } else {
                helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, codUserExec, codUserExec, idIatv, "S", (BigDecimal)null, (String)null);
            }

            helper.limparUsuarioExecutanteAtividade(idIatv);
        }

    }

    private void finalizarTodaExecucaoSuspensa(BigDecimal idIproc) throws Exception {
        JapeWrapper instanciaAtividadeDAO = JapeFactory.dao("InstanciaAtividade");
        Collection<DynamicVO> instanciaAtividadeVO = instanciaAtividadeDAO.find("this.IDIPROC = ? AND this.DHFINAL IS NULL", new Object[]{idIproc});
        BigDecimal codUserExec = AuthenticationInfo.getCurrent().getUserID();
        OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();

        for(DynamicVO instanciaAtividadesVO : instanciaAtividadeVO) {
            BigDecimal idIatv = instanciaAtividadesVO.asBigDecimal("IDIATV");
            DynamicVO execucaoVO = helper.getExecucaoInstanciaAtividadeAberta(idIatv, codUserExec);
            if (execucaoVO != null) {
                helper.finalizarExecucaoInsanciaAtividade(execucaoVO.asBigDecimal("IDEIATV"), TimeUtils.getNow());
            }
        }

    }

    public void validaInicializacaoDoPAQuandoExistirSubOrdem(BigDecimal idIproc) throws Exception {
        ResultSet resultSet = null;
        NativeSql query = null;

        try {
            query = new NativeSql(this.jdbc);
            query.setReuseStatements(true);
            query.appendSql("SELECT IPROCPI.* ");
            query.appendSql("FROM TPRIDEP IDEP INNER JOIN TPRIPROC IPROCPI ON (IPROCPI.IDIPROC = IDEP.IDIPROCPI) ");
            query.appendSql("\t\t\t\t   INNER JOIN (SELECT IPROC.IDIPROC, LPI.CODPRODPI, LPI.CONTROLEPI, LPI.CODPRODPA, LPI.CONTROLEPA  FROM TPRPRC PRC INNER JOIN TPRIPROC IPROC ON (IPROC.IDPROC = PRC.IDPROC) ");
            query.appendSql("\t\t\t\t   \t\t\t\tINNER JOIN TPRLPI LPI ON (LPI.IDPROC = PRC.IDPROC) ");
            query.appendSql("\t\t\t\t   \t\t\t\tWHERE LPI.TIPOPI = 'O' ");
            query.appendSql("\t\t\t\t   \t\t\t\tAND LPI.BLOQINITPA = 'S') CPI ON (CPI.IDIPROC = IDEP.IDIPROCPA AND CPI.CODPRODPI = IDEP.CODPRODPI  AND CPI.CONTROLEPI = IDEP.CONTROLEPI AND CPI.CODPRODPA = IDEP.CODPRODPA AND CPI.CONTROLEPA = IDEP.CONTROLEPA) ");
            query.appendSql("WHERE IDEP.IDIPROCPA = :IDIPROC ");
            query.appendSql("AND IPROCPI.STATUSPROC <> 'F' ");
            query.setNamedParameter("IDIPROC", idIproc);
            resultSet = query.executeQuery();
            if (resultSet.next()) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00540", new Exception(I18nServerSideBundle.getString("msgBloqueadoInicializacaoPA", ControleProcessoHelper.class)));
            }
        } finally {
            JdbcUtils.closeResultSet(resultSet);
            NativeSql.releaseResources(query);
        }

    }
}
