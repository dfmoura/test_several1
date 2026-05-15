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
import br.com.sankhya.jape.util.JapeSessionContext;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.EntityVO;
import br.com.sankhya.jape.wrapper.JapeFactory;
import br.com.sankhya.jape.wrapper.JapeWrapper;
import br.com.sankhya.jape.wrapper.fluid.FluidUpdateVO;
import br.com.sankhya.mgeprod.filtro.bean.indicadores.DataCalendario;
import br.com.sankhya.mgeprod.model.helper.indicadores.DataCalendarioHelper;
import br.com.sankhya.mgeprod.model.lancamento.TipoProcesso;
import br.com.sankhya.mgeprod.model.utils.ProducaoUtils;
import br.com.sankhya.mgeprod.model.utils.ProdutoControle;
import br.com.sankhya.modelcore.comercial.ComercialUtils;
import br.com.sankhya.modelcore.comercial.LiberacaoAlcadaHelper;
import br.com.sankhya.modelcore.comercial.centrais.CACHelper;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;
import br.com.sankhya.util.troubleshooting.SKError;
import br.com.sankhya.util.troubleshooting.TSLevel;
import br.com.sankhya.ws.ServiceCanceledException;
import br.com.sankhya.ws.ServiceContext;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.JdbcUtils;
import com.sankhya.util.SQLUtils;
import com.sankhya.util.StringUtils;
import com.sankhya.util.TimeUtils;
import com.sankhya.util.XMLUtils;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.ejb.ObjectNotFoundException;
import org.jdom.Attribute;
import org.jdom.Element;

public class OrdemProducaoHelper {
    private EntityFacade dwfEntityFacade;
    private static MathContext mathCtx;
    private static MathContext mathCtx2Round;
    private static MathContext mathCtx3Round;
    private static final String SOMENTE_PI = "PI";
    private static final String AMBOS = "AB";
    private static final String MPS_TODAS_ATVS = "MT";
    private static final String MATERIAIS_DA_ATIVIDADE_BASE = "MB";
    private static final String TRANSFERENCIA = "T";
    private static final String SIM = "S";
    private static final String NAO = "N";
    private static final String CONTROLADO_POR_LOTE = "L";

    public static OrdemProducaoHelper getInstance() throws Exception {
        OrdemProducaoHelper helper = new OrdemProducaoHelper();
        helper.dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        return helper;
    }

    private OrdemProducaoHelper() {
    }

    public void reordenarPrioridades(Element ordensElement) throws Exception {
        List<BigDecimal> ordensId = new ArrayList();

        for(Object obj : ordensElement.getChildren("ordem")) {
            Element ordem = (Element)obj;
            BigDecimal index = XMLUtils.getRequiredAttributeAsBigDecimal(ordem, "INDEX");
            BigDecimal idOrdem = XMLUtils.getRequiredAttributeAsBigDecimal(ordem, "IDIPROC");
            ordensId.add(index.intValue(), idOrdem);
        }

        FinderWrapper finder = new FinderWrapper("CabecalhoInstanciaProcesso", "this.IDIPROC inCollection[0]", new Object[]{ordensId});
        finder.setOrderBy("this.PRIORIDADE ASC");
        int index = 0;
        ArrayList<BigDecimal> prioridades = new ArrayList();
        Collection<PersistentLocalEntity> ordensEntity = this.dwfEntityFacade.findByDynamicFinder(finder);

        for(PersistentLocalEntity ordemEntity : ordensEntity) {
            DynamicVO ordemVO = (DynamicVO)ordemEntity.getValueObject();
            prioridades.add(index, ordemVO.asBigDecimalOrZero("PRIORIDADE"));
            ++index;
        }

        Map<BigDecimal, BigDecimal> newOrdens = new HashMap();

        for(int i = 0; i < ordensId.size(); ++i) {
            newOrdens.put(ordensId.get(i), prioridades.get(i));
        }

        for(PersistentLocalEntity ordemEntity : ordensEntity) {
            DynamicVO ordemVO = (DynamicVO)ordemEntity.getValueObject();
            BigDecimal prioridade = (BigDecimal)newOrdens.get(ordemVO.asBigDecimal("IDIPROC"));
            ordemVO.setProperty("PRIORIDADE", prioridade);
            ordemEntity.setValueObject((EntityVO)ordemVO);
        }

    }

    public Element getAmostras(BigDecimal idiProc) throws Exception {
        JdbcWrapper jdbc = null;
        ResultSet rsAmostras = null;
        Element registrosElem = new Element("registros");

        try {
            jdbc = this.dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            NativeSql queAmostras = new NativeSql(jdbc);
            queAmostras.loadSql(this.getClass(), "OrdemProducao_queAmostras.sql");
            queAmostras.setNamedParameter("IDIPROC", idiProc);
            rsAmostras = queAmostras.executeQuery();
            DateFormat df = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");

            while(rsAmostras.next()) {
                Element registroElem = new Element("registro");
                XMLUtils.setAttibuteValue(registroElem, "DHINICIO", this.dateFormat(df, rsAmostras.getTimestamp("DHINICIO")));
                XMLUtils.setAttibuteValue(registroElem, "DHFINAL", this.dateFormat(df, rsAmostras.getTimestamp("DHFINAL")));
                XMLUtils.setAttibuteValue(registroElem, "STATUSCICLO", rsAmostras.getString("STATUSCICLO"));
                XMLUtils.setAttibuteValue(registroElem, "DESCRCICLO", rsAmostras.getString("DESCRCICLO"));
                XMLUtils.setAttibuteValue(registroElem, "CODTIPAMOSTRA", rsAmostras.getBigDecimal("CODTIPAMOSTRA"));
                XMLUtils.setAttibuteValue(registroElem, "DESCRAMOSTRA", rsAmostras.getString("DESCRAMOSTRA"));
                XMLUtils.setAttibuteValue(registroElem, "NURAM", rsAmostras.getBigDecimal("NURAM"));
                XMLUtils.setAttibuteValue(registroElem, "CODPROD", rsAmostras.getBigDecimal("CODPROD"));
                XMLUtils.setAttibuteValue(registroElem, "DESCRPROD", rsAmostras.getString("DESCRPROD"));
                XMLUtils.setAttibuteValue(registroElem, "REFERENCIA", rsAmostras.getString("REFERENCIA"));
                XMLUtils.setAttibuteValue(registroElem, "CONTROLE", rsAmostras.getString("CONTROLE"));
                XMLUtils.setAttibuteValue(registroElem, "DHCOLETA", this.dateFormat(df, rsAmostras.getTimestamp("DHCOLETA")));
                XMLUtils.setAttibuteValue(registroElem, "OBSERVACAO", rsAmostras.getString("OBSERVACAO"));
                XMLUtils.setAttibuteValue(registroElem, "CODUSUCOLETA", BigDecimalUtil.getValueOrZero(rsAmostras.getBigDecimal("CODUSUCOLETA")));
                XMLUtils.setAttibuteValue(registroElem, "QTDAMOSTRA", BigDecimalUtil.getValueOrZero(rsAmostras.getBigDecimal("QTDAMOSTRA")));
                registrosElem.addContent(registroElem);
            }
        } finally {
            JdbcUtils.closeResultSet(rsAmostras);
            JdbcWrapper.closeSession(jdbc);
        }

        return registrosElem;
    }

    private String dateFormat(DateFormat df, Timestamp date) {
        return date != null ? df.format(date) : null;
    }

    public Map<BigDecimal, ProducaoHelper.CamposCalculadosProducao> buildCamposCalculadosOP(List<BigDecimal> listOrdens) throws Exception {
        JdbcWrapper jdbc = null;
        Map<BigDecimal, ProducaoHelper.CamposCalculadosProducao> camposCalculados = ProducaoHelper.getInstance().buildCamposCalculadosProducao(listOrdens);

        try {
            jdbc = this.dwfEntityFacade.getJdbcWrapper();
            NativeSql queCamposCalculados = new NativeSql(jdbc);
            queCamposCalculados.loadSql(this.getClass(), "ProducaoHelper_queCamposCalculadosOP.sql");
            NativeSql queCamposRepositorio = new NativeSql(jdbc);
            queCamposRepositorio.loadSql(this.getClass(), "ProducaoHelper_queCamposRepositorio.sql");
            boolean isSqlServer = jdbc.getDialect() == 1;
            if (isSqlServer) {
                queCamposCalculados.removeSQLComment("$sqlserver$");
                queCamposRepositorio.removeSQLComment("$sqlserver$");
            } else {
                queCamposCalculados.removeSQLComment("$oracle$");
                queCamposRepositorio.removeSQLComment("$oracle$");
            }

            queCamposCalculados.setReuseStatements(true);
            queCamposRepositorio.setReuseStatements(true);

            for(BigDecimal idOrdem : listOrdens) {
                this.geraCamposCalculadosOP(idOrdem, camposCalculados, queCamposCalculados, queCamposRepositorio);
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            JdbcWrapper.closeSession(jdbc);
        }

        return camposCalculados;
    }

    private void geraCamposCalculadosOP(BigDecimal idOrdem, Map<BigDecimal, ProducaoHelper.CamposCalculadosProducao> camposCalculados, NativeSql queCamposCalculados, NativeSql queCamposRepositorio) throws Exception {
        queCamposCalculados.setNamedParameter("IDIPROC", idOrdem);
        ResultSet rs = null;

        try {
            rs = queCamposCalculados.executeQuery();
            ProducaoHelper.CamposCalculadosProducao campo = (ProducaoHelper.CamposCalculadosProducao)camposCalculados.get(idOrdem);
            if (rs.next()) {
                campo.executante = rs.getBigDecimal("CODEXEC");
                campo.nomeExecutante = rs.getString("NOMEUSU");
                campo.descricao = rs.getString("DESCRICAO");
            }

            rs = queCamposRepositorio.executeQuery();
            if (rs.next()) {
                campo.nomeRepositorio = rs.getString("DESCRICAO");
                campo.qtdRepositorio = rs.getBigDecimal("QTD");
            }
        } finally {
            JdbcUtils.closeResultSet(rs);
        }

    }

    public void substituirProduto(Element paramsElem) throws Exception {
        JdbcWrapper jdbcWrapper = null;
        NativeSql queTotaisApontadosAtividades = null;
        NativeSql queApontamentosPA = null;
        JapeSession.putProperty("substituicao.produto.pa", Boolean.TRUE);

        try {
            jdbcWrapper = this.dwfEntityFacade.getJdbcWrapper();
            BigDecimal idiProc = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "IDIPROC");
            BigDecimal codProd = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "CODPRODPA");
            String controle = ComercialUtils.trimControleEstoque(XMLUtils.getAttributeAsString(paramsElem, "CONTROLEPA"));
            BigDecimal novoTamLotePASubstituido = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "NOVAQTDAPONTADA");
            String confirmarSubstituicaoPA = XMLUtils.getAttributeAsString(paramsElem, "CONFIRMAR_SUBSTITUICAO_PA");
            if (confirmarSubstituicaoPA != null && !new Boolean(confirmarSubstituicaoPA)) {
                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00375", new ServiceCanceledException());
            }

