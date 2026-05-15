//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by Fernflower decompiler)
//

package br.com.sankhya.mgeprod.model.services;

import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.wrapper.JapeFactory;
import br.com.sankhya.jape.wrapper.JapeWrapper;
import br.com.sankhya.mgeprod.model.helper.ControleProcessoHelper;
import br.com.sankhya.mgeprod.model.helper.EdicaoLoteHelper;
import br.com.sankhya.mgeprod.model.helper.OperacoesEstoqueAtividade;
import br.com.sankhya.mgeprod.model.helper.OrdemProducaoHelper;
import br.com.sankhya.mgeprod.model.helper.RedimensionamentoLoteHelper;
import br.com.sankhya.mgeprod.model.utils.ProdutoControle;
import br.com.sankhya.modelcore.MGEModelException;
import br.com.sankhya.modelcore.comercial.ComercialUtils;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;
import br.com.sankhya.modelcore.util.MGECoreParameter;
import br.com.sankhya.modelcore.util.SPBeanUtils;
import br.com.sankhya.util.troubleshooting.SKError;
import br.com.sankhya.util.troubleshooting.TSLevel;
import br.com.sankhya.ws.ServiceContext;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.JdbcUtils;
import com.sankhya.util.SQLUtils;
import com.sankhya.util.StringUtils;
import com.sankhya.util.XMLUtils;
import java.math.BigDecimal;
import java.rmi.RemoteException;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.EJBException;
import javax.ejb.ObjectNotFoundException;
import javax.ejb.SessionBean;
import javax.ejb.SessionContext;
import org.jdom.Element;

public class OrdemProducaoSPBean implements SessionBean {
    private SessionContext context;
    private static Map<String, Integer> camposProdutoApontado = new HashMap();
    private static Map<String, Integer> camposMateriaPrima = new HashMap();

    public OrdemProducaoSPBean() {
    }

    public void salvarPrioridades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element ordensElement = ctx.getRequestBody().getChild("ordens");
            OrdemProducaoHelper helper = OrdemProducaoHelper.getInstance();
            helper.reordenarPrioridades(ordensElement);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void inicializarOrdens(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element ordensElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "ordens");
            Collection<Element> ordem = ordensElem.getChildren("ordem");
            int qtdInicializada = 0;

            for(Element ordemElem : ordem) {
                final BigDecimal idiProc = XMLUtils.getRequiredAttributeAsBigDecimal(ordemElem, "IDIPROC");
                final BigDecimal idProc = XMLUtils.getRequiredAttributeAsBigDecimal(ordemElem, "IDPROC");
                final String status = XMLUtils.getRequiredAttributeAsString(ordemElem, "STATUSPROC");
                hnd.execWithTX(new JapeSession.TXBlock() {
                    public void doWithTx() throws Exception {
                        JdbcWrapper jdbc = null;

                        try {
                            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
                            ControleProcessoHelper cph = new ControleProcessoHelper(jdbc);
                            if ("R".equals(status)) {
                                cph.validaObrigatoriedadeFormularioInicializacao(idiProc, idProc);
                                cph.validaInicializacaoDoPAQuandoExistirSubOrdem(idiProc);
                            }

                            cph.iniciaOrdemDeProducao(idiProc);
                        } finally {
                            JdbcWrapper.closeSession(jdbc);
                        }

                    }
                });
                ++qtdInicializada;
            }

            Element root = new Element("ordensInicializadas");
            XMLUtils.addAttributeElement(root, "qtdInicializada", qtdInicializada);
            ctx.getBodyElement().addContent(root);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void cancelarOrdens(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            Element ordensElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "ordens");
            BigDecimal idIcop = XMLUtils.getAttributeAsBigDecimal(ordensElem, "idicop");
            Collection<Element> ordem = ordensElem.getChildren("ordem");
            ControleProcessoHelper cph = new ControleProcessoHelper(jdbc);
            BigDecimal idiProc = null;
            boolean cancelarLiberarWC = XMLUtils.getAttributeAsBoolean(ordensElem, "CANCELAR_LIBERA_WC");
            JapeSession.putProperty("br.com.sankhya.mgeprod.libera.wc", cancelarLiberarWC);
            if (idIcop.intValue() != 0) {
                JapeWrapper iProcDAO = JapeFactory.dao("CabecalhoInstanciaProcesso");

                for(DynamicVO idProcVO : iProcDAO.find("this.IDICOP = ? AND this.STATUSPROC <> 'C'", new Object[]{idIcop})) {
                    cph.cancelarOrdemDeProducao(idProcVO.asBigDecimal("IDIPROC"), ctx);
                }
            } else {
                for(Element ordemElem : ordem) {
                    idiProc = XMLUtils.getRequiredAttributeAsBigDecimal(ordemElem, "IDIPROC");
                    cph.cancelarOrdemDeProducao(idiProc, ctx);
                }
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    public void suspenderOrdens(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            Element ordensElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "ordens");
            Collection<Element> ordem = ordensElem.getChildren("ordem");
            boolean isValidarUsoCentroTrabalho = XMLUtils.getAttributeAsBoolean(ordensElem, "validarUsoCentroTrabalho");
            ControleProcessoHelper cph = new ControleProcessoHelper(jdbc);
            BigDecimal idiProc = null;

            for(Element ordemElem : ordem) {
                idiProc = XMLUtils.getRequiredAttributeAsBigDecimal(ordemElem, "IDIPROC");
                cph.suspenderOrdemDeProducao(idiProc, isValidarUsoCentroTrabalho);
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    public void getPAdeProcesso(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();

        try {
            Element parametros = XMLUtils.getRequiredChild(ctx.getRequestBody(), "param");
            BigDecimal idproc = XMLUtils.getRequiredAttributeAsBigDecimal(parametros, "idproc");
            BigDecimal codprod = XMLUtils.getRequiredAttributeAsBigDecimal(parametros, "codprod");
            String controle = XMLUtils.getAttributeAsString(parametros, "controle");
            controle = StringUtils.blankWhenEmpty(controle);
            hnd = JapeSession.open();
            DynamicVO produtoAcabadoVO = null;

            try {
                produtoAcabadoVO = (DynamicVO)EntityFacadeFactory.getDWFFacade().findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idproc, codprod, controle});
            } catch (ObjectNotFoundException var14) {
                produtoAcabadoVO = (DynamicVO)EntityFacadeFactory.getDWFFacade().findEntityByPrimaryKeyAsVO("ProdutoAcabado", new Object[]{idproc, codprod, " "});
            }

            if (produtoAcabadoVO == null) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00034", new Exception("Processo nÃ£o configurado para produzir o Porduto Acabado CODPROD " + codprod + ". (IDPROC " + idproc + ")"));
            }

            Element produtoAcabado = new Element("produto_acabado");
            XMLUtils.addContentElement(produtoAcabado, "TAMLOTEPAD", produtoAcabadoVO.asBigDecimal("TAMLOTEPAD").toString());
            XMLUtils.addContentElement(produtoAcabado, "MULTIDEAL", produtoAcabadoVO.asBigDecimal("MULTIDEAL").toString());
            XMLUtils.addContentElement(produtoAcabado, "QTDPRODMIN", produtoAcabadoVO.asBigDecimal("QTDPRODMIN").toString());
            ctx.getBodyElement().addContent(produtoAcabado);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    public void getAmostras(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiProc = XMLUtils.getAttributeAsBigDecimal(params, "idiProc");
            OrdemProducaoHelper helper = OrdemProducaoHelper.getInstance();
            ctx.getBodyElement().addContent(helper.getAmostras(idiProc));
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void getSomaNotasProducao(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbcWrapper = null;
        NativeSql queSomaNotasProducao = null;

        try {
            hnd = JapeSession.open();
            jdbcWrapper = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
            Element params = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiProc = XMLUtils.getAttributeAsBigDecimal(params, "IDIPROC");
            BigDecimal codProc = XMLUtils.getAttributeAsBigDecimal(params, "CODPRODPA");
            String controle = XMLUtils.getAttributeAsString(params, "CONTROLEPA");
            DynamicVO produtoVO = (DynamicVO)EntityFacadeFactory.getDWFFacade().findEntityByPrimaryKeyAsVO("Produto", codProc);
            controle = ComercialUtils.trimControleEstoque(controle);
            controle = "L".equals(produtoVO.asString("TIPCONTEST")) ? "*" : controle;
            queSomaNotasProducao = new NativeSql(jdbcWrapper);
            queSomaNotasProducao.loadSql(this.getClass(), "OrdemProducaoSP_queSomaNotasProducao.sql");
            queSomaNotasProducao.setNamedParameter("IDIPROC", idiProc);
            queSomaNotasProducao.setNamedParameter("CODPROD", codProc);
            queSomaNotasProducao.setNamedParameter("CONTROLE", controle);
            ResultSet rs = queSomaNotasProducao.executeQuery();
            BigDecimal soma = BigDecimal.ZERO;
            if (rs.next()) {
                soma = BigDecimalUtil.getValueOrZero(rs.getBigDecimal(1));
            }

            JdbcUtils.closeResultSet(rs);
            XMLUtils.addContentElement(ctx.getBodyElement(), "result", soma);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            NativeSql.releaseResources(queSomaNotasProducao);
            JapeSession.close(hnd);
        }

    }

    public void substituirProduto(ServiceContext ctx) throws Exception {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            OrdemProducaoHelper helper = OrdemProducaoHelper.getInstance();
            helper.substituirProduto(XMLUtils.getRequiredChild(ctx.getRequestBody(), "params"));
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void redimensionarLote(ServiceContext ctx) throws Exception {
        JapeSession.SessionHandle hnd = null;
        RedimensionamentoLoteHelper helper = null;

        try {
            hnd = JapeSession.open();
            Element paramsElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiProc = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "idiProc");
            BigDecimal codProdPA = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "codProdPA");
            String controlePA = ComercialUtils.trimControleEstoque(XMLUtils.getAttributeAsString(paramsElem, "controlePA"));
            BigDecimal novoTamanhoLote = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "novoTamanhoLote");
            BigDecimal idproc = XMLUtils.getAttributeAsBigDecimal(paramsElem, "idproc");
            boolean respostaRedimensionarSerie = XMLUtils.getAttributeAsBoolean(paramsElem, "RESPOSTA_REDIMENSIONAR_SERIE");
            Element elemSeries = XMLUtils.getChild(paramsElem, "SERIES");
            helper = RedimensionamentoLoteHelper.getInstance();
            helper.setXmlEventRedimensionarPA(paramsElem.getChild("eventRedimensionarPA"));
            helper.setIdProc(idproc);
            helper.setRespostaRedimensionarSerie(respostaRedimensionarSerie);
            helper.setElemSeries(elemSeries);
            helper.redimensionar(idiProc, codProdPA, controlePA, novoTamanhoLote, false);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            RedimensionamentoLoteHelper.releaseResources(helper);
            JapeSession.close(hnd);
        }

    }