            StringBuilder strWhereDep = new StringBuilder("(this.IDIPROCPA = ? OR this.IDIPROCPI = ?)");
            strWhereDep.append(" AND (this.CODPRODPA = ? OR this.CODPRODPI = ?) ");
            strWhereDep.append(" AND (this.CONTROLEPA = ? OR this.CONTROLEPI = ?) ");
            Collection<Object> paransDep = new ArrayList();
            paransDep.add(idiProc);
            paransDep.add(idiProc);
            paransDep.add(codProd);
            paransDep.add(codProd);
            paransDep.add(controle);
            paransDep.add(controle);
            Collection<DynamicVO> dependenciasVO = this.dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("DependenciaEntreOps", strWhereDep.toString(), paransDep.toArray()));
            if (confirmarSubstituicaoPA == null && !dependenciasVO.isEmpty()) {
                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.confirmacao.substituir.pa", new Element("event"));
                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00375", new ServiceCanceledException());
            }

            queTotaisApontadosAtividades = new NativeSql(jdbcWrapper, this.getClass(), "OrdemProducaoHelper_queTotaisApontadosAtividades.sql");
            queTotaisApontadosAtividades.setNamedParameter("IDIPROC", idiProc);
            queTotaisApontadosAtividades.setNamedParameter("CODPRODPA", codProd);
            queTotaisApontadosAtividades.setNamedParameter("CONTROLEPA", controle);
            queApontamentosPA = new NativeSql(jdbcWrapper, this.getClass(), "OrdemProducaoHelper_queApontamentoPAs.sql");
            queApontamentosPA.setReuseStatements(true);
            queApontamentosPA.setNamedParameter("IDIPROC", idiProc);
            queApontamentosPA.setNamedParameter("CODPRODPA", codProd);
            queApontamentosPA.setNamedParameter("CONTROLEPA", controle);
            ResultSet rsetTotaisApontadosAtividades = queTotaisApontadosAtividades.executeQuery();
            FinderWrapper finderMPs = new FinderWrapper("ApontamentoMateriais", "this.NUAPO = ? AND this.SEQAPA = ?");
            finderMPs.setMaxResults(-1);
            List<Produto> produtosSubstitutos = this.parseProdutosSubstitutos(XMLUtils.getRequiredChild(paramsElem, "produtos"));
            DynamicVO instanciaProcessoVO = (DynamicVO)this.dwfEntityFacade.findEntityByPrimaryKeyAsVO("CabecalhoInstanciaProcesso", new Object[]{idiProc});
            DynamicVO processoProdutivoVO = (DynamicVO)this.dwfEntityFacade.findEntityByPrimaryKeyAsVO("ProcessoProdutivo", new Object[]{instanciaProcessoVO.asBigDecimal("IDPROC")});
            NumeracaoLoteOrdemProducaoHelper numeracaoOPHelper = NumeracaoLoteOrdemProducaoHelper.getInstance();

            for(Produto produto : produtosSubstitutos) {
                DynamicVO produtoVO = (DynamicVO)this.dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{produto.codigo});
                produto.nroLote = this.gerarNumeracaoLote(numeracaoOPHelper, processoProdutivoVO, produto, instanciaProcessoVO);
                if ("L".equals(produtoVO.asString("TIPCONTEST"))) {
                    produto.controle = produto.nroLote;
                }
            }

            this.incluirProdutosSubstitutos(idiProc, produtosSubstitutos);
            PersistentLocalEntity produtoAcabadoProduzirEntity = this.dwfEntityFacade.findEntityByPrimaryKey("ProdutoAcabadoAProduzir", new Object[]{idiProc, codProd, controle});
            DynamicVO produtoAcabadoProduzirVO = (DynamicVO)produtoAcabadoProduzirEntity.getValueObject();
            BigDecimal tamLotePASubstituidoAntigo = produtoAcabadoProduzirVO.asBigDecimal("QTDPRODUZIR");

            while(rsetTotaisApontadosAtividades.next()) {
                BigDecimal idEfx = rsetTotaisApontadosAtividades.getBigDecimal("IDEFX");
                if (novoTamLotePASubstituido.doubleValue() < rsetTotaisApontadosAtividades.getDouble("TOTAL_FAT")) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00376", new Exception("O novo tamanho de lote do produto não atende aos apontamentos totais já realizados na atividade " + idEfx + ": " + novoTamLotePASubstituido.doubleValue() + " < " + rsetTotaisApontadosAtividades.getDouble("TOTAL_FAT")));
                }

                queApontamentosPA.setNamedParameter("IDEFX", idEfx);
                ResultSet rsetApontamentosPA = queApontamentosPA.executeQuery();

                while(rsetApontamentosPA.next()) {
                    PersistentLocalEntity apontamentoPAEntity = this.dwfEntityFacade.findEntityByPrimaryKey("ApontamentoPA", new Object[]{rsetApontamentosPA.getBigDecimal("NUAPO"), rsetApontamentosPA.getBigDecimal("SEQAPA")});
                    DynamicVO apontamentoPAVO = (DynamicVO)apontamentoPAEntity.getValueObject();
                    finderMPs.setFinderArguments(new Object[]{rsetApontamentosPA.getBigDecimal("NUAPO"), rsetApontamentosPA.getBigDecimal("SEQAPA")});
                    Collection<PersistentLocalEntity> mpsApontadas = this.dwfEntityFacade.findByDynamicFinder(finderMPs);
                    BigDecimal qtdApontadaPAAntiga = apontamentoPAVO.asBigDecimal("QTDAPONTADA");
                    BigDecimal indiceApontamento = qtdApontadaPAAntiga.divide(tamLotePASubstituidoAntigo, mathCtx);
                    BigDecimal qtdApontadaPANova = novoTamLotePASubstituido.multiply(indiceApontamento, mathCtx2Round);
                    if (qtdApontadaPANova.doubleValue() < apontamentoPAVO.asDouble("QTDFAT")) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00377", new Exception("A nova qtd. calculada para o apontamento é menor que a qtd. já baixada para a atividade " + idEfx + ": " + qtdApontadaPANova.doubleValue() + " < " + apontamentoPAVO.asDouble("QTDFAT")));
                    }

                    if (qtdApontadaPANova.doubleValue() > (double)0.0F) {
                        apontamentoPAVO.setProperty("QTDAPONTADA", qtdApontadaPANova);
                        apontamentoPAEntity.setValueObject((EntityVO)apontamentoPAVO);
                    }

                    Collection<DynamicVO> novosApontamentos = new ArrayList();

                    for(Produto produto : produtosSubstitutos) {
                        DynamicVO apontamentoPAVOSubs = apontamentoPAVO.buildClone();
                        apontamentoPAVOSubs.clearReferences();
                        apontamentoPAVOSubs.setProperty("SEQAPA", (Object)null);
                        apontamentoPAVOSubs.setProperty("CODPRODPA", produto.codigo);
                        apontamentoPAVOSubs.setProperty("CONTROLEPA", produto.controle);
                        apontamentoPAVOSubs.setProperty("QTDAPONTADA", produto.tamLote.multiply(indiceApontamento, mathCtx2Round));
                        apontamentoPAVOSubs.setProperty("QTDFAT", BigDecimal.ZERO);
                        this.dwfEntityFacade.createEntity("ApontamentoPA", (EntityVO)apontamentoPAVOSubs);
                        apontamentoPAVOSubs.setAceptTransientProperties(true);
                        apontamentoPAVOSubs.setProperty("_INDMP", produto.percentualMP);
                        novosApontamentos.add(apontamentoPAVOSubs);
                    }

                    for(PersistentLocalEntity mpApontaEntity : mpsApontadas) {
                        DynamicVO mpApontadaVO = (DynamicVO)mpApontaEntity.getValueObject();
                        BigDecimal qtdMP = mpApontadaVO.asBigDecimal("QTD");
                        BigDecimal novaQtdMP = qtdMP.divide(qtdApontadaPAAntiga, mathCtx).multiply(qtdApontadaPANova, mathCtx2Round);
                        BigDecimal sobraMP = qtdMP.subtract(novaQtdMP);
                        if (novaQtdMP.doubleValue() > (double)0.0F) {
                            mpApontadaVO.setProperty("QTD", novaQtdMP);
                            mpApontaEntity.setValueObject((EntityVO)mpApontadaVO);
                        }

                        BigDecimal totalDistribuido = BigDecimal.ZERO;
                        Iterator<DynamicVO> ite = novosApontamentos.iterator();

                        while(ite.hasNext()) {
                            DynamicVO novoApontamentoVO = (DynamicVO)ite.next();
                            DynamicVO mpApontadaVOSubs = mpApontadaVO.buildClone();
                            mpApontadaVOSubs.clearReferences();
                            mpApontadaVOSubs.setProperty("NUAPO", novoApontamentoVO.asBigDecimal("NUAPO"));
                            mpApontadaVOSubs.setProperty("SEQAPA", novoApontamentoVO.asBigDecimal("SEQAPA"));
                            BigDecimal qtd = null;
                            if (ite.hasNext()) {
                                qtd = sobraMP.multiply(novoApontamentoVO.asBigDecimal("_INDMP").divide(BigDecimalUtil.CEM_VALUE));
                                totalDistribuido = totalDistribuido.add(qtd);
                            } else {
                                qtd = sobraMP.subtract(totalDistribuido);
                            }

                            mpApontadaVOSubs.setProperty("QTD", qtd);
                            this.dwfEntityFacade.createEntity("ApontamentoMateriais", (EntityVO)mpApontadaVOSubs);
                        }

                        if (novaQtdMP.doubleValue() <= (double)0.0F) {
                            mpApontaEntity.remove();
                        }
                    }

                    if (qtdApontadaPANova.doubleValue() <= (double)0.0F) {
                        apontamentoPAEntity.remove();
                    }
                }

                JdbcUtils.closeResultSet(rsetApontamentosPA);
            }

            JdbcUtils.closeResultSet(rsetTotaisApontadosAtividades);
            this.processarMovimentacaoRepositorio(jdbcWrapper, produtosSubstitutos, idiProc, codProd, controle, tamLotePASubstituidoAntigo, novoTamLotePASubstituido);
            if (novoTamLotePASubstituido.doubleValue() > (double)0.0F) {
                produtoAcabadoProduzirVO.setProperty("QTDPRODUZIR", novoTamLotePASubstituido);
                produtoAcabadoProduzirEntity.setValueObject((EntityVO)produtoAcabadoProduzirVO);

                for(PersistentLocalEntity dependenciaEntity : this.dwfEntityFacade.findByDynamicFinder(new FinderWrapper("DependenciaEntreOps", strWhereDep.toString(), paransDep.toArray()))) {
                    DynamicVO depVO = (DynamicVO)dependenciaEntity.getValueObject();
                    depVO.setProperty("QTDDEP", novoTamLotePASubstituido);
                    dependenciaEntity.setValueObject((EntityVO)depVO);
                }
            } else {
                produtoAcabadoProduzirEntity.remove();
                this.dwfEntityFacade.removeByCriteria(new FinderWrapper("DependenciaEntreOps", strWhereDep.toString(), paransDep.toArray()));
            }

            for(DynamicVO depVO : dependenciasVO) {
                for(Produto produto : produtosSubstitutos) {
                    DynamicVO depEntreOPs = (DynamicVO)this.dwfEntityFacade.getDefaultValueObjectInstance("DependenciaEntreOps");
                    depEntreOPs.setProperty("IDIPROCPI", depVO.asBigDecimal("IDIPROCPI"));
                    depEntreOPs.setProperty("IDIPROCPA", depVO.asBigDecimal("IDIPROCPA"));
                    if (depVO.asBigDecimal("CODPRODPA").intValue() == codProd.intValue() && depVO.asString("CONTROLEPA").equals(ComercialUtils.trimControleEstoque(produto.controle))) {
                        depEntreOPs.setProperty("CODPRODPA", produto.codigo);
                        depEntreOPs.setProperty("CONTROLEPA", produto.controle);
                        depEntreOPs.setProperty("CODPRODPI", depVO.asBigDecimal("CODPRODPI"));
                        depEntreOPs.setProperty("CONTROLEPI", depVO.asString("CONTROLEPI"));
                    } else {
                        depEntreOPs.setProperty("CODPRODPI", produto.codigo);
                        depEntreOPs.setProperty("CONTROLEPI", produto.controle);
                        depEntreOPs.setProperty("CODPRODPA", depVO.asBigDecimal("CODPRODPA"));
                        depEntreOPs.setProperty("CONTROLEPA", depVO.asString("CONTROLEPA"));
                    }

                    depEntreOPs.setProperty("QTDDEP", produto.tamLote);
                    this.dwfEntityFacade.createEntity("DependenciaEntreOps", (EntityVO)depEntreOPs);
                }
            }
        } finally {
            JapeSession.putProperty("substituicao.produto.pa", Boolean.FALSE);
            NativeSql.releaseResources(queTotaisApontadosAtividades);
            NativeSql.releaseResources(queApontamentosPA);
            JdbcWrapper.closeSession(jdbcWrapper);
        }

    }

    private void processarMovimentacaoRepositorio(JdbcWrapper jdbcWrapper, List<Produto> produtosSubstitutos, BigDecimal idiProc, BigDecimal codProd, String controle, BigDecimal tamLotePASubstituidoAntigo, BigDecimal novoTamLotePASubstituido) throws Exception {
        MovimentoRepositorio movimentoRepositorioHelper = new MovimentoRepositorio(idiProc, (BigDecimal)null, jdbcWrapper);
        FinderWrapper finderMovimentacoesRepositorio = new FinderWrapper("MovimentacaoRepositorioPA", "this.IDIPROC = ? and this.CODPRODPA = ? and this.CONTROLEPA = ? and this.STATUSEXEC = 'N'");
        finderMovimentacoesRepositorio.setFinderArguments(new Object[]{idiProc, codProd, controle});
        finderMovimentacoesRepositorio.setOrderBy("this.IDMER, this.SEQMER");
        Collection<DynamicVO> movimentosRepositorioVO = this.dwfEntityFacade.findByDynamicFinderAsVO(finderMovimentacoesRepositorio);
        FinderWrapper removeCriteriaEstoqueRepositorio = new FinderWrapper("MovimentacaoRepositorioPA", "this.IDIPROC = ? and this.CODPRODPA = ? and this.CONTROLEPA = ? and this.STATUSEXEC = 'N'");
        removeCriteriaEstoqueRepositorio.setFinderArguments(new Object[]{idiProc, codProd, controle});
        removeCriteriaEstoqueRepositorio.setMaxResults(-1);
        this.dwfEntityFacade.removeByCriteria(removeCriteriaEstoqueRepositorio);
        Map<BigDecimal, BigDecimal> idMerMap = new HashMap();

        for(DynamicVO movimentoRepositorioVO : movimentosRepositorioVO) {
            BigDecimal qtdMerAntiga = movimentoRepositorioVO.asBigDecimal("QTD");
            BigDecimal indiceMovimento = qtdMerAntiga.divide(tamLotePASubstituidoAntigo, mathCtx);
            BigDecimal qtdMerNova = novoTamLotePASubstituido.multiply(indiceMovimento, mathCtx3Round);
            if (qtdMerNova.doubleValue() > (double)0.0F) {
                movimentoRepositorioVO.setProperty("QTD", qtdMerNova);
                this.dwfEntityFacade.createEntity("MovimentacaoRepositorioPA", (EntityVO)movimentoRepositorioVO);
            }

            BigDecimal idMer = (BigDecimal)idMerMap.get(movimentoRepositorioVO.asBigDecimal("IDMER"));
            if (idMer == null) {
                idMer = movimentoRepositorioHelper.getNextIDMer(movimentoRepositorioVO);
                idMerMap.put(movimentoRepositorioVO.asBigDecimal("IDMER"), idMer);
            }

            for(Produto produto : produtosSubstitutos) {
                DynamicVO movimentoRepositorioVOSubs = movimentoRepositorioVO.buildClone();
                movimentoRepositorioVOSubs.clearReferences();
                movimentoRepositorioVOSubs.setProperty("IDMER", idMer);
                movimentoRepositorioVOSubs.setProperty("SEQMER", (Object)null);
                movimentoRepositorioVOSubs.setProperty("CODPRODPA", produto.codigo);
                movimentoRepositorioVOSubs.setProperty("CONTROLEPA", produto.controle);
                movimentoRepositorioVOSubs.setProperty("QTD", produto.tamLote.multiply(indiceMovimento, mathCtx));
                movimentoRepositorioVOSubs.setProperty("DHMOV", TimeUtils.getNow());
                this.dwfEntityFacade.createEntity("MovimentacaoRepositorioPA", (EntityVO)movimentoRepositorioVOSubs);
            }
        }

    }

    private void incluirProdutosSubstitutos(BigDecimal idiProc, List<Produto> produtos) throws Exception {
        for(Produto produto : produtos) {
            DynamicVO produtoAcabadoVO = (DynamicVO)this.dwfEntityFacade.getDefaultValueObjectInstance("ProdutoAcabadoAProduzir");
            produtoAcabadoVO.setProperty("IDIPROC", idiProc);
            produtoAcabadoVO.setProperty("CODPRODPA", produto.codigo);
            produtoAcabadoVO.setProperty("CONTROLEPA", produto.controle);
            produtoAcabadoVO.setProperty("QTDPRODUZIR", produto.tamLote);
            produtoAcabadoVO.setProperty("NROLOTE", produto.nroLote);
            produtoAcabadoVO.setProperty("CONCLUIDO", "N");
            this.dwfEntityFacade.createEntity("ProdutoAcabadoAProduzir", (EntityVO)produtoAcabadoVO);
        }

    }

    public String gerarNumeracaoLote(NumeracaoLoteOrdemProducaoHelper numeracaoOPHelper, DynamicVO processoProdutivoVO, Produto produto, DynamicVO instanciaProcessoVO) throws Exception {
        return numeracaoOPHelper.gerarNumeracao(processoProdutivoVO.asString("TIPONROLOTE"), processoProdutivoVO.asString("TIPOFRAGNROLOTE"), BigDecimal.ZERO, processoProdutivoVO.asString("MASCNROLOTE"), instanciaProcessoVO.asBigDecimal("PlantaManufatura.CODEMP"), instanciaProcessoVO.asBigDecimal("IDPROC"), produto.codigo, produto.controle, produto.nroLote, instanciaProcessoVO.asTimestamp("DHINC"));
    }

    private List<Produto> parseProdutosSubstitutos(Element produtosSubstitutosElem) throws Exception {
        List<Produto> produtos = new ArrayList();

        for(Element produtoElem : produtosSubstitutosElem.getChildren()) {
            BigDecimal codProdSubs = XMLUtils.getContentChildAsBigDecimal(produtoElem, "CODPRODPA");
            String controleSubs = ComercialUtils.trimControleEstoque(XMLUtils.getContentChildAsString(produtoElem, "CONTROLEPA"));
            BigDecimal tamLote = XMLUtils.getContentChildAsBigDecimal(produtoElem, "TAMLOTE");
            String nroLote = XMLUtils.getContentChildAsString(produtoElem, "NROLOTE");
            BigDecimal percentualMP = XMLUtils.getContentChildAsBigDecimal(produtoElem, "PERCMP");
            Produto produto = new Produto(codProdSubs, controleSubs, tamLote, nroLote, percentualMP);
            produtos.add(produto);
        }

        return produtos;
    }

    public void executaRemocaoApontamento(ServiceContext ctx) throws Exception {
        Element notasElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "notas");
        BigDecimal nuapo = XMLUtils.getAttributeAsBigDecimal(notasElement, "NUAPO");
        boolean mostrarEvtConfirmaExclusaoApontamento = XMLUtils.getAttributeAsBoolean(notasElement, "respEvtConfirExclApo");
        BigDecimal idiproc = XMLUtils.getAttributeAsBigDecimal(notasElement, "IDIPROC");
        boolean mostrarEvtConfirmaExclusaoPesagem = XMLUtils.getAttributeAsBoolean(notasElement, "respEvtConfirmExclPesagem");
        this.validaAtividadeApontamentoJaFinalizada(nuapo);
        Set<Integer> notasParaExclusao = new HashSet();
        ArrayList<Integer> notasEletronicasConfirmadas = new ArrayList();
        ArrayList<Integer> notasConfirmadas = new ArrayList();

        for(DynamicVO operacaoEstoqueVO : this.dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("RegistroOperacaoEstoque", "this.NUAPO = ? ", new Object[]{nuapo}))) {
            DynamicVO cabVO = operacaoEstoqueVO.asDymamicVO("CabecalhoNota");
            Integer nuNota = operacaoEstoqueVO.asInt("NUNOTA");
            if (cabVO != null) {
                if ("L".equals(cabVO.asString("STATUSNOTA"))) {
                    notasConfirmadas.add(cabVO.asInt("NUNOTA"));
                    if (ComercialUtils.ehNFE(cabVO) || ComercialUtils.ehNFSE(cabVO) || ComercialUtils.ehCTE(cabVO)) {
                        notasEletronicasConfirmadas.add(cabVO.asInt("NUNOTA"));
                    }
                }

                if (!notasParaExclusao.contains(nuNota)) {
                    XMLUtils.addContentElement(notasElement, "nota", "", new Attribute[]{new Attribute("NUNOTA", nuNota.toString())});
                }
            }

            notasParaExclusao.add(nuNota);
            this.reverterSeriesLiberadosApontamento(idiproc, new BigDecimal(nuNota), operacaoEstoqueVO.asBigDecimal("CODPRODPA"));

            try {
                PersistentLocalEntity produtoAcabadoProduzirEntity = this.dwfEntityFacade.findEntityByPrimaryKey("ProdutoAcabadoAProduzir", new Object[]{idiproc, operacaoEstoqueVO.asBigDecimal("CODPRODPA"), operacaoEstoqueVO.asString("CONTROLEPA")});
                DynamicVO produtoAcabadoProduzirVO = (DynamicVO)produtoAcabadoProduzirEntity.getValueObject();
                if ("S".equals(produtoAcabadoProduzirVO.asString("CONCLUIDO"))) {
                    produtoAcabadoProduzirVO.setProperty("CONCLUIDO", "N");
                    produtoAcabadoProduzirEntity.setValueObject((EntityVO)produtoAcabadoProduzirVO);
                }
            } catch (ObjectNotFoundException var17) {
            }
        }

        this.validaRemoverApontamentoComOperacaoEncadeada(nuapo, idiproc);
        if (!notasEletronicasConfirmadas.isEmpty()) {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00378", new Exception(String.format("Não é possível excluir o apontamento, pois alguns dos documentos %s gerados pela confirmação do apontamento é um documento eletrônico (NF-e, NFS-e ou CT-e), cancele esses documentos antes de excluir o apontamento.", notasEletronicasConfirmadas.toString())));
        } else if (!notasConfirmadas.isEmpty() && mostrarEvtConfirmaExclusaoApontamento && !mostrarEvtConfirmaExclusaoPesagem) {
            Element mensagem = new Element("mensagem");
            mensagem.addContent(String.format("Existem documentos %s já confirmados ligado ao apontamento e esses serão excluídos. Deseja continuar?", notasConfirmadas.toString()));
            ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.ordem.producao.exclusao.apontamento", mensagem);
            throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00379", new ServiceCanceledException());
        } else {
            this.validaExistirPesagemVolume(nuapo, mostrarEvtConfirmaExclusaoPesagem);
            if (!notasParaExclusao.isEmpty()) {
                JapeSessionContext.putProperty("br.com.sankhya.mgeprod.rotina.producao", Boolean.TRUE);
                CACHelper cacHelper = new CACHelper();
                cacHelper.excluirNotas(ctx);
                this.dwfEntityFacade.removeByCriteria(new FinderWrapper("FaturamentoDeApontamento", "$IN{this.NUNOTA}IN$ inCollection[] ", new Object[]{notasParaExclusao}));
                this.dwfEntityFacade.removeByCriteria(new FinderWrapper("RegistroOperacaoEstoque", "this.NUAPO = ? ", new Object[]{nuapo}));
            }

            JapeSession.putProperty("br.com.sankhya.valida.operacoes.estoque.exclusao.apontamento", false);
            this.removeConferenciaApontamento(nuapo);
            this.dwfEntityFacade.removeByCriteria(new FinderWrapper("SerieMateriaPrima", "this.NUAPO = ? ", new Object[]{nuapo}));
            this.dwfEntityFacade.removeByCriteria(new FinderWrapper("ApontamentoPA", "this.NUAPO = ? ", new Object[]{nuapo}));
            this.dwfEntityFacade.removeEntity("CabecalhoApontamento", new Object[]{nuapo});
        }
    }

    private void removeConferenciaApontamento(BigDecimal nuapo) throws Exception {
        Collection<DynamicVO> conferenciasListVO = this.dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("CabecalhoConfProducao", "this.NUAPO = ? ", new Object[]{nuapo}));
        List<Integer> listNunConferencias = new ArrayList();

        for(DynamicVO cabecalhoConfVO : conferenciasListVO) {
            if (!listNunConferencias.contains(cabecalhoConfVO.asInt("NUCONF"))) {
                listNunConferencias.add(cabecalhoConfVO.asInt("NUCONF"));
            }
        }

        if (listNunConferencias.size() > 0) {
            this.dwfEntityFacade.removeByCriteria(new FinderWrapper("ItemConferenciaProducao", "$IN{this.NUCONF}IN$ inCollection[]", new Object[]{listNunConferencias}));
            this.dwfEntityFacade.removeByCriteria(new FinderWrapper("CabecalhoConfProducao", "$IN{this.NUCONF}IN$ inCollection[]", new Object[]{listNunConferencias}));
        }

    }

    private void validaAtividadeApontamentoJaFinalizada(BigDecimal nuapo) throws Exception, SQLException {
        JdbcWrapper jdbc = EntityFacadeFactory.getCoreFacade().getJdbcWrapper();
        NativeSql queAtivadeFinalizada = new NativeSql(jdbc);
        queAtivadeFinalizada.appendSql(" SELECT IATV.IDIPROC, IATV.DHFINAL ");
        queAtivadeFinalizada.appendSql(" \tFROM TPRIATV IATV, TPRAPO APO ");
        queAtivadeFinalizada.appendSql(" WHERE IATV.IDIATV  = APO.IDIATV ");
        queAtivadeFinalizada.appendSql("\t AND APO.NUAPO = :NUAPO ");
        queAtivadeFinalizada.appendSql("\t AND IATV.DHFINAL IS NOT NULL");
        queAtivadeFinalizada.setNamedParameter("NUAPO", nuapo);
        ResultSet result = queAtivadeFinalizada.executeQuery();
        if (result.next()) {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00380", new Exception("Atividade já finalizada apontamento não poderá ser excluído."));
        } else {
            result.close();
        }
    }

    private void reverterSeriesLiberadosApontamento(BigDecimal idiproc, BigDecimal nuNota, BigDecimal codprodPA) throws Exception {
        Collection<DynamicVO> listSerieProdVO = this.dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("SerieProduto", " this.NUNOTA = ?", new Object[]{nuNota}));
        String entityName = null;
        if (!listSerieProdVO.isEmpty()) {
            for(DynamicVO serieVO : listSerieProdVO) {
                Collection<DynamicVO> listVO = this.dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("SerieProdutoAcabado", " this.IDIPROC = ? AND this.CODPRODPA = ? AND this.SERIEPA = ?", new Object[]{idiproc, serieVO.asBigDecimal("CODPROD"), serieVO.asString("SERIE")}));
                if (!listVO.isEmpty()) {
                    entityName = "SerieProdutoAcabado";
                } else {
                    entityName = "SerieMateriaPrima";
                }

                PersistentLocalEntity entity = this.dwfEntityFacade.findEntityByPrimaryKey(entityName, new Object[]{idiproc, serieVO.asBigDecimal("CODPROD"), serieVO.asString("SERIE")});
                DynamicVO serVO = (DynamicVO)entity.getValueObject();
                serVO.setProperty("LIBERADO", "N");
                if ("SerieProdutoAcabado".equals(entityName)) {
                    serVO.setProperty("NUAPO", (Object)null);
                }

                entity.setValueObject((EntityVO)serVO);
            }

            this.dwfEntityFacade.removeByCriteria(new FinderWrapper("SerieProduto", "this.NUNOTA = ? ", new Object[]{nuNota}));
        }

        JapeWrapper seriesPaDAO = JapeFactory.dao("SerieProdutoAcabado");

        for(DynamicVO seriePaPerda : seriesPaDAO.find("this.IDIPROC = ? AND this.CODPRODPA = ? AND this.PERDA = 'S'", new Object[]{idiproc, codprodPA})) {
            FluidUpdateVO updateSeriePA = seriesPaDAO.prepareToUpdate(seriePaPerda);
            updateSeriePA.set("LIBERADO", "N");
            updateSeriePA.set("NUAPO", (Object)null);
            updateSeriePA.update();
        }

    }

    public Element getListaMPsMovimentacaoManual(BigDecimal idIprocPA, BigDecimal idEfx, BigDecimal seqOper, BigDecimal idProc, String tipoMaterial, ProdutoControle produtoControlePA) throws Exception {
        JdbcWrapper jdbc = null;
        ResultSet rsetListaMPs = null;
        String tipoItens = null;
        BigDecimal idefxBase = BigDecimal.ZERO;
        JapeWrapper operacoesEstoqueDAO = JapeFactory.dao("OperacoesEstoque");
        if (idEfx != null) {
            try {
                DynamicVO operacoesEstoqueVO = operacoesEstoqueDAO.findByPK(new Object[]{idEfx, seqOper});
                tipoItens = operacoesEstoqueVO.asString("TIPOITENS");
                idefxBase = operacoesEstoqueVO.asBigDecimal("IDEFXBASE");
            } catch (ObjectNotFoundException var26) {
            }
        } else {
            DynamicVO operacoesEstoqueVO = operacoesEstoqueDAO.findOne("this.IDEFX IN (SELECT EFX.IDEFX FROM TPREFX EFX WHERE EFX.TIPO = '1111' AND EFX.IDPROC = ?) AND this.SEQOPER = ?", new Object[]{idProc, seqOper});
            if (operacoesEstoqueVO != null) {
                tipoItens = operacoesEstoqueVO.asString("TIPOITENS");
                idEfx = operacoesEstoqueVO.asBigDecimal("IDEFX");
                idefxBase = operacoesEstoqueVO.asBigDecimal("IDEFXBASE");
            }
        }

        Element registrosElem = new Element("materiais");
        String tipoMov = "";
        if (idEfx != null) {
            tipoMov = this.getTipoMovTOP(idEfx, seqOper, false);
            XMLUtils.setAttibuteValue(registrosElem, "TIPOMOV", tipoMov);
        }

        try {
            jdbc = this.dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            NativeSql queListaMPs = new NativeSql(jdbc);
            queListaMPs.loadSql(this.getClass(), "OrdemProducao_queListaMPsMovimentoManual.sql");
            if (idEfx != null && (tipoItens == null || !"MT".equals(tipoItens))) {
                queListaMPs.removeSQLComment("OPERACAO_POR_ATV");
            }

            BigDecimal idEfxOper = idEfx;
            if (idefxBase != null && "MB".equals(tipoItens)) {
                idEfxOper = idefxBase;
            }

            queListaMPs.setNamedParameter("IDEFX", idEfx);
            queListaMPs.setNamedParameter("IDEFXOPER", idEfxOper);
            queListaMPs.setNamedParameter("SEQOPER", seqOper);
            queListaMPs.setNamedParameter("IDPROC", idProc);
            queListaMPs.setNamedParameter("CODPRODPA", produtoControlePA.getCodProd());
            queListaMPs.setNamedParameter("CONTROLEPA", produtoControlePA.getControle());
            rsetListaMPs = queListaMPs.executeQuery();

            while(true) {
                BigDecimal codLocalOrig;
                String descrLocalOrig;
                BigDecimal codLocalDest;
                String descrLocalDest;
                while(true) {
                    if (!rsetListaMPs.next()) {
                        return registrosElem;
                    }

                    codLocalOrig = BigDecimal.ZERO;
                    descrLocalOrig = "<SEM LOCAL>";
                    codLocalDest = BigDecimal.ZERO;
                    descrLocalDest = "<SEM LOCAL>";
                    if ("AB".equals(tipoMaterial)) {
                        break;
                    }

                    try {
                        this.dwfEntityFacade.findEntityByPrimaryKeyAsVO("ProdutoIntermediarioProcesso", new Object[]{idProc, rsetListaMPs.getBigDecimal("CODPRODPA"), ComercialUtils.trimControleEstoque(rsetListaMPs.getString("CONTROLEPA")), rsetListaMPs.getBigDecimal("CODPRODMP"), ComercialUtils.trimControleEstoque(rsetListaMPs.getString("CONTROLEMP"))});
                        if (!"PI".equals(tipoMaterial)) {
                            continue;
                        }
                    } catch (ObjectNotFoundException var27) {
                        if ("PI".equals(tipoMaterial)) {
                            continue;
                        }
                    }
                    break;
                }

                if (idEfx == null) {
                    tipoMov = this.getTipoMovTOP(rsetListaMPs.getBigDecimal("IDEFX"), seqOper, false);
                    XMLUtils.setAttibuteValue(registrosElem, "TIPOMOV", tipoMov);
                }

                if ("S".equals(rsetListaMPs.getString("USALOCAL"))) {
                    if ("S".equals(rsetListaMPs.getString("UTILIZALOCALORIG"))) {
                        codLocalOrig = rsetListaMPs.getBigDecimal("CODLOCALORIG_OPER");
                        descrLocalOrig = rsetListaMPs.getString("DESCRLOCALORIG_OPER");
                    } else {
                        codLocalOrig = rsetListaMPs.getBigDecimal("CODLOCALORIG");
                        descrLocalOrig = rsetListaMPs.getString("DESCRLOCALORIG");
                    }

                    if ("T".equals(tipoMov)) {
                        codLocalDest = rsetListaMPs.getBigDecimal("CODLOCALDEST");
                        descrLocalDest = rsetListaMPs.getString("DESCRLOCALDEST");
                    }
                }

                String controleMP = rsetListaMPs.getString("CONTROLEMP");
                if ("L".equals(rsetListaMPs.getString("TIPCONTEST")) && "N".equals(rsetListaMPs.getString("ESTOQUETERCEIRO"))) {
                    ProdutoControle produtoControleMP = new ProdutoControle(rsetListaMPs.getBigDecimal("CODPRODMP"), rsetListaMPs.getString("CONTROLEMP"));
                    controleMP = this.getLoteSubOrdemPI(idProc, idIprocPA, produtoControlePA, produtoControleMP);
                }

                Element registroElem = new Element("materiaPrima");
                XMLUtils.setAttibuteValue(registroElem, "CODPRODMP", rsetListaMPs.getBigDecimal("CODPRODMP"));
                XMLUtils.setAttibuteValue(registroElem, "DESCRMP", rsetListaMPs.getString("DESCRMP"));
                XMLUtils.setAttibuteValue(registroElem, "REFERENCIA", rsetListaMPs.getString("REFERENCIA"));
                XMLUtils.setAttibuteValue(registroElem, "MARCA", rsetListaMPs.getString("MARCA"));
                XMLUtils.setAttibuteValue(registroElem, "COMPLEMENTO", rsetListaMPs.getString("COMPLEMENTO"));
                XMLUtils.setAttibuteValue(registroElem, "CONTROLEMP", controleMP);
                XMLUtils.setAttibuteValue(registroElem, "QTDPREV", rsetListaMPs.getBigDecimal("QTDPREV"));
                XMLUtils.setAttibuteValue(registroElem, "QTDMOV", rsetListaMPs.getBigDecimal("QTDMOV"));
                XMLUtils.setAttibuteValue(registroElem, "UNIDADE", rsetListaMPs.getString("UNIDADE"));
                XMLUtils.setAttibuteValue(registroElem, "DESCRVOL", rsetListaMPs.getString("DESCRVOL"));
                XMLUtils.setAttibuteValue(registroElem, "DECQTD", rsetListaMPs.getBigDecimal("DECQTD"));
                XMLUtils.setAttibuteValue(registroElem, "CODLOCALORIG", codLocalOrig);
                XMLUtils.setAttibuteValue(registroElem, "DESCRLOCALORIG", descrLocalOrig);
                XMLUtils.setAttibuteValue(registroElem, "CODLOCALDEST", codLocalDest);
                XMLUtils.setAttibuteValue(registroElem, "DESCRLOCALDEST", descrLocalDest);
                XMLUtils.setAttibuteValue(registroElem, "TIPCONTEST", rsetListaMPs.getString("TIPCONTEST"));
                XMLUtils.setAttibuteValue(registroElem, "LISCONTEST", rsetListaMPs.getString("LISCONTEST"));
                XMLUtils.setAttibuteValue(registroElem, "USALOCAL", rsetListaMPs.getString("USALOCAL"));
                XMLUtils.setAttibuteValue(registroElem, "TIPOQTD", rsetListaMPs.getString("TIPOQTD"));
                registrosElem.addContent(registroElem);
            }
        } finally {
            JdbcUtils.closeResultSet(rsetListaMPs);
            JdbcWrapper.closeSession(jdbc);
        }
    }

    private String getLoteSubOrdemPI(BigDecimal idProcessoPA, BigDecimal idIprocPA, ProdutoControle produtoControlePA, ProdutoControle produtoControleMP) throws Exception {
        String lotePI = produtoControleMP.getControle();
        BigDecimal processoPI = ProducaoUtils.getProcessoPI(produtoControleMP, TipoProcesso.PRODUCAO);
        boolean isMateriaPrimaEhPI = processoPI != null;
        if (isMateriaPrimaEhPI) {
            boolean isConsideraLotePiNaMovAcessoria = this.isConsideraLotePiNaMovAcessoria(idProcessoPA, produtoControlePA, produtoControleMP);
            if (isConsideraLotePiNaMovAcessoria) {
                lotePI = this.getLotePI(idIprocPA, produtoControlePA, produtoControleMP);
            }
        }

        return lotePI;
    }

    public String getLotePI(BigDecimal idIprocPA, ProdutoControle produtoControlePA, ProdutoControle produtoControleMP) throws Exception {
        if (idIprocPA == null) {
            return " ";
        } else {
            JapeWrapper dependenciaEntreOpsDAO = JapeFactory.dao("DependenciaEntreOps");
            JapeWrapper produtoAcabadoProduzirDAO = JapeFactory.dao("ProdutoAcabadoAProduzir");
            StringBuilder strWhere = new StringBuilder();
            strWhere.append("this.IDIPROCPA = ? AND this.CODPRODPA = ? AND this.CONTROLEPA = ? AND this.CODPRODPI = ? AND this.CONTROLEPI = ?");
            DynamicVO dependenciaEntreOpsVO = dependenciaEntreOpsDAO.findOne(strWhere.toString(), new Object[]{idIprocPA, produtoControlePA.getCodProd(), produtoControlePA.getControle(), produtoControleMP.getCodProd(), produtoControleMP.getControle()});
            BigDecimal idIprocPI = dependenciaEntreOpsVO != null ? dependenciaEntreOpsVO.asBigDecimal("IDIPROCPI") : BigDecimal.ZERO;
            DynamicVO produtoAcabadoProduzirVO = produtoAcabadoProduzirDAO.findOne("this.IDIPROC = ? AND this.CODPRODPA = ? AND this.CONTROLEPA = ?", new Object[]{idIprocPI, produtoControleMP.getCodProd(), produtoControleMP.getControle()});
            return produtoAcabadoProduzirVO != null ? produtoAcabadoProduzirVO.asString("NROLOTE") : "";
        }
    }

    public boolean isConsideraLotePiNaMovAcessoria(BigDecimal idProcPA, ProdutoControle produtoControlePA, ProdutoControle produtoControleMP) throws Exception {
        JapeWrapper produtoIntermediarioProcessoDAO = JapeFactory.dao("ProdutoIntermediarioProcesso");
        DynamicVO produtoIntermediarioProcessoVO = produtoIntermediarioProcessoDAO.findByPK(new Object[]{idProcPA, produtoControlePA.getCodProd(), produtoControlePA.getControle(), produtoControleMP.getCodProd(), produtoControleMP.getControle()});
        DynamicVO produtoVO = (DynamicVO)this.dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{produtoControlePA.getCodProd()});
        return produtoIntermediarioProcessoVO != null && "O".equals(produtoIntermediarioProcessoVO.asString("TIPOPI")) && "L".equals(produtoVO.asString("TIPCONTEST")) ? produtoIntermediarioProcessoVO.asBoolean("CONSIDERALOTEPI") : false;
    }

    private String getTipoMovTOP(BigDecimal idEfx, BigDecimal seqOper, boolean isOperEncadeada) throws Exception {
        String tipoMov = "";
        BigDecimal codTipOper = null;
        String strCodTipoOper = "CODTIPOPER";
        String strEntityCabecalhoNota = "CabecalhoNota";
        if (isOperEncadeada) {
            strCodTipoOper = "CODTIPOPERENCAD";
            strEntityCabecalhoNota = "CabecalhoNota2";
        }

        JapeWrapper operacoesEstoqueDAO = JapeFactory.dao("OperacoesEstoque");
        DynamicVO operacoesEstoqueVO = operacoesEstoqueDAO.findByPK(new Object[]{idEfx, seqOper});
        if (operacoesEstoqueVO.asBigDecimal(strCodTipoOper) != null) {
            codTipOper = operacoesEstoqueVO.asBigDecimal(strCodTipoOper);
        } else if (!isOperEncadeada && operacoesEstoqueVO.asBigDecimal("CODTIPOPERPERDA") != null) {
            codTipOper = operacoesEstoqueVO.asBigDecimal("CODTIPOPERPERDA");
        } else {
            DynamicVO notaModeloVO = operacoesEstoqueVO.asDymamicVO(strEntityCabecalhoNota);
            codTipOper = notaModeloVO.asBigDecimal("CODTIPOPER");
        }

        JapeWrapper tipoOperacaoDAO = JapeFactory.dao("TipoOperacao");
        DynamicVO tipoOperacaoVO = tipoOperacaoDAO.findOne("this.CODTIPOPER = ?", new Object[]{codTipOper});
        tipoMov = tipoOperacaoVO.asString("TIPMOV");
        return tipoMov;
    }

    public Element getListaPAsMovimentacaoManual(BigDecimal idEfx, BigDecimal seqOper, BigDecimal idProc, BigDecimal idIatv, BigDecimal idIproc) throws Exception {
        JdbcWrapper jdbc = null;
        ResultSet rsetListaPAs = null;
        String tipoMov = "";
        JapeWrapper itemNotaDAO = JapeFactory.dao("ItemNota");
        StringBuffer strItemNotaEncadeadaWhere = new StringBuffer(" this.CODPROD = ? AND (nullValue(this.CONTROLE, ' ') = ' ' OR this.CONTROLE = ?) ");
        strItemNotaEncadeadaWhere.append(" AND EXISTS (SELECT 1 FROM TPRROPE ROPE INNER JOIN TPROEST OEST ON (OEST.IDEFX = ROPE.IDEFX AND OEST.SEQOPER = ROPE.SEQOPER) ");
        strItemNotaEncadeadaWhere.append("\t\t\t INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = ROPE.NUNOTA) ");
        strItemNotaEncadeadaWhere.append("\t\t\t INNER JOIN TGFTOP TP ON (TP.CODTIPOPER = CAB.CODTIPOPER) ");
        strItemNotaEncadeadaWhere.append("\t\t\t WHERE OEST.NUMODELOENCAD IS NOT NULL AND OEST.IDEFX = ? AND OEST.SEQOPER = ? AND ROPE.IDIATV = ? ");
        strItemNotaEncadeadaWhere.append("\t\t\t AND TP.TIPMOV <> 'F' AND TP.DHALTER = (SELECT MAX(T.DHALTER) FROM TGFTOP T WHERE T.CODTIPOPER = TP.CODTIPOPER)) ");
        strItemNotaEncadeadaWhere.append(" AND this.NUNOTA IN (SELECT ROPE.NUNOTA FROM TPRROPE ROPE INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = ROPE.NUNOTA) ");
        strItemNotaEncadeadaWhere.append("\t\t\t\t\t   WHERE CAB.TIPMOV <> 'F' AND ROPE.NUAPO IS NULL AND ROPE.IDIATV = ? AND ROPE.IDEFX = ? AND ROPE.SEQOPER = ?) ");
        StringBuffer strItemNotaProducaoWhere = new StringBuffer(" this.PENDENTE = 'N' AND this.CODPROD = ? AND (nullValue(this.CONTROLE, ' ') = ' ' OR this.CONTROLE = ?) ");
        strItemNotaProducaoWhere.append(" AND EXISTS (SELECT 1 FROM TPRROPE ROPE INNER JOIN TPROEST OEST ON (OEST.IDEFX = ROPE.IDEFX AND OEST.SEQOPER = ROPE.SEQOPER) ");
        strItemNotaProducaoWhere.append("\t\t\t INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = ROPE.NUNOTA) ");
        strItemNotaProducaoWhere.append("\t\t\t INNER JOIN TGFTOP TP ON (TP.CODTIPOPER = CAB.CODTIPOPER) ");
        strItemNotaProducaoWhere.append("\t\t\t WHERE OEST.NUMODELOENCAD IS NOT NULL AND OEST.IDEFX = ? AND OEST.SEQOPER = ? AND ROPE.IDIATV = ? ");
        strItemNotaProducaoWhere.append("\t\t\t AND TP.TIPMOV = 'F' AND TP.DHALTER = (SELECT MAX(T.DHALTER) FROM TGFTOP T WHERE T.CODTIPOPER = TP.CODTIPOPER)) ");
        strItemNotaProducaoWhere.append(" AND this.NUNOTA IN (SELECT ROPE.NUNOTA FROM TPRROPE ROPE INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = ROPE.NUNOTA) ");
        strItemNotaProducaoWhere.append("\t\t\t\t\t   WHERE CAB.TIPMOV = 'F' AND ROPE.IDIATV = ? AND ROPE.IDEFX = ? AND ROPE.SEQOPER = ?) ");
        Element registrosElem = new Element("pas");

        try {
            jdbc = this.dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            if (idEfx != null) {
                tipoMov = this.getTipoMovTOP(idEfx, seqOper, true);
            }

            NativeSql queListaPAs = new NativeSql(jdbc);
            queListaPAs.loadSql(this.getClass(), "OrdemProducao_queListaPAsMovimentoManual.sql");
            queListaPAs.setNamedParameter("IDEFX", idEfx);
            queListaPAs.setNamedParameter("SEQOPER", seqOper);
            queListaPAs.setNamedParameter("IDPROC", idProc);
            queListaPAs.setNamedParameter("IDIPROC", idIproc);
            rsetListaPAs = queListaPAs.executeQuery();

            while(rsetListaPAs.next()) {
                boolean isProcessoUsaLoteCuringa = "MN".equals(rsetListaPAs.getString("TIPONROLOTE")) && StringUtils.isNotEmpty(rsetListaPAs.getString("LOTECURINGA"));
                if (!isProcessoUsaLoteCuringa || !rsetListaPAs.getString("LOTECURINGA").equals(rsetListaPAs.getString("CONTROLEPA"))) {
                    BigDecimal codLocalDest = BigDecimal.ZERO;
                    String descrLocalDest = "<SEM LOCAL>";
                    if ("S".equals(rsetListaPAs.getString("USALOCAL")) && "T".equals(tipoMov)) {
                        codLocalDest = rsetListaPAs.getBigDecimal("CODLOCALDEST");
                        descrLocalDest = rsetListaPAs.getString("DESCRLOCALDEST");
                    }

                    Collection<Object> params = new ArrayList();
                    params.add(rsetListaPAs.getBigDecimal("CODPRODPA"));
                    String controle = rsetListaPAs.getString("CONTROLEPA");
                    if ("L".equals(rsetListaPAs.getString("TIPCONTEST")) && !isProcessoUsaLoteCuringa) {
                        controle = rsetListaPAs.getString("NROLOTE");
                    }

                    params.add(controle);
                    params.add(idEfx);
                    params.add(seqOper);
                    params.add(idIatv);
                    params.add(idIatv);
                    params.add(idEfx);
                    params.add(seqOper);
                    if ("T".equals(tipoMov)) {
                        strItemNotaEncadeadaWhere.append(" AND this.ATUALESTOQUE > 0 ");
                    }

                    Collection<DynamicVO> itensNotaEncadeadaVO = itemNotaDAO.find(strItemNotaEncadeadaWhere.toString(), params.toArray());
                    BigDecimal qtdItemNotaEncadeada = BigDecimal.ZERO;

                    for(DynamicVO itemNotaEncadeadaVO : itensNotaEncadeadaVO) {
                        qtdItemNotaEncadeada = qtdItemNotaEncadeada.add(itemNotaEncadeadaVO.asBigDecimalOrZero("QTDNEG"));
                    }

                    Collection<DynamicVO> itensNotaProducaoVO = itemNotaDAO.find(strItemNotaProducaoWhere.toString(), params.toArray());
                    BigDecimal qtdItemNotaProducao = BigDecimal.ZERO;

                    for(DynamicVO itemNotaProducaoVO : itensNotaProducaoVO) {
                        qtdItemNotaProducao = qtdItemNotaProducao.add(itemNotaProducaoVO.asBigDecimalOrZero("QTDNEG"));
                    }

                    BigDecimal saldo = qtdItemNotaProducao.subtract(qtdItemNotaEncadeada);
                    Element registroElem = new Element("produtoAcabado");
                    XMLUtils.setAttibuteValue(registroElem, "CODPRODPA", rsetListaPAs.getBigDecimal("CODPRODPA"));
                    XMLUtils.setAttibuteValue(registroElem, "DESCRPA", rsetListaPAs.getString("DESCRPA"));
                    XMLUtils.setAttibuteValue(registroElem, "REFERENCIA", rsetListaPAs.getString("REFERENCIA"));
                    XMLUtils.setAttibuteValue(registroElem, "MARCA", rsetListaPAs.getString("MARCA"));
                    XMLUtils.setAttibuteValue(registroElem, "COMPLEMENTO", rsetListaPAs.getString("COMPLEMENTO"));
                    XMLUtils.setAttibuteValue(registroElem, "CONTROLEPA", controle);
                    XMLUtils.setAttibuteValue(registroElem, "SALDO", saldo);
                    XMLUtils.setAttibuteValue(registroElem, "QTDMOV", saldo);
                    XMLUtils.setAttibuteValue(registroElem, "DECQTD", rsetListaPAs.getBigDecimal("DECQTD"));
                    XMLUtils.setAttibuteValue(registroElem, "CODLOCALDEST", codLocalDest);
                    XMLUtils.setAttibuteValue(registroElem, "DESCRLOCALDEST", descrLocalDest);
                    XMLUtils.setAttibuteValue(registroElem, "TIPCONTEST", rsetListaPAs.getString("TIPCONTEST"));
                    XMLUtils.setAttibuteValue(registroElem, "LISCONTEST", rsetListaPAs.getString("LISCONTEST"));
                    XMLUtils.setAttibuteValue(registroElem, "USALOCAL", rsetListaPAs.getString("USALOCAL"));
                    registrosElem.addContent(registroElem);
                }
            }
        } finally {
            JdbcUtils.closeResultSet(rsetListaPAs);
            JdbcWrapper.closeSession(jdbc);
        }

        return registrosElem;
    }

    private void validaRemoverApontamentoComOperacaoEncadeada(BigDecimal nuApo, BigDecimal idIproc) throws Exception, SQLException {
        JdbcWrapper jdbc = null;
        NativeSql queryQtdNotas = null;
        ResultSet rsetQueryQtdNotas = null;
        JapeWrapper apontamentoPaDAO = JapeFactory.dao("ApontamentoPA");
        JapeWrapper cabecalhoNotaDAO = JapeFactory.dao("CabecalhoNota");
        DynamicVO cabecalhoNotaVO = cabecalhoNotaDAO.findOne("this.TIPMOV = 'F' AND this.NUNOTA IN (SELECT NUNOTA FROM TPRROPE WHERE NUAPO = ?)", new Object[]{nuApo});
        BigDecimal nuNotaProducao = cabecalhoNotaVO != null ? cabecalhoNotaVO.asBigDecimal("NUNOTA") : null;

        try {
            jdbc = EntityFacadeFactory.getCoreFacade().getJdbcWrapper();
            queryQtdNotas = new NativeSql(jdbc);
            queryQtdNotas.loadSql(this.getClass(), "OrdemProducaoHelper_queValidaRemoveApontamentoEncadeada.sql");
            queryQtdNotas.setReuseStatements(true);

            for(DynamicVO apontamentoPaVO : apontamentoPaDAO.find("this.NUAPO = ?", new Object[]{nuApo})) {
                BigDecimal codProdPA = apontamentoPaVO.asBigDecimal("CODPRODPA");
                String controlePA = ComercialUtils.trimControleEstoque(apontamentoPaVO.asString("CONTROLEPA"));
                BigDecimal qtdApontamentoRemove = apontamentoPaVO.asBigDecimal("QTDAPONTADA");
                queryQtdNotas.setNamedParameter("CODPRODPA", codProdPA);
                queryQtdNotas.setNamedParameter("CONTROLEPA", controlePA);
                queryQtdNotas.setNamedParameter("IDIPROC", idIproc);
                rsetQueryQtdNotas = queryQtdNotas.executeQuery();
                BigDecimal qtdEncadeada = BigDecimal.ZERO;
                BigDecimal qtdProducao = BigDecimal.ZERO;

                while(rsetQueryQtdNotas.next()) {
                    if ("ENCADEADA".equals(rsetQueryQtdNotas.getString("TIPO"))) {
                        qtdEncadeada = qtdEncadeada.add(rsetQueryQtdNotas.getBigDecimal("QTD"));
                    } else {
                        qtdProducao = qtdProducao.add(rsetQueryQtdNotas.getBigDecimal("QTD"));
                    }
                }

                rsetQueryQtdNotas.close();
                if (!(qtdEncadeada.doubleValue() <= (double)0.0F)) {
                    double saldo = qtdProducao.doubleValue() - qtdApontamentoRemove.doubleValue() - qtdEncadeada.doubleValue();
                    if (saldo < qtdEncadeada.doubleValue()) {
                        BigDecimal saldoProducao = ProducaoUtils.getValorArredondadoPorDecQtd(codProdPA, BigDecimal.valueOf(saldo));
                        BigDecimal saldoEncadeada = ProducaoUtils.getValorArredondadoPorDecQtd(codProdPA, qtdEncadeada);
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00501", new Exception("Impossível excluir a nota de produção [" + nuNotaProducao + "], pois o saldo de produto acabado que permanecerá na atividade (Qtd: " + saldoProducao + ") será menor que a quantidade movimentada pelas operações encadeadas  (Qtd: " + saldoEncadeada + "). Antes de remover o apontamento, é necessário remover as notas geradas por operações encadeadas na atividade."));
                    }
                }
            }
        } finally {
            JdbcUtils.closeResultSet(rsetQueryQtdNotas);
            JdbcWrapper.closeSession(jdbc);
            NativeSql.releaseResources(queryQtdNotas);
        }

    }

    public void removeLiberacaoSolicitada(BigDecimal nuChave, String tabela, int evento) throws Exception {
        JapeWrapper liberacaoLimiteDAO = JapeFactory.dao("LiberacaoLimite");

        for(DynamicVO liberacaoLimiteVO : liberacaoLimiteDAO.find("this.NUCHAVE = ? AND this.TABELA = ? and this.EVENTO = ?", new Object[]{nuChave, tabela, evento})) {
            if (liberacaoLimiteVO.asBigDecimal("NUCLL").intValue() != 0) {
                OperacaoProducaoHelper.getInstance().apagaSolicitacaoEventoMP(nuChave, tabela, evento, liberacaoLimiteVO.asBigDecimal("SEQUENCIA"), liberacaoLimiteVO.asBigDecimal("NUCLL"));
            } else {
                LiberacaoAlcadaHelper.apagaSolicitacoEvento(evento, nuChave, tabela, liberacaoLimiteVO.asBigDecimal("SEQUENCIA"));
            }
        }

    }

    private void validaExistirPesagemVolume(BigDecimal nuApo, boolean mostrarEvtConfirmaExclusaoPesagem) throws Exception {
        JapeWrapper apontamentoVolumesDAO = JapeFactory.dao("ApontamentoVolumes");
        DynamicVO apontamentoVolumesVO = apontamentoVolumesDAO.findOne("this.NUAPO = ?", new Object[]{nuApo});
        if (apontamentoVolumesVO != null) {
            if (!mostrarEvtConfirmaExclusaoPesagem) {
                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.prod.remove.apontamento.pesagemvolume", (Element)null);
                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00542", new ServiceCanceledException());
            }

            apontamentoVolumesDAO.deleteByCriteria("this.IDIPROC = ? AND this.IDIATV = ? AND this.NUAPO = ?", new Object[]{apontamentoVolumesVO.asBigDecimal("IDIPROC"), apontamentoVolumesVO.asBigDecimal("IDIATV"), apontamentoVolumesVO.asBigDecimal("NUAPO")});
        }

    }

    public JsonElement getPlanejadoRealizadoPrevisto(Map<String, Object> params, ServiceContext context) throws Exception {
        NativeSql queryPlanejadoRealizadoPrevisto = null;
        JdbcWrapper jdbc = null;
        ResultSet resultSet = null;
        JsonElement listJsonElement = null;
        List<PlanejadoRealizadoPrevisto> listaPlanejadoRealizadoPrevisto = new ArrayList();

        try {
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            queryPlanejadoRealizadoPrevisto = new NativeSql(jdbc);
            queryPlanejadoRealizadoPrevisto.loadSql(this.getClass(), "OrdemProducaoHelper_queryPlanejadoRealizadoPrevisto.sql");
            queryPlanejadoRealizadoPrevisto.setNamedParameter("NUMPS", params.get("nroPlano"));
            if (params.get("considerarAtividadesExecucao").toString().equals("S")) {
                StringBuffer where = new StringBuffer();
                where.append(" AND IATV.DHFINAL IS NOT NULL ");
                StringUtils.replaceString("/* ${WHERE_FILTRO_DHFINAL} */", where.toString(), queryPlanejadoRealizadoPrevisto.getSqlBuf());
            } else {
                StringBuffer where = new StringBuffer();
                where.append(" AND IATV.DHFINAL IS NULL ");
                StringUtils.replaceString("/* ${WHERE_FILTRO_DHFINAL} */", where.toString(), queryPlanejadoRealizadoPrevisto.getSqlBuf());
            }

            if (params.get("codWCList") != null) {
                StringBuffer where = new StringBuffer();
                where.append(" AND " + SQLUtils.buildINClauseByValues("PIPROC.CODCWC", params.get("codWCList").toString()));
                StringUtils.replaceString("/* ${WHERE_FILTRO_CODCWC} */", where.toString(), queryPlanejadoRealizadoPrevisto.getSqlBuf());
            }

            if (params.get("catWCList") != null) {
                StringBuffer where = new StringBuffer();
                where.append(" AND " + SQLUtils.buildINClauseByValues("PIPROC.CODWCP", params.get("catWCList").toString()));
                StringUtils.replaceString("/* ${WHERE_FILTRO_CODWCP} */", where.toString(), queryPlanejadoRealizadoPrevisto.getSqlBuf());
            }

            resultSet = queryPlanejadoRealizadoPrevisto.executeQuery();
            listaPlanejadoRealizadoPrevisto.addAll(this.getListaPlanejadoRealizadoPrevisto(resultSet));
        } finally {
            NativeSql.releaseResources(queryPlanejadoRealizadoPrevisto);
            JdbcUtils.closeResultSet(resultSet);
            JdbcWrapper.closeSession(jdbc);
        }

        this.getIndicadores(listaPlanejadoRealizadoPrevisto, context);
        return listJsonElement;
    }

    private List<PlanejadoRealizadoPrevisto> getListaPlanejadoRealizadoPrevisto(ResultSet resultSet) throws SQLException {
        List<PlanejadoRealizadoPrevisto> listaPlanejadoRealizadoPrevistoPrevisto = new ArrayList();

        while(resultSet.next()) {
            PlanejadoRealizadoPrevisto planejado = new PlanejadoRealizadoPrevisto();
            planejado.setNumOP(resultSet.getString("NUMOP"));
            planejado.setAtividade(resultSet.getString("ATIVIDADE"));
            planejado.setCategoriaCentroTrabalho(resultSet.getString("CATEGORIACENTROTRABALHO"));
            planejado.setCentroTrabalho(resultSet.getString("CENTROTRABALHO"));
            planejado.setCentrosDeTrabalho(planejado.getCategoriaCentroTrabalho().concat(" - ").concat("CT ").concat(planejado.getCentroTrabalho()));
            planejado.setNumPlano(resultSet.getString("NUMPLANO"));
            planejado.setProduto(resultSet.getString("PRODUTO"));
            planejado.setCodigoCargaHoraria(resultSet.getBigDecimal("CODIGOCARGAHORARIA"));
            planejado.setCodEmpresa(resultSet.getBigDecimal("CODEMP"));
            planejado.setDataInicioPrevistoOp(resultSet.getTimestamp("DATAINICIOPREVISTOP"));
            planejado.setDataFimPrevistoOp(resultSet.getTimestamp("DATAFIMPREVISTOP"));
            planejado.setDataInclusao(resultSet.getTimestamp("DATAINCLUSAO"));
            planejado.setDataPrevisaoEntrega(resultSet.getTimestamp("DATAPREVISAOENTREGA"));
            planejado.setDataInicializacao(resultSet.getTimestamp("DATAINICIALIZACAO"));
            planejado.setDataFinalizacao(resultSet.getTimestamp("DATAFINALIZACAO"));
            planejado.setDataEntradaAtividade(resultSet.getTimestamp("DATAENTRADAATIVIDADE"));
            planejado.setDataAceiteAtividade(resultSet.getTimestamp("DATAACEITEATIVIDADE"));
            planejado.setDataInicioAtividade(resultSet.getTimestamp("DATAINICIOATIVIDADE"));
            planejado.setDataFimAtividade(resultSet.getTimestamp("DATAFIMATIVIDADE"));
            planejado.setDataInicioPrevistoAtv(resultSet.getTimestamp("DATAINICIOPREVISTOATV"));
            planejado.setDataFimPrevistoAtv(resultSet.getTimestamp("DATAFIMPREVISTOATV"));
            planejado.setDataInicio(resultSet.getTimestamp("DATAINICIO"));
            planejado.setDataFinal(resultSet.getTimestamp("DATAFINAL"));
            listaPlanejadoRealizadoPrevistoPrevisto.add(planejado);
        }

        return listaPlanejadoRealizadoPrevistoPrevisto;
    }

    private List<PlanejadoRealizadoPrevisto> getIndicadores(List<PlanejadoRealizadoPrevisto> listaPlanejadoRealizadoPrevisto, ServiceContext context) {
        String centrosDeTrabalho = "";
        BigDecimal totalCargaHoraria = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalIndisponivel = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalOcupacao = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalPlanejado = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalPrevisto = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalRealizado = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalPrevistoPizza = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalRealizadoPizza = BigDecimalUtil.ZERO_VALUE;
        List<PlanejadoRealizadoPrevisto> indicadoresTotais = new ArrayList();

        for(PlanejadoRealizadoPrevisto planejado : listaPlanejadoRealizadoPrevisto) {
            PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto = new PlanejadoRealizadoPrevisto();

            try {
                if (!centrosDeTrabalho.equals(planejado.getCentrosDeTrabalho())) {
                    totalCargaHoraria = this.getCargaHoraria(planejado);
                    totalIndisponivel = this.getIndisponivel(planejado);
                    totalOcupacao = this.getOcupacao(listaPlanejadoRealizadoPrevisto, planejado);
                    totalPlanejado = this.getPlanejado(listaPlanejadoRealizadoPrevisto, planejado);
                    totalPrevisto = this.getPrevisto(listaPlanejadoRealizadoPrevisto, planejado);
                    totalRealizado = this.getRealizado(listaPlanejadoRealizadoPrevisto, planejado);
                    planejadoRealizadoPrevisto.setTotalDisponivel(this.calcularPorcentagemDisponivel(totalCargaHoraria, totalIndisponivel, totalOcupacao));
                    planejadoRealizadoPrevisto.setTotalPlanejado(this.calcularPorcentagem(totalCargaHoraria, totalPlanejado));
                    planejadoRealizadoPrevisto.setTotalPrevisto(this.calcularPorcentagem(totalCargaHoraria, totalPrevisto));
                    planejadoRealizadoPrevisto.setTotalRealizado(this.calcularPorcentagem(totalCargaHoraria, totalRealizado));
                    planejadoRealizadoPrevisto.setCentrosDeTrabalho(planejado.getCentrosDeTrabalho());
                    indicadoresTotais.add(planejadoRealizadoPrevisto);
                    centrosDeTrabalho = planejado.getCentrosDeTrabalho();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        this.calculoPorcentagemGraficoPizza(totalPrevistoPizza, totalRealizadoPizza, context);
        return indicadoresTotais;
    }

    public void calculoPorcentagemGraficoPizza(BigDecimal totalPrevistoPizza, BigDecimal totalRealizadoPizza, ServiceContext context) {
        BigDecimal porcentagemTotalRealizado = BigDecimal.ZERO;
        BigDecimal porcentagemTotalPrevisto = BigDecimal.ZERO;
        if (totalPrevistoPizza.compareTo(totalRealizadoPizza) > 0) {
            porcentagemTotalRealizado = this.calcularPorcentagem(totalPrevistoPizza, totalRealizadoPizza);
            porcentagemTotalPrevisto = (new BigDecimal(100)).subtract(porcentagemTotalRealizado);
        } else if (totalRealizadoPizza.compareTo(totalPrevistoPizza) > 0) {
            porcentagemTotalPrevisto = this.calcularPorcentagem(totalRealizadoPizza, totalPrevistoPizza);
            porcentagemTotalRealizado = (new BigDecimal(100)).subtract(porcentagemTotalPrevisto);
        } else {
            porcentagemTotalPrevisto = new BigDecimal(50);
            porcentagemTotalRealizado = new BigDecimal(50);
        }

        JsonObject totaisPizza = new JsonObject();
        totaisPizza.addProperty("porcentagemTotalPrevisto", porcentagemTotalPrevisto);
        totaisPizza.addProperty("porcentagemTotalRealizado", porcentagemTotalRealizado);
        context.setJsonResponse(totaisPizza);
    }

    private BigDecimal getCargaHoraria(PlanejadoRealizadoPrevisto planejado) throws Exception {
        BigDecimal result = null;
        JdbcWrapper jdbcWrapper = null;
        NativeSql sql = null;
        DataCalendarioHelper dataCalendarioHelper = new DataCalendarioHelper(jdbcWrapper);

        BigDecimal var9;
        try {
            List<DataCalendario> listaDatasCalendario = dataCalendarioHelper.getDatasPeriodo(planejado.getDataInicioPrevistoOp(), planejado.getDataFimPrevistoOp(), planejado.getCodEmpresa());
            List<BigDecimal> diasSemana = (List)listaDatasCalendario.stream().map(DataCalendario::getDiaSemana).collect(Collectors.toList());
            jdbcWrapper = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbcWrapper.openSession();
            sql = new NativeSql(jdbcWrapper);
            sql.appendSql("SELECT SUM(COALESCE(SAIDA, 0) - COALESCE(ENTRADA, 0)) TOTALCARGAHORARIA  FROM TFPHOR WHERE CODCARGAHOR = :CODCARGAHOR ");
            sql.appendSql(SQLUtils.buildINClauseByValues("DIASEM", diasSemana));
            sql.setNamedParameter("CODCARGAHOR", planejado.getCodigoCargaHoraria());
            ResultSet resultSet = sql.executeQuery();
            if (resultSet.next()) {
                result = resultSet.getBigDecimal("TOTALCARGAHORARIA");
            }

            var9 = result;
        } finally {
            if (jdbcWrapper != null) {
                jdbcWrapper.closeSession();
            }

        }

        return var9;
    }

    private BigDecimal getIndisponivel(PlanejadoRealizadoPrevisto planejado) throws Exception {
        BigDecimal totalIndisponivel = BigDecimal.ZERO;
        JdbcWrapper jdbcWrapper = null;
        NativeSql sql = null;

        BigDecimal var12;
        try {
            jdbcWrapper = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            jdbcWrapper.openSession();
            sql = new NativeSql(jdbcWrapper);
            sql.appendSql("SELECT DHINCIAL, DHFINAL FROM TPRIWC WHERE TPRIWC.CODWCP = :CODWCP");
            sql.setNamedParameter("CODWCP", planejado.getCentroTrabalho());

            Timestamp dataFinal;
            for(ResultSet resultSet = sql.executeQuery(); resultSet.next(); totalIndisponivel = totalIndisponivel.add(this.getDuracao(dataInicial, dataFinal))) {
                dataInicial = resultSet.getTimestamp("DHINCIAL");
                dataFinal = resultSet.getTimestamp("DHFINAL");
            }

            var12 = totalIndisponivel;
        } finally {
            if (jdbcWrapper != null) {
                jdbcWrapper.closeSession();
            }

        }

        return var12;
    }

    private BigDecimal getOcupacao(List<PlanejadoRealizadoPrevisto> listaPlanejadoRealizadoPrevisto, PlanejadoRealizadoPrevisto planejado) {
        BigDecimal totalOcupacao = BigDecimal.ZERO;

        for(PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto : listaPlanejadoRealizadoPrevisto) {
            if (planejadoRealizadoPrevisto.getCentrosDeTrabalho().equals(planejado.getCentrosDeTrabalho())) {
                totalOcupacao = totalOcupacao.add(this.calcularPeriodoHorasOcupacao(planejadoRealizadoPrevisto));
            }
        }

        return totalOcupacao;
    }

    private BigDecimal getPlanejado(List<PlanejadoRealizadoPrevisto> listaPlanejadoRealizadoPrevisto, PlanejadoRealizadoPrevisto planejado) {
        BigDecimal totalPlanejado = BigDecimal.ZERO;

        for(PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto : listaPlanejadoRealizadoPrevisto) {
            if (planejadoRealizadoPrevisto.getCentrosDeTrabalho().equals(planejado.getCentrosDeTrabalho())) {
                totalPlanejado = totalPlanejado.add(this.calcularPeriodoHorasPlanejado(planejadoRealizadoPrevisto));
            }
        }

        return totalPlanejado;
    }

    private BigDecimal getPrevisto(List<PlanejadoRealizadoPrevisto> listaPlanejadoRealizadoPrevisto, PlanejadoRealizadoPrevisto planejado) {
        BigDecimal totalPrevisto = BigDecimal.ZERO;

        for(PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto : listaPlanejadoRealizadoPrevisto) {
            if (planejadoRealizadoPrevisto.getCentrosDeTrabalho().equals(planejado.getCentrosDeTrabalho())) {
                totalPrevisto = totalPrevisto.add(this.calcularPeriodoHorasPrevisto(planejadoRealizadoPrevisto));
            }
        }

        return totalPrevisto;
    }

    private BigDecimal getRealizado(List<PlanejadoRealizadoPrevisto> listaPlanejadoRealizadoPrevisto, PlanejadoRealizadoPrevisto planejado) {
        BigDecimal totalRealizado = BigDecimal.ZERO;

        for(PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto : listaPlanejadoRealizadoPrevisto) {
            if (planejadoRealizadoPrevisto.getCentrosDeTrabalho().equals(planejado.getCentrosDeTrabalho())) {
                totalRealizado = totalRealizado.add(this.calcularPeriodoHorasOcupacao(planejadoRealizadoPrevisto));
            }
        }

        return totalRealizado;
    }

    private BigDecimal calcularPorcentagemDisponivel(BigDecimal totalCargaHoraria, BigDecimal totalIndisponivel, BigDecimal totalOcupacao) {
        BigDecimal total = totalCargaHoraria.subtract(totalIndisponivel.subtract(totalOcupacao));
        return total != null && total.doubleValue() != (double)0.0F && totalCargaHoraria != null ? BigDecimalUtil.getRounded(totalCargaHoraria.divide(total, BigDecimalUtil.MATH_CTX).multiply(BigDecimalUtil.CEM_VALUE), 2) : BigDecimal.ZERO;
    }

    private BigDecimal calcularPorcentagem(BigDecimal totalCargaHoraria, BigDecimal valorTotal) {
        BigDecimal total = totalCargaHoraria.subtract(totalCargaHoraria.subtract(valorTotal));
        return total != null && total.doubleValue() != (double)0.0F && totalCargaHoraria != null ? BigDecimalUtil.getRounded(total.divide(totalCargaHoraria, BigDecimalUtil.MATH_CTX).multiply(BigDecimalUtil.CEM_VALUE), 2) : BigDecimal.ZERO;
    }

    private BigDecimal calcularPeriodoHorasOcupacao(PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto) {
        Timestamp dataInicial = planejadoRealizadoPrevisto.getDataFimAtividade() != null ? planejadoRealizadoPrevisto.getDataInicioAtividade() : planejadoRealizadoPrevisto.getDataInicioPrevistoOp();
        Timestamp dataFinal = planejadoRealizadoPrevisto.getDataFimAtividade() != null ? planejadoRealizadoPrevisto.getDataFimAtividade() : planejadoRealizadoPrevisto.getDataFimPrevistoOp();
        return this.getDuracao(dataInicial, dataFinal);
    }

    private BigDecimal calcularPeriodoHorasPlanejado(PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto) {
        Timestamp dataInicial = planejadoRealizadoPrevisto.getDataInicioPrevistoAtv() != null ? planejadoRealizadoPrevisto.getDataInicioPrevistoAtv() : planejadoRealizadoPrevisto.getDataInicioPrevistoOp();
        Timestamp dataFinal = planejadoRealizadoPrevisto.getDataFimPrevistoAtv() != null ? planejadoRealizadoPrevisto.getDataFimPrevistoAtv() : planejadoRealizadoPrevisto.getDataFimPrevistoOp();
        return this.getDuracao(dataInicial, dataFinal);
    }

    private BigDecimal calcularPeriodoHorasPrevisto(PlanejadoRealizadoPrevisto planejadoRealizadoPrevisto) {
        Timestamp dataInicialProgramado = planejadoRealizadoPrevisto.getDataInicioPrevistoAtv() != null ? planejadoRealizadoPrevisto.getDataInicioPrevistoAtv() : planejadoRealizadoPrevisto.getDataInicioPrevistoOp();
        Timestamp dataFinalProgramado = planejadoRealizadoPrevisto.getDataFimPrevistoAtv() != null ? planejadoRealizadoPrevisto.getDataFimPrevistoAtv() : planejadoRealizadoPrevisto.getDataFimPrevistoOp();
        BigDecimal tempoProgramado = this.getDuracao(dataInicialProgramado, dataFinalProgramado);
        Timestamp dataInicialExecutado = planejadoRealizadoPrevisto.getDataInicioAtividade() != null ? planejadoRealizadoPrevisto.getDataInicioAtividade() : planejadoRealizadoPrevisto.getDataInicioPrevistoOp();
        Timestamp dataFinalExecutado = planejadoRealizadoPrevisto.getDataFimAtividade() != null ? planejadoRealizadoPrevisto.getDataFimAtividade() : planejadoRealizadoPrevisto.getDataFimPrevistoOp();
        BigDecimal tempoExecutado = this.getDuracao(dataInicialExecutado, dataFinalExecutado);
        return tempoProgramado.subtract(tempoExecutado);
    }

    private BigDecimal getDuracao(Timestamp dataInicial, Timestamp dataFinal) {
        Duration duracaoTotal = Duration.ZERO;
        Duration duracao = Duration.between(dataInicial.toLocalDateTime(), dataFinal.toLocalDateTime());
        duracaoTotal = duracaoTotal.plus(duracao);
        return duracaoTotal.toMinutes() <= 59L && !duracaoTotal.isZero() ? (new BigDecimal(duracaoTotal.toMinutes())).divide(BigDecimalUtil.CEM_VALUE, 2, 4) : (new BigDecimal(duracaoTotal.toHours())).add((new BigDecimal(duracao.toMinutes() % 60L)).divide(BigDecimalUtil.CEM_VALUE, 2, 4));
    }

    public void getRealizacaoMps(Map<String, Object> params, ServiceContext context) throws Exception {
        NativeSql queryPlanejadoRealizado = null;
        JdbcWrapper jdbc = null;
        ResultSet resultSet = null;
        BigDecimal intervaloPrevisto = BigDecimalUtil.ZERO_VALUE;
        BigDecimal intervaloPrevistoTotal = BigDecimalUtil.ZERO_VALUE;
        BigDecimal intervaloRealizado = BigDecimalUtil.ZERO_VALUE;
        BigDecimal intervaloRealizadoTotal = BigDecimalUtil.ZERO_VALUE;
        Timestamp dataInicioPrevisto = null;
        JsonArray dadosTabelaMPS = new JsonArray();
        Map<BigDecimal, BigDecimal[]> agruparIntervalos = new HashMap();

        try {
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            queryPlanejadoRealizado = new NativeSql(jdbc);
            queryPlanejadoRealizado.loadSql(this.getClass(), "OrdemProducaoHelper_queryPlanejadoRealizadoPizza.sql");
            queryPlanejadoRealizado.setNamedParameter("NUMPS", params.get("nroPlano"));

            BigDecimal op;
            for(resultSet = queryPlanejadoRealizado.executeQuery(); resultSet.next(); agruparIntervalos.put(op, new BigDecimal[]{intervaloPrevistoTotal, intervaloRealizadoTotal})) {
                op = resultSet.getBigDecimal("NUMOP");
                dataInicioPrevisto = resultSet.getTimestamp("DATAINICIOPREVISTOP");
                intervaloPrevisto = resultSet.getBigDecimal("TEMPOATIVIDADE_CONVERTIDO");
                Timestamp dataInicioAtividade = resultSet.getTimestamp("DATAINICIOATIVIDADE");
                Timestamp dataFimAtividade = resultSet.getTimestamp("DATAFIMATIVIDADE");
                BigDecimal[] intervalos = (BigDecimal[])agruparIntervalos.getOrDefault(op, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                intervaloPrevistoTotal = intervalos[0];
                intervaloRealizadoTotal = intervalos[1];
                if (dataInicioAtividade == null) {
                    intervaloPrevistoTotal = intervaloPrevistoTotal.add(intervaloPrevisto);
                } else if (dataInicioAtividade != null && dataFimAtividade == null) {
                    if ("S".equals(params.get("considerarAtividadesExecucao").toString())) {
                        if (dataInicioAtividade.toInstant().isAfter(dataInicioPrevisto.toInstant())) {
                            intervaloRealizado = this.calcularIntervaloEmMinutos(dataInicioAtividade, TimeUtils.getNow());
                            if (intervaloRealizado.compareTo(intervaloPrevisto) > 0) {
                                intervaloRealizadoTotal = intervaloRealizadoTotal.add(intervaloPrevisto);
                            } else {
                                intervaloRealizadoTotal = intervaloRealizadoTotal.add(intervaloRealizado);
                            }

                            intervaloPrevistoTotal = intervaloPrevistoTotal.add(intervaloPrevisto);
                        } else {
                            intervaloRealizadoTotal = intervaloRealizadoTotal.add(intervaloPrevisto);
                            intervaloPrevistoTotal = intervaloPrevistoTotal.add(intervaloPrevisto);
                        }
                    } else {
                        intervaloPrevistoTotal = intervaloPrevistoTotal.add(intervaloPrevisto);
                    }
                } else if (dataInicioAtividade != null && dataFimAtividade != null) {
                    intervaloPrevistoTotal = intervaloPrevistoTotal.add(intervaloPrevisto);
                    intervaloRealizadoTotal = intervaloRealizadoTotal.add(intervaloPrevisto);
                }
            }

            for(Map.Entry<BigDecimal, BigDecimal[]> entry : agruparIntervalos.entrySet()) {
                BigDecimal previstoHorasTotal = ((BigDecimal[])entry.getValue())[0];
                BigDecimal realizadoHorasTotal = ((BigDecimal[])entry.getValue())[1];
                BigDecimal previstoPorcentagemTotal = BigDecimalUtil.ZERO_VALUE;
                BigDecimal realizadoPorcentagemTotal = BigDecimalUtil.ZERO_VALUE;
                if (previstoHorasTotal.compareTo(realizadoHorasTotal) <= 0 && previstoHorasTotal.compareTo(realizadoHorasTotal) != 0) {
                    if (realizadoHorasTotal.compareTo(previstoHorasTotal) > 0 || realizadoHorasTotal.compareTo(previstoHorasTotal) == 0) {
                        previstoPorcentagemTotal = calcularPorcentagemMPS(realizadoHorasTotal, previstoHorasTotal);
                        realizadoPorcentagemTotal = BigDecimalUtil.CEM_VALUE.subtract(previstoPorcentagemTotal);
                    }
                } else {
                    realizadoPorcentagemTotal = calcularPorcentagemMPS(previstoHorasTotal, realizadoHorasTotal);
                    previstoPorcentagemTotal = BigDecimalUtil.CEM_VALUE.subtract(realizadoPorcentagemTotal);
                }

                JsonObject dadosTabela = new JsonObject();
                dadosTabela.addProperty("OP", (Number)entry.getKey());
                dadosTabela.addProperty("PREVISTO", previstoPorcentagemTotal);
                dadosTabela.addProperty("REALIZADO", realizadoPorcentagemTotal);
                dadosTabelaMPS.add(dadosTabela);
            }

            if (dataInicioPrevisto != null) {
                this.getTotalPizza(params, context, dadosTabelaMPS);
            }
        } finally {
            NativeSql.releaseResources(queryPlanejadoRealizado);
            JdbcUtils.closeResultSet(resultSet);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getTotalPizza(Map<String, Object> params, ServiceContext context, JsonArray dadosTabelaMPS) throws Exception {
        JsonObject totaisPizza = new JsonObject();
        NativeSql queryPlanejadoRealizado = null;
        JdbcWrapper jdbc = null;
        ResultSet resultSet = null;
        BigDecimal totalPrevistoPizza = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalRealizadoPizza = BigDecimalUtil.ZERO_VALUE;
        BigDecimal intervaloHorasPrevisto = BigDecimalUtil.ZERO_VALUE;
        BigDecimal intervaloHorasPrevistoTotal = BigDecimalUtil.ZERO_VALUE;
        BigDecimal intervaloHorasRealizadoTotal = BigDecimalUtil.ZERO_VALUE;
        Timestamp dataInicioPrevisto = null;

        try {
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            queryPlanejadoRealizado = new NativeSql(jdbc);
            queryPlanejadoRealizado.loadSql(this.getClass(), "OrdemProducaoHelper_queryPlanejadoRealizadoPizza.sql");
            queryPlanejadoRealizado.setNamedParameter("NUMPS", params.get("nroPlano"));
            resultSet = queryPlanejadoRealizado.executeQuery();

            while(resultSet.next()) {
                dataInicioPrevisto = resultSet.getTimestamp("DATAINICIOPREVISTOP");
                intervaloHorasPrevisto = resultSet.getBigDecimal("TEMPOATIVIDADE_CONVERTIDO");
                intervaloHorasPrevistoTotal = intervaloHorasPrevistoTotal.add(intervaloHorasPrevisto);
                boolean atividadeIniciada = resultSet.getTimestamp("DATAINICIOATIVIDADE") != null;
                if (atividadeIniciada) {
                    if ("N".equals(params.get("considerarAtividadesExecucao").toString())) {
                        if (resultSet.getTimestamp("DATAFIMATIVIDADE") != null) {
                            intervaloHorasRealizadoTotal = intervaloHorasRealizadoTotal.add(intervaloHorasPrevisto);
                        }
                    } else {
                        intervaloHorasRealizadoTotal = intervaloHorasRealizadoTotal.add(intervaloHorasPrevisto);
                    }
                }
            }

            if (dataInicioPrevisto != null) {
                if (intervaloHorasPrevistoTotal.compareTo(intervaloHorasRealizadoTotal) <= 0 && intervaloHorasPrevistoTotal.compareTo(intervaloHorasRealizadoTotal) != 0) {
                    if (intervaloHorasRealizadoTotal.compareTo(intervaloHorasPrevistoTotal) > 0 || intervaloHorasRealizadoTotal.compareTo(intervaloHorasPrevistoTotal) == 0) {
                        totalPrevistoPizza = calcularPorcentagemMPS(intervaloHorasRealizadoTotal, intervaloHorasPrevistoTotal);
                        totalRealizadoPizza = BigDecimalUtil.CEM_VALUE.subtract(totalPrevistoPizza);
                    }
                } else {
                    totalRealizadoPizza = calcularPorcentagemMPS(intervaloHorasPrevistoTotal, intervaloHorasRealizadoTotal);
                    totalPrevistoPizza = BigDecimalUtil.CEM_VALUE.subtract(totalRealizadoPizza);
                }

                totaisPizza.addProperty("porcentagemTotalPrevisto", totalPrevistoPizza);
                totaisPizza.addProperty("porcentagemTotalRealizado", totalRealizadoPizza);
                totaisPizza.add("dataset", dadosTabelaMPS);
            }

            context.setJsonResponse(totaisPizza);
        } finally {
            NativeSql.releaseResources(queryPlanejadoRealizado);
            JdbcUtils.closeResultSet(resultSet);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private static BigDecimal calcularPorcentagemMPS(BigDecimal totalCargaHoraria, BigDecimal valorTotal) {
        BigDecimal total = totalCargaHoraria.subtract(totalCargaHoraria.subtract(valorTotal));
        return total != null && total.doubleValue() != (double)0.0F && totalCargaHoraria != null ? total.divide(totalCargaHoraria, new MathContext(4)).multiply(BigDecimalUtil.CEM_VALUE).setScale(2, 6) : BigDecimal.ZERO;
    }

    public BigDecimal calcularIntervaloEmMinutos(Timestamp dataInicio, Timestamp dataFim) {
        long duracaoIntervaloEmMillis = dataFim.getTime() - dataInicio.getTime();
        BigDecimal duracaoMillis = new BigDecimal(duracaoIntervaloEmMillis);
        BigDecimal milissegundosPorMinuto = new BigDecimal(60000);
        BigDecimal duracaoIntervaloEmMinutos = duracaoMillis.divide(milissegundosPorMinuto, 2, 4);
        return duracaoIntervaloEmMinutos;
    }

    public void getVolumePrevistoRealizado(Map<String, Object> params, ServiceContext context) throws Exception {
        NativeSql queryPlanejadoRealizado = null;
        JdbcWrapper jdbc = null;
        ResultSet resultSet = null;
        BigDecimal totalVolumePrevisto = BigDecimalUtil.ZERO_VALUE;
        BigDecimal totalVolumeRealizado = BigDecimalUtil.ZERO_VALUE;
        BigDecimal volumePrevisto = BigDecimalUtil.ZERO_VALUE;
        BigDecimal volumeRealizado = BigDecimalUtil.ZERO_VALUE;
        JsonArray dataset = new JsonArray();

        try {
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            queryPlanejadoRealizado = new NativeSql(jdbc);
            queryPlanejadoRealizado.loadSql(this.getClass(), "OrdemProducaoHelper_queryPlanejadoRealizadoVolume.sql");
            queryPlanejadoRealizado.setNamedParameter("NUMPS", params.get("nroPlano"));

            for(resultSet = queryPlanejadoRealizado.executeQuery(); resultSet.next(); totalVolumeRealizado = totalVolumeRealizado.add(volumeRealizado)) {
                JsonObject item = new JsonObject();
                item.addProperty("OP", resultSet.getBigDecimal("IDIPROC"));
                volumePrevisto = BigDecimalUtil.getValueOrZero(resultSet.getBigDecimal("PREVISTO"));
                volumeRealizado = BigDecimalUtil.getValueOrZero(resultSet.getBigDecimal("REALIZADO"));
                item.addProperty("PREVISTO", volumePrevisto);
                item.addProperty("REALIZADO", volumeRealizado);
                dataset.add(item);
                totalVolumePrevisto = totalVolumePrevisto.add(volumePrevisto);
            }

            JsonObject totaisVolume = new JsonObject();
            totaisVolume.addProperty("totalVolumePrevisto", totalVolumePrevisto);
            totaisVolume.addProperty("totalVolumeRealizado", totalVolumeRealizado);
            totaisVolume.add("dataset", dataset);
            context.setJsonResponse(totaisVolume);
        } finally {
            NativeSql.releaseResources(queryPlanejadoRealizado);
            JdbcUtils.closeResultSet(resultSet);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    static {
        mathCtx = new MathContext(64, RoundingMode.HALF_UP);
        mathCtx2Round = new MathContext(2, RoundingMode.HALF_UP);
        mathCtx3Round = new MathContext(3, RoundingMode.HALF_UP);
    }

    private static class Produto {
        BigDecimal codigo;
        String controle;
        BigDecimal tamLote;
        String nroLote;
        BigDecimal percentualMP;

        Produto(BigDecimal codigo, String controle, BigDecimal tamLote, String nroLote, BigDecimal percentualMP) {
            this.codigo = codigo;
            this.controle = controle;
            this.tamLote = tamLote;
            this.nroLote = nroLote;
            this.percentualMP = percentualMP;
        }
    }

    public class PlanejadoRealizadoPrevisto {
        private String numPlano;
        private String numOP;
        private String atividade;
        private String categoriaCentroTrabalho;
        private String centroTrabalho;
        private String centrosDeTrabalho;
        private String produto;
        private BigDecimal codEmpresa;
        private BigDecimal codigoCargaHoraria;
        private Timestamp dataInicioPrevistoOp;
        private Timestamp dataFimPrevistoOp;
        private Timestamp dataInicializacao;
        private Timestamp dataFinalizacao;
        private Timestamp dataInclusao;
        private Timestamp dataPrevisaoEntrega;
        private Timestamp dataEntradaAtividade;
        private Timestamp dataAceiteAtividade;
        private Timestamp dataInicioAtividade;
        private Timestamp dataFimAtividade;
        private Timestamp dataInicioPrevistoAtv;
        private Timestamp dataFimPrevistoAtv;
        private Timestamp dataInicio;
        private Timestamp dataFinal;
        private BigDecimal totalDisponivel;
        private BigDecimal totalPlanejado;
        private BigDecimal totalPrevisto;
        private BigDecimal totalRealizado;

        public PlanejadoRealizadoPrevisto() {
        }

        public String getNumPlano() {
            return this.numPlano;
        }

        public void setNumPlano(String numPlano) {
            this.numPlano = numPlano;
        }

        public String getNumOP() {
            return this.numOP;
        }

        public void setNumOP(String numOP) {
            this.numOP = numOP;
        }

        public String getAtividade() {
            return this.atividade;
        }

        public void setAtividade(String atividade) {
            this.atividade = atividade;
        }

        public String getCategoriaCentroTrabalho() {
            return this.categoriaCentroTrabalho;
        }

        public void setCategoriaCentroTrabalho(String categoriaCentroTrabalho) {
            this.categoriaCentroTrabalho = categoriaCentroTrabalho;
        }

        public String getCentroTrabalho() {
            return this.centroTrabalho;
        }

        public void setCentroTrabalho(String centroTrabalho) {
            this.centroTrabalho = centroTrabalho;
        }

        public String getCentrosDeTrabalho() {
            return this.centrosDeTrabalho;
        }

        public void setCentrosDeTrabalho(String centrosDeTrabalho) {
            this.centrosDeTrabalho = centrosDeTrabalho;
        }

        public String getProduto() {
            return this.produto;
        }

        public void setProduto(String produto) {
            this.produto = produto;
        }

        public BigDecimal getCodEmpresa() {
            return this.codEmpresa;
        }

        public void setCodEmpresa(BigDecimal codEmpresa) {
            this.codEmpresa = codEmpresa;
        }

        public BigDecimal getCodigoCargaHoraria() {
            return this.codigoCargaHoraria;
        }

        public void setCodigoCargaHoraria(BigDecimal codigoCargaHoraria) {
            this.codigoCargaHoraria = codigoCargaHoraria;
        }

        public Timestamp getDataInicioPrevistoOp() {
            return this.dataInicioPrevistoOp;
        }

        public void setDataInicioPrevistoOp(Timestamp dataInicioPrevistoOp) {
            this.dataInicioPrevistoOp = dataInicioPrevistoOp;
        }

        public Timestamp getDataFimPrevistoOp() {
            return this.dataFimPrevistoOp;
        }

        public void setDataFimPrevistoOp(Timestamp dataFimPrevistoOp) {
            this.dataFimPrevistoOp = dataFimPrevistoOp;
        }

        public Timestamp getDataInicializacao() {
            return this.dataInicializacao;
        }

        public void setDataInicializacao(Timestamp dataInicializacao) {
            this.dataInicializacao = dataInicializacao;
        }

        public Timestamp getDataFinalizacao() {
            return this.dataFinalizacao;
        }

        public void setDataFinalizacao(Timestamp dataFinalizacao) {
            this.dataFinalizacao = dataFinalizacao;
        }

        public Timestamp getDataInclusao() {
            return this.dataInclusao;
        }

        public void setDataInclusao(Timestamp dataInclusao) {
            this.dataInclusao = dataInclusao;
        }

        public Timestamp getDataPrevisaoEntrega() {
            return this.dataPrevisaoEntrega;
        }

        public void setDataPrevisaoEntrega(Timestamp dataPrevisaoEntrega) {
            this.dataPrevisaoEntrega = dataPrevisaoEntrega;
        }

        public Timestamp getDataEntradaAtividade() {
            return this.dataEntradaAtividade;
        }

        public void setDataEntradaAtividade(Timestamp dataEntradaAtividade) {
            this.dataEntradaAtividade = dataEntradaAtividade;
        }

        public Timestamp getDataAceiteAtividade() {
            return this.dataAceiteAtividade;
        }

        public void setDataAceiteAtividade(Timestamp dataAceiteAtividade) {
            this.dataAceiteAtividade = dataAceiteAtividade;
        }

        public Timestamp getDataInicioAtividade() {
            return this.dataInicioAtividade;
        }

        public void setDataInicioAtividade(Timestamp dataInicioAtividade) {
            this.dataInicioAtividade = dataInicioAtividade;
        }

        public Timestamp getDataFimAtividade() {
            return this.dataFimAtividade;
        }

        public void setDataFimAtividade(Timestamp dataFimAtividade) {
            this.dataFimAtividade = dataFimAtividade;
        }

        public Timestamp getDataInicioPrevistoAtv() {
            return this.dataInicioPrevistoAtv;
        }

        public void setDataInicioPrevistoAtv(Timestamp dataInicioPrevistoAtv) {
            this.dataInicioPrevistoAtv = dataInicioPrevistoAtv;
        }

        public Timestamp getDataFimPrevistoAtv() {
            return this.dataFimPrevistoAtv;
        }

        public void setDataFimPrevistoAtv(Timestamp dataFimPrevistoAtv) {
            this.dataFimPrevistoAtv = dataFimPrevistoAtv;
        }

        public Timestamp getDataInicio() {
            return this.dataInicio;
        }

        public void setDataInicio(Timestamp dataInicio) {
            this.dataInicio = dataInicio;
        }

        public Timestamp getDataFinal() {
            return this.dataFinal;
        }

        public void setDataFinal(Timestamp dataFinal) {
            this.dataFinal = dataFinal;
        }

        public BigDecimal getTotalDisponivel() {
            return this.totalDisponivel;
        }

        public void setTotalDisponivel(BigDecimal totalDisponivel) {
            this.totalDisponivel = totalDisponivel;
        }

        public BigDecimal getTotalPlanejado() {
            return this.totalPlanejado;
        }

        public void setTotalPlanejado(BigDecimal totalPlanejado) {
            this.totalPlanejado = totalPlanejado;
        }

        public BigDecimal getTotalPrevisto() {
            return this.totalPrevisto;
        }

        public void setTotalPrevisto(BigDecimal totalPrevisto) {
            this.totalPrevisto = totalPrevisto;
        }

        public BigDecimal getTotalRealizado() {
            return this.totalRealizado;
        }

        public void setTotalRealizado(BigDecimal totalRealizado) {
            this.totalRealizado = totalRealizado;
        }
    }

    public class TempoRestanteExecucao {
        private Long dia;
        private Long hora;
        private Long minuto;
        private boolean isAtrasado;
        private boolean isIniciado;

        public TempoRestanteExecucao() {
        }

        public Long getDia() {
            return this.dia;
        }

        public void setDia(Long dia) {
            this.dia = dia;
        }

        public Long getHora() {
            return this.hora;
        }

        public void setHora(Long hora) {
            this.hora = hora;
        }

        public Long getMinuto() {
            return this.minuto;
        }

        public void setMinuto(Long minuto) {
            this.minuto = minuto;
        }

        public boolean isAtrasado() {
            return this.isAtrasado;
        }

        public void setAtrasado(boolean isAtrasado) {
            this.isAtrasado = isAtrasado;
        }

        public boolean isIniciado() {
            return this.isIniciado;
        }

        public void setIniciado(boolean isIniciado) {
            this.isIniciado = isIniciado;
        }
    }
}