    public void removerOperacoesEstoque(ServiceContext ctx) throws Exception {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            OrdemProducaoHelper helper = OrdemProducaoHelper.getInstance();
            helper.executaRemocaoApontamento(ctx);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void editarLote(ServiceContext ctx) throws Exception {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element paramsElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiProc = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "idiProc");
            BigDecimal codProdPA = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "codProdPA");
            String controlePA = XMLUtils.getAttributeAsString(paramsElem, "controlePA");
            String codvol = XMLUtils.getAttributeAsString(paramsElem, "codvol");
            String controlePALoteNovo = XMLUtils.getAttributeAsString(paramsElem, "controlePALoteNovo");
            BigDecimal qtdProduzirLoteNovo = XMLUtils.getAttributeAsBigDecimal(paramsElem, "qtdProduzirLoteNovo");
            Timestamp dtFabLoteNovo = XMLUtils.getAttributeAsTimestamp(paramsElem, "dtFabLoteNovo");
            Timestamp dtValLoteNovo = XMLUtils.getAttributeAsTimestamp(paramsElem, "dtValLoteNovo");
            EdicaoLoteHelper helper = EdicaoLoteHelper.newInstance();
            helper.editarLote(idiProc, codProdPA, ComercialUtils.trimControleEstoque(controlePA), codvol, controlePALoteNovo, qtdProduzirLoteNovo, dtFabLoteNovo, dtValLoteNovo);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void salvarDependenciaEntreOps(ServiceContext ctx) throws Exception {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            Element paramsElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiProcPI = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "idiProcPI");
            BigDecimal codProdPI = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "codProdPI");
            String controlePI = XMLUtils.getAttributeAsString(paramsElem, "controlePI");
            BigDecimal qtdDep = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "qtdDep");
            BigDecimal qtdDepNovo = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElem, "qtdDepNovo");
            BigDecimal qtdEmOPsDependentes = this.buscaSomaDependenciasPI(dwfEntityFacade, idiProcPI, codProdPI, ComercialUtils.trimControleEstoque(controlePI));
            if (qtdDepNovo.doubleValue() != qtdDep.doubleValue()) {
                DynamicVO produtoAcabadoAProduzirVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabadoAProduzir", new Object[]{idiProcPI, codProdPI, ComercialUtils.trimControleEstoque(controlePI)});
                BigDecimal saldo = produtoAcabadoAProduzirVO.asBigDecimal("QTDPRODUZIR").subtract(qtdEmOPsDependentes);
                BigDecimal novoSaldo = saldo.add(qtdDep).subtract(qtdDepNovo);
                if (novoSaldo.doubleValue() < (double)0.0F) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00035", new Exception("NÃ£o Ã© possivel realizar a alteraÃ§Ã£o pois a Ordem nÃ£o possui saldo suficiente. Saldo disponÃ\u00advel: " + saldo.add(qtdDep) + "."));
                }

                return;
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
            return;
        } finally {
            JapeSession.close(hnd);
        }

    }

    private BigDecimal buscaSomaDependenciasPI(EntityFacade dwfEntityFacade, BigDecimal idiProcPI, BigDecimal codProdPI, String controlePI) throws Exception {
        JdbcWrapper jdbc = null;
        NativeSql query = null;
        BigDecimal result = BigDecimal.ZERO;

        try {
            jdbc = dwfEntityFacade.getJdbcWrapper();
            query = new NativeSql(jdbc);
            query.appendSql("SELECT SUM(IDEP.QTDDEP) AS QTDDEP ");
            query.appendSql("FROM TPRIDEP IDEP ");
            query.appendSql("JOIN TPRIPROC IPROC_PI ON (IDEP.IDIPROCPI = IPROC_PI.IDIPROC) ");
            query.appendSql("JOIN TPRIPROC IPROC_PA ON (IDEP.IDIPROCPA = IPROC_PA.IDIPROC) ");
            query.appendSql("WHERE ");
            query.appendSql("IPROC_PI.STATUSPROC IN('R', 'A') ");
            query.appendSql("AND IDEP.IDIPROCPI = :IDIPROCPI ");
            query.appendSql("AND IDEP.CODPRODPI = :CODPRODPI ");
            query.appendSql("AND IDEP.CONTROLEPI = :CONTROLEPI ");
            query.setNamedParameter("IDIPROCPI", idiProcPI);
            query.setNamedParameter("CODPRODPI", codProdPI);
            query.setNamedParameter("CONTROLEPI", ComercialUtils.trimControleEstoque(controlePI));
            ResultSet rset = query.executeQuery();
            if (rset.next()) {
                result = BigDecimalUtil.getValueOrZero(rset.getBigDecimal("QTDDEP"));
            }
        } finally {
            NativeSql.releaseResources(query);
            JdbcWrapper.closeSession(jdbc);
        }

        return result;
    }

    public void ejbActivate() throws EJBException, RemoteException {
    }

    public void ejbPassivate() throws EJBException, RemoteException {
    }

    public void ejbRemove() throws EJBException, RemoteException {
    }

    public void setSessionContext(SessionContext ctx) throws EJBException, RemoteException {
        this.context = ctx;
    }

    public void getProdutoAcabadoParaOrdem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        NativeSql sqlUpdate = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal codProdMP = requestBody.get("codProdMP").getAsBigDecimal();
            BigDecimal idIproc = requestBody.get("idiproc").getAsBigDecimal();
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT APA.CODPRODPA, ");
            sql.appendSql(" \t  PRO.DESCRPROD, ");
            sql.appendSql(" \t  EFX.DESCRICAO, ");
            sql.appendSql("\t\t  SUM(APA.QTDAPONTADA) AS QTDAPONTADA, ");
            sql.appendSql("       SUM(APA.QTDPERDA) AS QTDPERDA ");
            sql.appendSql("FROM TPRIATV IATV INNER JOIN TPRAPO APO ON (IATV.IDIATV = APO.IDIATV) ");
            sql.appendSql(" \t\t\t\t INNER JOIN TPREFX EFX ON (IATV.IDEFX = EFX.IDEFX) ");
            sql.appendSql("\t\t\t\t\t INNER JOIN TPRAMP AMP ON (APO.NUAPO = AMP.NUAPO) ");
            sql.appendSql("\t\t\t\t\t INNER JOIN TPRAPA APA ON (APO.NUAPO = APA.NUAPO) ");
            sql.appendSql("\t\t\t\t\t INNER JOIN TGFPRO PRO ON (APA.CODPRODPA = PRO.CODPROD) ");
            sql.appendSql("WHERE IATV.IDIPROC = :IDIPROC ");
            sql.appendSql("\t\tAND AMP.CODPRODMP = :CODPRODMP ");
            sql.appendSql("GROUP BY APA.CODPRODPA, PRO.DESCRPROD, EFX.DESCRICAO ");
            sql.setNamedParameter("IDIPROC", idIproc);
            sql.setNamedParameter("CODPRODMP", codProdMP);
            ResultSet rset = sql.executeQuery();
            JsonObject response = new JsonObject();
            JsonArray registrosJson = new JsonArray();

            while(rset.next()) {
                JsonObject registroJson = new JsonObject();

                for(String campo : camposProdutoApontado.keySet()) {
                    Integer tipo = (Integer)camposProdutoApontado.get(campo);
                    Object valor = rset.getObject(campo);
                    String valueAsString = this.getValueAsString(campo, tipo, valor);
                    registroJson.addProperty(campo, valueAsString);
                }

                registrosJson.add(registroJson);
            }

            response.add("result", registrosJson);
            ctx.setJsonResponse(response);
            rset.close();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            NativeSql.releaseResources(sqlUpdate);
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    public void getMateriaPrimaParaPA(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;
        NativeSql sql = null;
        NativeSql sqlUpdate = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal codProdPA = requestBody.get("codProdPA").getAsBigDecimal();
            BigDecimal idIproc = requestBody.get("idiproc").getAsBigDecimal();
            String seriePA = requestBody.get("seriePA").getAsString();
            sql = new NativeSql(jdbc);
            sql.appendSql("SELECT DISTINCT SERMP.CODPRODMP, ");
            sql.appendSql(" \t  PRO.DESCRPROD, ");
            sql.appendSql(" \t  EFX.DESCRICAO, ");
            sql.appendSql(" \t  AMP.CODVOL, ");
            sql.appendSql("\t\t  (SELECT SUM(QTD) FROM TPRAMP WHERE NUAPO = APO.NUAPO AND CODPRODMP = SERMP.CODPRODMP) AS QTD ");
            sql.appendSql("FROM TPRIATV IATV INNER JOIN TPRAPO APO ON (IATV.IDIATV = APO.IDIATV) ");
            sql.appendSql(" \t\t\t\t INNER JOIN TPREFX EFX ON (IATV.IDEFX = EFX.IDEFX) ");
            sql.appendSql(" \t\t\t\t INNER JOIN TPRAPA APA ON (APA.NUAPO = APO.NUAPO) ");
            sql.appendSql("\t\t\t\t\t INNER JOIN TPRAMP AMP ON (APO.NUAPO = AMP.NUAPO) ");
            sql.appendSql("\t\t\t\t\t INNER JOIN TGFPRO PRO ON (AMP.CODPRODMP = PRO.CODPROD) ");
            sql.appendSql("\t\t\t\t\t INNER JOIN TPRSERMP SERMP ON ( IATV.IDIPROC = SERMP.IDIPROC AND AMP.CODPRODMP = SERMP.CODPRODMP) ");
            sql.appendSql("WHERE IATV.IDIPROC = :IDIPROC ");
            sql.appendSql("\t\tAND APA.CODPRODPA = :CODPRODPA ");
            if (StringUtils.getEmptyAsNull(seriePA) != null) {
                sql.appendSql(" AND (SERMP.SERIEPA IS NULL OR SERMP.SERIEPA = :SERIEPA)");
                sql.setNamedParameter("SERIEPA", seriePA);
            }

            sql.setNamedParameter("IDIPROC", idIproc);
            sql.setNamedParameter("CODPRODPA", codProdPA);
            ResultSet rset = sql.executeQuery();
            JsonObject response = new JsonObject();
            JsonArray registrosJson = new JsonArray();

            while(rset.next()) {
                JsonObject registroJson = new JsonObject();

                for(String campo : camposMateriaPrima.keySet()) {
                    Integer tipo = (Integer)camposMateriaPrima.get(campo);
                    Object valor = rset.getObject(campo);
                    String valueAsString = this.getValueAsString(campo, tipo, valor);
                    registroJson.addProperty(campo, valueAsString);
                }

                registrosJson.add(registroJson);
            }

            response.add("result", registrosJson);
            ctx.setJsonResponse(response);
            rset.close();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            NativeSql.releaseResources(sqlUpdate);
            NativeSql.releaseResources(sql);
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    private String getValueAsString(String campo, Integer tipo, Object valor) throws Exception {
        if (valor == null) {
            return "";
        } else {
            String valorAsString = String.valueOf(valor);
            switch (tipo) {
                case 1:
                    return valorAsString;
                case 2:
                    return (new BigDecimal(valorAsString)).toString();
                default:
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00492", new Exception("Tipo '" + tipo + "' nÃ£o suportado para o campo " + campo));
            }
        }
    }

    public void getListaMPsMovimentacaoManual(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idEfx = XMLUtils.getAttributeAsBigDecimal(params, "idefx");
            BigDecimal seqOper = XMLUtils.getAttributeAsBigDecimal(params, "seqoper");
            BigDecimal idProc = XMLUtils.getAttributeAsBigDecimal(params, "idproc");
            String tipoMaterial = XMLUtils.getAttributeAsString(params, "tipomaterial");
            BigDecimal codProdPa = XMLUtils.getAttributeAsBigDecimal(params, "codprodpa");
            String controlePA = XMLUtils.getAttributeAsString(params, "controlepa");
            BigDecimal idIprocPA = XMLUtils.getAttributeAsBigDecimal(params, "idiproc");
            OrdemProducaoHelper helper = OrdemProducaoHelper.getInstance();
            ProdutoControle produtoControlePA = new ProdutoControle(codProdPa, controlePA);
            ctx.getBodyElement().addContent(helper.getListaMPsMovimentacaoManual(idIprocPA, idEfx, seqOper, idProc, tipoMaterial, produtoControlePA));
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void confirmaMovimentacaoEstoqueManual(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            Element params = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idIproc = XMLUtils.getAttributeAsBigDecimal(params, "idiproc");
            BigDecimal idProc = XMLUtils.getAttributeAsBigDecimal(params, "idproc");
            BigDecimal idIatv = XMLUtils.getAttributeAsBigDecimal(params, "idiatv");
            Element elementOperacao = XMLUtils.getChild(params, "operacao");
            BigDecimal idEfx = XMLUtils.getAttributeAsBigDecimal(elementOperacao, "IDEFX");
            BigDecimal seqOper = XMLUtils.getAttributeAsBigDecimal(elementOperacao, "SEQOPER");
            Element elementMateriais = XMLUtils.getChild(params, "materiais");

            for(Element elementMaterial : elementMateriais.getChildren("material")) {
                BigDecimal codProd = XMLUtils.getAttributeAsBigDecimal(elementMaterial, "CODPRODMP");
                String controle = XMLUtils.getAttributeAsString(elementMaterial, "CONTROLEMP");
                boolean loteAutomatico = (Boolean)MGECoreParameter.getParameter("com.controle.validade.lote");
                boolean utilizaControle = "L".equals(NativeSql.getString("TIPCONTEST", "TGFPRO", "CODPROD = ?", new Object[]{codProd}));
                if (!loteAutomatico && utilizaControle && (controle == null || controle.isEmpty())) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00601", new Exception("Produto " + codProd + " utiliza controle, controle não pode ser vazio!"));
                }
            }

            OperacoesEstoqueAtividade opEstoqueAtividade = new OperacoesEstoqueAtividade(idIproc, idEfx, idIatv, jdbc);
            if (idIatv == null && idProc != null) {
                opEstoqueAtividade.setIdiatvByPreOrdem(idProc);
            }

            opEstoqueAtividade.executarMovimentoEstoqueManual(seqOper);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getListaPAsMovimentacaoManual(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idEfx = XMLUtils.getAttributeAsBigDecimal(params, "idefx");
            BigDecimal seqOper = XMLUtils.getAttributeAsBigDecimal(params, "seqoper");
            BigDecimal idProc = XMLUtils.getAttributeAsBigDecimal(params, "idproc");
            BigDecimal idIatv = XMLUtils.getAttributeAsBigDecimal(params, "idiatv");
            BigDecimal idIproc = XMLUtils.getAttributeAsBigDecimal(params, "idiproc");
            OrdemProducaoHelper helper = OrdemProducaoHelper.getInstance();
            ctx.getBodyElement().addContent(helper.getListaPAsMovimentacaoManual(idEfx, seqOper, idProc, idIatv, idIproc));
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void confirmaOperacaoEncadeada(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            final BigDecimal idIproc = XMLUtils.getAttributeAsBigDecimal(params, "idiproc");
            final BigDecimal idIatv = XMLUtils.getAttributeAsBigDecimal(params, "idiatv");
            Element elementOperacao = XMLUtils.getChild(params, "operacao");
            final BigDecimal idEfx = XMLUtils.getAttributeAsBigDecimal(elementOperacao, "IDEFX");
            final BigDecimal seqOper = XMLUtils.getAttributeAsBigDecimal(elementOperacao, "SEQOPER");
            Element elementCabecalhoNota = XMLUtils.getChild(params, "cabecalhoNota");
            final BigDecimal codEmpDest = XMLUtils.getAttributeAsBigDecimal(elementCabecalhoNota, "CODEMPDEST");
            final BigDecimal codParc = XMLUtils.getAttributeAsBigDecimal(elementCabecalhoNota, "CODPARC");
            hnd.execWithTX(new JapeSession.TXBlock() {
                public void doWithTx() throws Exception {
                    JdbcWrapper jdbc = null;

                    try {
                        EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
                        jdbc = dwfFacade.getJdbcWrapper();
                        jdbc.openSession();
                        OperacoesEstoqueAtividade opEstoqueAtividade = new OperacoesEstoqueAtividade(idIproc, idEfx, idIatv, jdbc);
                        opEstoqueAtividade.executarOperacaoEncadeadaManual(seqOper, codEmpDest, codParc);
                    } finally {
                        JdbcWrapper.closeSession(jdbc);
                    }

                }
            });
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void getStatusProducao(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;
        ResultSet rsetPA = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            Element parametros = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            List<Element> notas = parametros.getChildren("nunota");
            List<Element> sequencias = parametros.getChildren("sequencia");
            rsetPA = this.executeQueryStatusProducaoPA(notas, sequencias, jdbc);
            Element response = new Element("response");
            Element ordens = new Element("ordens");

            while(rsetPA.next()) {
                this.addContentOrdensStatusProducao(rsetPA, ordens);
                BigDecimal nuNota = rsetPA.getBigDecimal("NUNOTA");
                String dtPrevent = rsetPA.getString("DTPREVENT");
                BigDecimal idiproc = rsetPA.getBigDecimal("IDIPROC");
                NativeSql sql = this.getQueryDependenciasPI(nuNota, dtPrevent, jdbc);
                this.addOrdensDependenciasPI(idiproc, sql, ordens, jdbc);
            }

            response.addContent(ordens);
            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcUtils.closeResultSet(rsetPA);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getStatusProducaoNova(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;
        ResultSet rsetPA = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            Element parametros = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            String notas = parametros.getAttribute("nunota").getValue();
            String sequencias = parametros.getAttribute("sequencia").getValue();
            rsetPA = this.executeQueryStatusProducaoPAHTML(notas, sequencias, jdbc);
            Element response = new Element("response");
            Element ordens = new Element("ordens");

            while(rsetPA.next()) {
                this.addContentOrdensStatusProducaoNova(rsetPA, ordens);
                BigDecimal nuNota = rsetPA.getBigDecimal("NUNOTA");
                String dtPrevent = rsetPA.getString("DTPREVENT");
                BigDecimal idiproc = rsetPA.getBigDecimal("IDIPROC");
                NativeSql sql = this.getQueryDependenciasPI(nuNota, dtPrevent, jdbc);
                this.addOrdensDependenciasPINova(idiproc, sql, ordens, jdbc);
            }

            response.addContent(ordens);
            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcUtils.closeResultSet(rsetPA);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private void addOrdensDependenciasPI(BigDecimal idiproc, NativeSql sql, Element ordens, JdbcWrapper jdbc) throws Exception {
        ResultSet rsetDep = null;
        Map<BigDecimal, Element> mapSubOrdens = new HashMap();

        try {
            sql.setNamedParameter("IDIPROCPA", idiproc);
            rsetDep = sql.executeQuery();

            while(rsetDep.next()) {
                this.addContentOrdensStatusProducao(rsetDep, ordens);
                idiproc = rsetDep.getBigDecimal("IDIPROC");
                mapSubOrdens.put(idiproc, ordens);
            }
        } finally {
            JdbcUtils.closeResultSet(rsetDep);
        }

        for(BigDecimal idiprocSubOrdem : mapSubOrdens.keySet()) {
            Element elementOrdens = (Element)mapSubOrdens.get(idiproc);
            this.addOrdensDependenciasPI(idiprocSubOrdem, sql, elementOrdens, jdbc);
        }

    }

    private void addOrdensDependenciasPINova(BigDecimal idiproc, NativeSql sql, Element ordens, JdbcWrapper jdbc) throws Exception {
        ResultSet rsetDep = null;
        Map<BigDecimal, Element> mapSubOrdens = new HashMap();

        try {
            sql.setNamedParameter("IDIPROCPA", idiproc);
            rsetDep = sql.executeQuery();

            while(rsetDep.next()) {
                this.addContentOrdensStatusProducaoNova(rsetDep, ordens);
                idiproc = rsetDep.getBigDecimal("IDIPROC");
                mapSubOrdens.put(idiproc, ordens);
            }
        } finally {
            JdbcUtils.closeResultSet(rsetDep);
        }

        for(BigDecimal idiprocSubOrdem : mapSubOrdens.keySet()) {
            Element elementOrdens = (Element)mapSubOrdens.get(idiproc);
            this.addOrdensDependenciasPINova(idiprocSubOrdem, sql, elementOrdens, jdbc);
        }

    }

    private NativeSql getQueryDependenciasPI(BigDecimal nuNota, String dtPrevent, JdbcWrapper jdbc) throws Exception {
        NativeSql sql = null;
        sql = new NativeSql(jdbc, this.getClass(), "OrdemProducaoSPBean_statusProducaoPI.sql");
        sql.setNamedParameter("NUNOTAS", nuNota);
        sql.setNamedParameter("DTPREVENTS", dtPrevent);
        sql.setReuseStatements(true);
        return sql;
    }

    private void addContentOrdensStatusProducao(ResultSet rset, Element ordens) throws Exception {
        Element ordem = new Element("ordem");
        Map<String, Integer> campos = this.getCamposStatusProducao();

        for(String campo : campos.keySet()) {
            Integer tipo = (Integer)campos.get(campo);
            Object valor = rset.getObject(campo);
            String valueAsString = this.getValueAsString(campo, tipo, valor);
            ordem.setAttribute(campo, valueAsString);
        }

        ordens.addContent(ordem);
    }

    private void addContentOrdensStatusProducaoNova(ResultSet rset, Element ordens) throws Exception {
        Element ordem = new Element("ordem");
        Map<String, Integer> campos = this.getCamposStatusProducaoNova();

        for(String campo : campos.keySet()) {
            Integer tipo = (Integer)campos.get(campo);
            Object valor = rset.getObject(campo);
            String valueAsString = this.getValueAsString(campo, tipo, valor);
            ordem.setAttribute(campo, valueAsString);
        }

        Boolean achou = false;

        for(int i = 0; i < ordens.getContentSize(); ++i) {
            Element elementOrdem = (Element)ordens.getContent().get(i);
            if (ordem.getAttribute("IDIPROC").toString().equals(elementOrdem.getAttribute("IDIPROC").toString())) {
                achou = true;
            }
        }

        if (!achou) {
            ordens.addContent(ordem);
        }

    }

    private ResultSet executeQueryStatusProducaoPA(List<Element> notas, List<Element> sequencias, JdbcWrapper jdbc) throws Exception {
        String notasQuery = this.getElementAsString(notas, "nunota");
        String seqQuery = this.getElementAsString(sequencias, "sequencia");
        NativeSql sql = new NativeSql(jdbc);
        sql.appendSql("SELECT IPROC.IDIPROC,");
        sql.appendSql("\tINOTA.NUNOTA,");
        sql.appendSql("\tINOTA.DTPREVENT,");
        sql.appendSql(" IPROC.STATUSPROC,");
        sql.appendSql(" IPA.QTDPRODUZIR AS QTD,");
        sql.appendSql(" PRO.CODPROD AS CODPROD,");
        sql.appendSql(" PRO.DESCRPROD AS DESCR,");
        sql.appendSql(" IPROC.IDIPROC AS IDIPROCPAI,");
        sql.appendSql(" 'PA' AS TIPO");
        sql.appendSql("\tFROM TPRINOTA INOTA ");
        sql.appendSql("\tINNER JOIN TPRIPROC IPROC ON (INOTA.IDIPROC = IPROC.IDIPROC)");
        sql.appendSql("\tINNER JOIN TPRIPA IPA ON (IPA.IDIPROC = IPROC.IDIPROC)");
        sql.appendSql("\tINNER JOIN TGFPRO PRO ON (PRO.CODPROD = IPA.CODPRODPA)");
        sql.appendSql("\tWHERE INOTA.NUNOTA IN (" + notasQuery + ")");
        if (seqQuery != "") {
            sql.appendSql("\tAND INOTA.SEQNOTA IN (" + seqQuery + ")");
        }

        sql.appendSql(" ORDER BY IPROC.IDIPROC");
        return sql.executeQuery();
    }

    private ResultSet executeQueryStatusProducaoPAHTML(String notas, String sequencias, JdbcWrapper jdbc) throws Exception {
        NativeSql sql = null;
        sql = new NativeSql(jdbc, this.getClass(), "OrdemProducaoSPBean_statusProducao.sql");
        StringBuffer where = new StringBuffer();
        where.append(SQLUtils.buildINClauseByValues("INOTA.NUNOTA", notas));
        StringUtils.replaceString("/* ${WHERE_FILTRO} */", where.toString(), sql.getSqlBuf());
        return sql.executeQuery();
    }

    private String getElementAsString(List<Element> array, String itemName) {
        String stringArray = "";
        int contElem = 1;

        for(Element element : array) {
            BigDecimal item = XMLUtils.getAttributeAsBigDecimal(element, itemName);
            if (contElem == array.size()) {
                stringArray = stringArray + item.toString();
            } else {
                stringArray = stringArray + item.toString() + ",";
            }

            ++contElem;
        }

        return stringArray;
    }

    private Map<String, Integer> getCamposStatusProducao() {
        Map<String, Integer> campos = new HashMap();
        campos.put("STATUSPROC", 1);
        campos.put("IDIPROC", 2);
        campos.put("NUNOTA", 2);
        campos.put("QTD", 2);
        campos.put("CODPROD", 2);
        campos.put("DESCR", 1);
        campos.put("DTPREVENT", 1);
        campos.put("TIPO", 1);
        return campos;
    }

    private Map<String, Integer> getCamposStatusProducaoNova() {
        Map<String, Integer> campos = new HashMap();
        campos.put("STATUSPROC", 1);
        campos.put("IDIPROC", 2);
        campos.put("NUNOTA", 2);
        campos.put("QTD", 2);
        campos.put("QTD_PRODUZIR", 2);
        campos.put("QTD_PRODUZIDA", 2);
        campos.put("CODPROD", 2);
        campos.put("DESCR", 1);
        campos.put("DTPREVENT", 1);
        campos.put("TIPO", 1);
        return campos;
    }

    static {
        camposProdutoApontado.put("CODPRODPA", 2);
        camposProdutoApontado.put("DESCRPROD", 1);
        camposProdutoApontado.put("QTDAPONTADA", 2);
        camposProdutoApontado.put("QTDPERDA", 2);
        camposProdutoApontado.put("DESCRICAO", 1);
        camposMateriaPrima.put("CODPRODMP", 2);
        camposMateriaPrima.put("DESCRPROD", 1);
        camposMateriaPrima.put("DESCRICAO", 1);
        camposMateriaPrima.put("QTD", 2);
    }
}
