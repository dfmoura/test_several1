//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by Fernflower decompiler)
//

package br.com.sankhya.mgeprod.model.services;

import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.PersistenceException;
import br.com.sankhya.jape.bmp.PersistentLocalEntity;
import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.jape.util.FinderWrapper;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.EntityVO;
import br.com.sankhya.jape.wrapper.JapeFactory;
import br.com.sankhya.jape.wrapper.JapeWrapper;
import br.com.sankhya.jape.wrapper.fluid.FluidCreateVO;
import br.com.sankhya.jape.wrapper.fluid.FluidUpdateVO;
import br.com.sankhya.mgeprod.model.helper.AlocacaoCentroDeTrabalhoInvalidaException;
import br.com.sankhya.mgeprod.model.helper.ApontamentoHelper;
import br.com.sankhya.mgeprod.model.helper.ApontamentoInvalidoException;
import br.com.sankhya.mgeprod.model.helper.ApontamentoPendentesException;
import br.com.sankhya.mgeprod.model.helper.ControleAtividadeHelper;
import br.com.sankhya.mgeprod.model.helper.ControleRepositorioPAHelper;
import br.com.sankhya.mgeprod.model.helper.GeradorNotasOperacoesEstoqueHelper;
import br.com.sankhya.mgeprod.model.helper.LocalBaixaMPHelper;
import br.com.sankhya.mgeprod.model.helper.MomentoOperacaoEstoque;
import br.com.sankhya.mgeprod.model.helper.OperacaoProducaoHelper;
import br.com.sankhya.mgeprod.model.helper.OperacoesEstoqueAtividade;
import br.com.sankhya.mgeprod.model.helper.OperacoesEstoqueHelper;
import br.com.sankhya.mgeprod.model.helper.ProporcaoApontamentoInvalidaException;
import br.com.sankhya.mgeprod.model.helper.WorkCenterHelper;
import br.com.sankhya.mgeprod.model.utils.ApontamentoTotem;
import br.com.sankhya.mgeprod.model.utils.ListaMateriaisUtils;
import br.com.sankhya.mgeprod.model.utils.Pair;
import br.com.sankhya.mgeprod.model.utils.ProducaoUtils;
import br.com.sankhya.mgeprod.model.utils.ProdutoAcabadoApontamentoTotem;
import br.com.sankhya.mgeprod.model.utils.ProdutoControle;
import br.com.sankhya.mgeprod.model.utils.RecursoControle;
import br.com.sankhya.modelcore.MGEModelException;
import br.com.sankhya.modelcore.auth.AuthenticationInfo;
import br.com.sankhya.modelcore.auth.MGEAuthorizationManager;
import br.com.sankhya.modelcore.comercial.ComercialUtils;
import br.com.sankhya.modelcore.comercial.LiberacaoAlcadaHelper;
import br.com.sankhya.modelcore.comercial.LiberacaoSolicitada;
import br.com.sankhya.modelcore.comercial.UnidadeProdutoUtils;
import br.com.sankhya.modelcore.comercial.centrais.NumeroSerieGlobalHelper;
import br.com.sankhya.modelcore.metadata.DataDictionaryUtils;
import br.com.sankhya.modelcore.metadata.FieldMetadata;
import br.com.sankhya.modelcore.util.AuthorizationHelper;
import br.com.sankhya.modelcore.util.DatasetCRUDListener;
import br.com.sankhya.modelcore.util.DatasetUtils;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;
import br.com.sankhya.modelcore.util.I18nServerSideBundle;
import br.com.sankhya.modelcore.util.MGECoreParameter;
import br.com.sankhya.modelcore.util.ProcedureCaller;
import br.com.sankhya.modelcore.util.SPBeanUtils;
import br.com.sankhya.modelcore.util.ValidadorLogin;
import br.com.sankhya.util.troubleshooting.SKError;
import br.com.sankhya.util.troubleshooting.TSLevel;
import br.com.sankhya.ws.ServiceCanceledException;
import br.com.sankhya.ws.ServiceContext;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.JdbcUtils;
import com.sankhya.util.JsonUtils;
import com.sankhya.util.ResourceLock;
import com.sankhya.util.StringUtils;
import com.sankhya.util.TimeUtils;
import com.sankhya.util.XMLUtils;
import java.math.BigDecimal;
import java.rmi.RemoteException;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.ejb.EJBException;
import javax.ejb.FinderException;
import javax.ejb.ObjectNotFoundException;
import javax.ejb.SessionBean;
import javax.ejb.SessionContext;
import org.jdom.Attribute;
import org.jdom.Element;

public class OperacaoProducaoSPBean implements SessionBean {
    protected SessionContext context;
    protected static final SimpleDateFormat formatDh = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
    protected static final SimpleDateFormat formatDhTime = new SimpleDateFormat("yyyy-MM-dd HH:mm");
    private static final String ACESSO_ALTERA_WC = "AWC";
    private static final String ACESSO_SUP = "S";
    private static final String ACEITA = "A";
    private static final String INICIADA = "I";
    private static final String PARADA = "P";
    private static final String NORMAL = "N";
    private static final String FINAL_TURNO = "T";
    private static final String TIPO_FIXO = "F";
    private static final String SUSPENSO = "S";

    public OperacaoProducaoSPBean() {
    }

    public void aceitarInstanciaAtividades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JapeSession.putProperty("br.com.mgeprod.isOperacaoProducao", true);
            Element instanciasElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "instancias");
            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);

            for(Element instanciaElem : instanciasElem.getChildren("instancia")) {
                Element idElem = XMLUtils.getRequiredChild(instanciaElem, "IDIATV");
                BigDecimal idInstancia = XMLUtils.getRequiredContentAsBigDecimal(idElem);
                helper.aceitarInstanciaAtividade(idInstancia, jdbc);
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    public void rejeitarInstanciaAtividades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();
            helper.rejeitarInstanciaAtividades(ctx, jdbc);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void iniciarInstanciaAtividades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();
            Element instanciasElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "instancias");
            boolean aceitaWCIndisponivel = XMLUtils.getAttributeAsBoolean(instanciasElem, "ACEITA_WC_INDISPONIVEL");
            JapeSession.putProperty("br.com.sankhya.mgeprod.aceita.wc.indisponivel", aceitaWCIndisponivel);
            JapeSession.putProperty("br.com.mgeprod.isOperacaoProducao", true);

            for(Element instanciaElem : instanciasElem.getChildren("instancia")) {
                Element idElem = XMLUtils.getRequiredChild(instanciaElem, "IDIATV");
                BigDecimal idiatv = XMLUtils.getRequiredContentAsBigDecimal(idElem);
                helper.iniciarInstanciaAtividade(idiatv, jdbc);
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    private ResourceLock.LockHandle findLock(String service, String query, String msgException) throws Exception {
        try {
            ResourceLock.LockHandle lock = ResourceLock.getLock(String.format(service, query), false);
            if (lock == null) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00524", new Exception(msgException));
            } else {
                return lock;
            }
        } catch (Exception e) {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00523", new Exception(msgException, e));
        }
    }

    public void finalizarInstanciaAtividades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element instanciasElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "instancias");
            boolean ignorarApontamentosDivergentes = XMLUtils.getAttributeAsBoolean(instanciasElem, "confirmarApontamentosDivergentes");
            BigDecimal codUserExecutante = XMLUtils.getAttributeAsBigDecimal(instanciasElem, "userExecutante");
            boolean ignoraValidacaoFormulario = XMLUtils.getAttributeAsBoolean(instanciasElem, "ignoraValidacaoFormulario");
            BigDecimal dhFinalTime = XMLUtils.getAttributeAsBigDecimal(instanciasElem, "dhFinal");
            Timestamp dhFinal = dhFinalTime != null ? new Timestamp(dhFinalTime.longValue()) : null;
            BigDecimal codUsuInicioApontamento = XMLUtils.getAttributeAsBigDecimal(instanciasElem, "codUsuInicioApontamento");
            if (codUserExecutante == null) {
                codUserExecutante = AuthenticationInfo.getCurrent().getUserID();
            }

            JapeSession.putProperty("br.com.sankhya.mgeprod.apontamento.user", codUserExecutante);
            JapeSession.putProperty("codUsuApontamentoProducao", codUsuInicioApontamento);
            ArrayList<BigDecimal> idiatvs = new ArrayList();

            for(Element instanciaElem : instanciasElem.getChildren("instancia")) {
                BigDecimal idiatv = XMLUtils.getRequiredContentAsBigDecimal(XMLUtils.getRequiredChild(instanciaElem, "IDIATV"));
                BigDecimal idIproc = XMLUtils.getContentAsBigDecimal(XMLUtils.getChild(instanciaElem, "IDIPROC"));
                BigDecimal idEfx = XMLUtils.getContentAsBigDecimal(XMLUtils.getChild(instanciaElem, "IDEFX"));
                BigDecimal idProc = XMLUtils.getContentAsBigDecimal(XMLUtils.getChild(instanciaElem, "IDPROC"));
                if (!ignoraValidacaoFormulario) {
                    OperacaoProducaoHelper.getInstance().validaObrigatoriedadeFormularioAtividade(idIproc, idProc, idEfx, jdbc);
                }

                idiatvs.add(idiatv);
            }

            Element eventRedimensionarPA = instanciasElem.getChild("eventRedimensionarPA");
            JapeSession.putProperty("br.com.sankhya.mgeprod.redimensionar.op.pa.perda", eventRedimensionarPA);
            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();
            helper.setCodUserExecutante(codUserExecutante);
            helper.finalizarInstanciaAtividades(idiatvs, ignorarApontamentosDivergentes, jdbc, dhFinal);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void liberarCentroDeTrabalho(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element instanciasElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "instancias");
            boolean isTelaWorkCenter = XMLUtils.getAttributeAsBoolean(instanciasElem, "isTelaWorkCenter");

            for(Element instanciaElem : instanciasElem.getChildren("instancia")) {
                Element idElem = XMLUtils.getRequiredChild(instanciaElem, "IDIATV");
                BigDecimal idIatv = XMLUtils.getRequiredContentAsBigDecimal(idElem);
                DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idIatv});
                DynamicVO atividadeVO = instanciaAtividadeVO.asDymamicVO("Atividade");
                if (BigDecimal.ZERO.compareTo(instanciaAtividadeVO.asBigDecimalOrZero("CODWCP")) >= 0) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00213", new Exception("Não é possível liberar Centro de Trabalho, pois está atividade não está utilizando Centro de Trabalho."));
                }

                if (atividadeVO.asBoolean("LIBERARWCMANUAL") || isTelaWorkCenter) {
                    DynamicVO historicoWC = this.buscaHistoricoWCVO(dwfEntityFacade, instanciaAtividadeVO.asBigDecimalOrZero("CODWCP"), instanciaAtividadeVO.asBigDecimal("IDIPROC"), instanciaAtividadeVO.asBigDecimal("IDIATV"));
                    if (historicoWC != null) {
                        PersistentLocalEntity historicoWCEntity = dwfEntityFacade.findEntityByPrimaryKey("HistoricoWorkCenterAtividade", new Object[]{instanciaAtividadeVO.asBigDecimal("CODWCP"), instanciaAtividadeVO.asBigDecimal("IDIPROC"), instanciaAtividadeVO.asBigDecimal("IDIATV"), historicoWC.asTimestamp("DHALOC")});
                        DynamicVO historicoWCVO = (DynamicVO)historicoWCEntity.getValueObject();
                        historicoWCVO.setProperty("DHLIBALOC", TimeUtils.getNow());
                        historicoWCVO.setProperty("CODUSULIBALOC", AuthenticationInfo.getCurrent().getUserID());
                        historicoWCEntity.setValueObject((EntityVO)historicoWCVO);
                    }
                }
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JdbcWrapper.closeSession(jdbc);
            JapeSession.close(hnd);
        }

    }

    public void carregaExecucaoApontamentoTotem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element param = XMLUtils.getRequiredChild(ctx.getRequestBody(), "param");
            BigDecimal codExec = XMLUtils.getAttributeAsBigDecimal(param, "codexec");
            BigDecimal idIatv = XMLUtils.getRequiredAttributeAsBigDecimal(param, "idiatv");
            if (codExec == null) {
                codExec = ((AuthenticationInfo)ctx.getAutentication()).getUserID();
            }

            DynamicVO execucao = this.getExecucaoInstanciaAtividadeAtiva(idIatv, codExec);
            if (execucao == null) {
                OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
                PersistentLocalEntity execucaoFimTurnoEntity = helper.getExecucaoAbertaFimTurno(idIatv);
                if (execucaoFimTurnoEntity != null) {
                    execucao = (DynamicVO)execucaoFimTurnoEntity.getValueObject();
                }
            }

            if (execucao != null) {
                Timestamp dhinicio = execucao.asTimestamp("DHINICIO");
                BigDecimal ideiatv = execucao.asBigDecimal("IDEIATV");
                BigDecimal codusu = execucao.asBigDecimal("CODUSU");
                String tipoParada = execucao.asString("TIPO");
                BigDecimal motivoParada = execucao.asBigDecimalOrZero("CODMTP");
                String observacao = execucao.asString("OBSERVACAO");
                String descMotivo = null;
                if (motivoParada.intValue() != 0) {
                    DynamicVO voParada = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("MotivosParada", motivoParada);
                    descMotivo = voParada.asString("DESCRICAO");
                }

                XMLUtils.addContentElement(ctx.getBodyElement(), "ideiatv", ideiatv);
                XMLUtils.addContentElement(ctx.getBodyElement(), "dhinicio", dhinicio);
                XMLUtils.addContentElement(ctx.getBodyElement(), "codusu", codusu);
                if ("T".equals(tipoParada)) {
                    XMLUtils.addContentElement(ctx.getBodyElement(), "codexec", execucao.asBigDecimal("CODEXEC"));
                } else {
                    XMLUtils.addContentElement(ctx.getBodyElement(), "codexec", codExec);
                }

                XMLUtils.addContentElement(ctx.getBodyElement(), "tipoparada", tipoParada);
                XMLUtils.addContentElement(ctx.getBodyElement(), "motivoparada", motivoParada);
                XMLUtils.addContentElement(ctx.getBodyElement(), "observacao", observacao);
                XMLUtils.addContentElement(ctx.getBodyElement(), "descmotivo", descMotivo);
            } else {
                XMLUtils.addContentElement(ctx.getBodyElement(), "codusu", codExec);
                XMLUtils.addContentElement(ctx.getBodyElement(), "codexec", codExec);
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private DynamicVO getExecucaoInstanciaAtividadeAtiva(BigDecimal idIatv, BigDecimal codExec) throws Exception {
        return this.getExecucaoInstanciaAtividadeAtiva(idIatv, codExec, false);
    }

    private DynamicVO getExecucaoInstanciaAtividadeAtiva(BigDecimal idIatv, BigDecimal codExec, boolean considerarAcessoGerenteManufatura) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        DynamicVO execucao = null;
        OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();
        StringBuilder whereBuilder = new StringBuilder("this.IDIATV = ? AND this.DHFINAL IS NULL");
        Collection<BigDecimal> parans = new ArrayList();
        parans.add(idIatv);
        if (considerarAcessoGerenteManufatura) {
            if (!helper.isManagerManufatura(codExec)) {
                whereBuilder.append(" AND this.CODEXEC = ?");
                parans.add(codExec);
            }
        } else if (codExec != null) {
            whereBuilder.append(" AND this.CODEXEC = ? ");
            parans.add(codExec);
        }

        Collection<DynamicVO> execucoesAbertas = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ExecucaoAtividade", whereBuilder.toString(), parans.toArray()));
        if (execucoesAbertas.size() > 0) {
            execucao = (DynamicVO)execucoesAbertas.iterator().next();
        }

        return execucao;
    }

    private DynamicVO getExecucaoAtivaOutroUsuario(BigDecimal idIatv, BigDecimal codExec) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        DynamicVO execucao = null;
        Collection<DynamicVO> execucoesAbertas = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ExecucaoAtividade", "this.IDIATV = ? AND this.DHFINAL IS NULL AND this.CODEXEC <> ?", new Object[]{idIatv, codExec}));
        if (execucoesAbertas.size() > 0) {
            execucao = (DynamicVO)execucoesAbertas.iterator().next();
        }

        return execucao;
    }

    public void registrarApontamentoTotem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            try {
                hnd = JapeSession.open();
                EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
                jdbc = dwfEntityFacade.getJdbcWrapper();
                jdbc.openSession();
                Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "apontamento");
                Element execucaoElement = XMLUtils.getRequiredChild(paramsElement, "execucao");
                Timestamp dhInicioExecucao = XMLUtils.getAttributeAsTimestamp(execucaoElement, "dhinicio");
                Timestamp dhFimExecucao = XMLUtils.getAttributeAsTimestamp(execucaoElement, "dhfim");
                BigDecimal executanteDaExecucao = XMLUtils.getAttributeAsBigDecimal(execucaoElement, "executante");
                BigDecimal responsavelDaExecucao = XMLUtils.getRequiredAttributeAsBigDecimal(execucaoElement, "responsavel");
                BigDecimal ideiatv = XMLUtils.getAttributeAsBigDecimal(execucaoElement, "ideiatv");
                BigDecimal idiatv = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "idiatv");
                BigDecimal idiproc = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "idiproc");
                BigDecimal idefx = XMLUtils.getAttributeAsBigDecimal(paramsElement, "idefx");
                BigDecimal codPlp = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codPlp");
                BigDecimal codWcp = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codwcp");
                BigDecimal codwcpOld = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codwcpold");
                boolean validaWCUsuario = XMLUtils.getAttributeAsBoolean(paramsElement, "validaWCUsuario");
                String clientEventRespotaUltimoApontamento = XMLUtils.getAttributeAsString(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO");
                boolean aceitarQtdMaior = XMLUtils.getAttributeAsBoolean(paramsElement, "ACEITARQTDMAIOR");
                String tipoParada = XMLUtils.getAttributeAsString(paramsElement, "tipoParada");
                BigDecimal codMtp = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codMtp");
                String observacaoParada = XMLUtils.getAttributeAsString(paramsElement, "observacaoParada");
                BigDecimal codusu = XMLUtils.getAttributeAsBigDecimal(paramsElement, "USUARIOLOGADO");
                boolean respostaSerieLiberado = XMLUtils.getAttributeAsBoolean(paramsElement, "RESPOSTA_SERIE_LIBERADO");
                boolean respostaSerieLiberadoPerda = XMLUtils.getAttributeAsBoolean(paramsElement, "RESPOSTA_SERIE_LIBERADO_PERDA");
                boolean respostaSerieLiberadoMP = XMLUtils.getAttributeAsBoolean(paramsElement, "RESPOSTA_SERIE_LIBERADO_MP");
                boolean isUltimoApontamento = false;
                boolean isConfirmadoUltimoApontamentoMpFixo = XMLUtils.getAttributeAsBoolean(paramsElement, "CONFIRMADO_ULTIMO_APONTAMENTO_MP_FIXO");
                boolean isMostradoPopUpUltimoApontamentoMPFixa = XMLUtils.getAttributeAsBoolean(paramsElement, "POPUP_APONTAMENTO_MP_FIXO_MOSTRADO");
                JapeSession.putProperty("br.com.sankhya.mgeprod.confirmado.ult.apontamento.mp.fixa", isConfirmadoUltimoApontamentoMpFixo);
                JapeSession.putProperty("br.com.sankhya.mgeprod.popup.apresentado.ult.apontamento.mp.fixa", isMostradoPopUpUltimoApontamentoMPFixa);
                JapeSession.putProperty("br.com.sankhya.mgeprod.is.ultimo.apontamento", new Boolean(clientEventRespotaUltimoApontamento) || aceitarQtdMaior);
                if (dhFimExecucao == null && !"P".equals(tipoParada) && !"N".equals(tipoParada) && !"T".equals(tipoParada) && !"S".equals(tipoParada)) {
                    dhFimExecucao = TimeUtils.getNow();
                }

                if (!StringUtils.isEmpty(clientEventRespotaUltimoApontamento)) {
                    isUltimoApontamento = Boolean.valueOf(clientEventRespotaUltimoApontamento);
                }

                AuthenticationInfo previousAuthInfo = null;
                if (codusu != null) {
                    previousAuthInfo = AuthenticationInfo.getCurrent();
                    DynamicVO usuarioVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Usuario", new Object[]{codusu});
                    AuthenticationInfo auth = new AuthenticationInfo(usuarioVO.asString("NOMEUSU"), codusu, BigDecimalUtil.ZERO_VALUE, 0);
                    auth.makeCurrent();
                }

                if (executanteDaExecucao == null) {
                    executanteDaExecucao = ((AuthenticationInfo)ctx.getAutentication()).getUserID();
                }

                ApontamentoTotem apontamentoTotem = this.buildApontamentoTotemFromXML(paramsElement);
                this.validarExecucao(paramsElement);
                DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idiatv});
                if (instanciaAtividadeVO.asTimestamp("DHFINAL") != null) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00214", new Exception("Não é possível registrar novas execuções pois a atividade IDIATV = " + idiatv + " já foi finalizada em " + instanciaAtividadeVO.asTimestamp("DHFINAL") + "."));
                }

                OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
                boolean aceitaWCIndisponivel = XMLUtils.getAttributeAsBoolean(paramsElement, "ACEITA_WC_INDISPONIVEL");
                JapeSession.putProperty("br.com.sankhya.mgeprod.aceita.wc.indisponivel", aceitaWCIndisponivel);
                if (validaWCUsuario) {
                    DynamicVO workCenterVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("WorkCenter", new Object[]{codWcp});
                    if (codPlp.compareTo(workCenterVO.asBigDecimal("CODPLP")) != 0) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00215", new Exception("Não é possível confirmar o apontamento pois o CT que o usuário está logado não pertence a planta do processo"));
                    }

                    this.doAlteracaoLote(dwfEntityFacade, idiatv, codWcp, codwcpOld);
                }

                if (instanciaAtividadeVO.asTimestamp("DHINICIO") == null) {
                    helper.iniciarInstanciaAtividade(idiatv, dhInicioExecucao, executanteDaExecucao, jdbc);
                    if (!"A".equals(instanciaAtividadeVO.asString("SITUACAO")) && !"I".equals(instanciaAtividadeVO.asString("SITUACAO"))) {
                        helper.aceitarInstanciaAtividade(idiatv, dhInicioExecucao, executanteDaExecucao, responsavelDaExecucao, jdbc);
                    }
                }

                DynamicVO execucaoInstanciaAtividadeVO = null;
                if (ideiatv == null) {
                    execucaoInstanciaAtividadeVO = helper.criarExecucaoInstanciaAtividade(dhInicioExecucao, dhFimExecucao, executanteDaExecucao, responsavelDaExecucao, idiatv, tipoParada, codMtp, observacaoParada);
                    ideiatv = execucaoInstanciaAtividadeVO.asBigDecimal("IDEIATV");
                    if ("T".equals(tipoParada)) {
                        helper.limparUsuarioExecutanteAtividade(idiatv);
                    }
                } else {
                    execucaoInstanciaAtividadeVO = this.getExecucaoInstanciaAtividadeAtiva(idiatv, executanteDaExecucao);
                    if (dhInicioExecucao == null || !formatDhTime.format(execucaoInstanciaAtividadeVO.asTimestamp("DHINICIO")).equals(formatDhTime.format(dhInicioExecucao))) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00216", new Exception("Não é possível alterar a data de início da execução."));
                    }

                    if (execucaoInstanciaAtividadeVO.asBigDecimal("IDEIATV").compareTo(ideiatv) != 0) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00217", new Exception("Execução de instância de atividade inválida. Execução em aberto: " + execucaoInstanciaAtividadeVO.asBigDecimal("IDEIATV") + ". Execução recebida: " + ideiatv));
                    }

                    if (("P".equals(tipoParada) || "T".equals(tipoParada)) && codMtp != null) {
                        helper.alteraMotivoParadaExecucaoAtividade(idiatv, executanteDaExecucao, codMtp, observacaoParada);
                    }
                }

                if ("N".equals(tipoParada)) {
                    helper.atribuirUsuarioExecutanteAtividade(idiatv, executanteDaExecucao, ideiatv);
                }

                if (dhFimExecucao != null) {
                    if (execucaoInstanciaAtividadeVO.asTimestamp("DHINICIO").getTime() > dhFimExecucao.getTime() && !formatDhTime.format(execucaoInstanciaAtividadeVO.asTimestamp("DHINICIO")).equals(formatDhTime.format(dhFimExecucao))) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00218", new Exception("A data final não pode ser anterior à data de início da execução."));
                    }

                    helper.finalizarExecucaoInsanciaAtividade(execucaoInstanciaAtividadeVO.asBigDecimal("IDEIATV"), dhFimExecucao, executanteDaExecucao);
                    if ("P".equals(tipoParada)) {
                        helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, executanteDaExecucao, executanteDaExecucao, idiatv);
                    } else if ("T".equals(tipoParada)) {
                        helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, codusu, codusu, idiatv);
                    }
                }

                BigDecimal nuapo = null;
                ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
                Collection<ProdutoControle> listaProdutosControlePendentesApontamento = new ArrayList();
                boolean atvGeraNotaProducao = this.atividadeGeraNotaProducao(dwfEntityFacade, idiatv);

                try {
                    if (apontamentoTotem.getProdutosAcabados().size() > 0) {
                        nuapo = apontamentoHelper.getNuApoApontamentoPendenteAtividade(idiatv);
                        if (nuapo == null) {
                            nuapo = apontamentoHelper.criarApontamentoTotem(apontamentoTotem, responsavelDaExecucao, dhFimExecucao);
                        } else {
                            apontamentoHelper.atualizaQtdApontamentoTotem(apontamentoTotem, nuapo);
                        }

                        JapeWrapper cabecalhoApontamentoDAO = JapeFactory.dao("CabecalhoApontamento");
                        DynamicVO cabecalhoApontamentoVO = cabecalhoApontamentoDAO.findByPK(new Object[]{nuapo});
                        this.validarDataApontamento(cabecalhoApontamentoVO, jdbc);
                        Collection<DynamicVO> apontamentosPA = cabecalhoApontamentoVO.asCollection("ApontamentoPA");
                        boolean temQtdApontadaIgualMaiorQtdProduzir = this.validaQtdApontadaIgualMaiorQtdProduzir(jdbc, idiatv, idiproc, idefx, apontamentosPA);
                        if (StringUtils.isEmpty(clientEventRespotaUltimoApontamento)) {
                            boolean permitePerda100Porcento = apontamentoHelper.permiteApontamentoComPerdaTotal(cabecalhoApontamentoVO);
                            boolean temQtdApontadaMenorQtdProduzir = this.validaQtdApontadaMenorQtdProduzir(jdbc, idiatv, idiproc, idefx);
                            if ((atvGeraNotaProducao || permitePerda100Porcento) && temQtdApontadaMenorQtdProduzir && !aceitarQtdMaior) {
                                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.ultimo", new Element("event"));
                                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00220", new ServiceCanceledException());
                            }
                        }

                        if (isUltimoApontamento || temQtdApontadaIgualMaiorQtdProduzir) {
                            this.processarPerdaUltimoApontamento(dwfEntityFacade, jdbc, idiatv, idiproc, nuapo, cabecalhoApontamentoVO);
                            JapeSession.putProperty("br.com.sankhya.apontamento.producao.ultimo.apontamento", true);
                        }

                        this.buildSerieMPApontamentoTotem(idiproc, nuapo);
                        this.validaQtdSeriesPAApontamento(jdbc, idiatv, idiproc, idefx);
                        this.validaQtdSeriesMPApontamento(jdbc, nuapo, idiproc);
                        JapeSession.putProperty("br.com.sankhya.mgeprod.gera.nota.producao", atvGeraNotaProducao);
                        apontamentoHelper.validarConfirmacaoApontamento(cabecalhoApontamentoVO, true);
                        if (!aceitarQtdMaior) {
                            Collection<LiberacaoSolicitada> liberacoesSolicitadasMP = apontamentoHelper.validarQtdApontada(nuapo, idefx, apontamentosPA);
                            if (!liberacoesSolicitadasMP.isEmpty()) {
                                ctx.getBodyElement().addContent(LiberacaoAlcadaHelper.buildXMLLiberacoesPendentes(liberacoesSolicitadasMP));
                                return;
                            }
                        }

                        apontamentoHelper.confirmarApontamento(nuapo, aceitarQtdMaior);
                        if (!NumeroSerieGlobalHelper.usaSerieGlobal()) {
                            if (atvGeraNotaProducao && !respostaSerieLiberado) {
                                if (this.isPAControladoPorSerie(jdbc, idiproc)) {
                                    XMLUtils.addAttributeElement(paramsElement, "notaProducao", "S");
                                    XMLUtils.addAttributeElement(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO", clientEventRespotaUltimoApontamento);
                                    paramsElement.addContent(this.getMateriasPrimasSemVinculo(idefx, idiproc, nuapo, jdbc, false));
                                    ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.liberaNroSerie", (Element)paramsElement.detach());
                                    throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00220", new ServiceCanceledException());
                                }

                                Element seriesMPs = this.buscaSeriesMP(jdbc, idiproc, nuapo);
                                if (seriesMPs != null && !respostaSerieLiberadoMP) {
                                    XMLUtils.addAttributeElement(paramsElement, "notaProducaoSerieMP", "S");
                                    XMLUtils.addAttributeElement(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO", clientEventRespotaUltimoApontamento);
                                    paramsElement.addContent(seriesMPs);
                                    ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.liberaNroSerie", (Element)paramsElement.detach());
                                    throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00220", new ServiceCanceledException());
                                }
                            }

                            if (JapeSession.getPropertyAsBoolean("br.com.sankhya.apontamento.producao.ultimo.apontamento", true) && !respostaSerieLiberadoPerda) {
                                int qtdSeriesMPSemVinculo = (Integer)this.verificaQtdSeriesMPsemVinculoPerda(jdbc, idiproc, idefx, true).getLeft();
                                Element elem = XMLUtils.getChild(paramsElement, "produtos_acabados");
                                Element elemP = XMLUtils.getChild(elem, "pa");
                                BigDecimal qtdPerda = XMLUtils.getAttributeAsBigDecimal(elemP, "qtdPerda");
                                if (this.isPAControladoPorSerie(jdbc, idiproc) && qtdSeriesMPSemVinculo > 0 && qtdPerda.intValue() > 0) {
                                    XMLUtils.addAttributeElement(paramsElement, "notaPerda", "S");
                                    XMLUtils.addAttributeElement(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO", clientEventRespotaUltimoApontamento);
                                    paramsElement.addContent(this.getMateriasPrimasSemVinculo(idefx, idiproc, nuapo, jdbc, true));
                                    ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.liberaNroSerie", (Element)paramsElement.detach());
                                    throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00220", new ServiceCanceledException());
                                }
                            }
                        }

                        OperacoesEstoqueHelper operacoesEstoqueHelper = new OperacoesEstoqueHelper(jdbc);
                        operacoesEstoqueHelper.executarOperacoesEstoqueAtividade(idiatv, nuapo, MomentoOperacaoEstoque.APONTAMENTO_PA);
                    }
                } catch (ApontamentoInvalidoException e) {
                    dwfEntityFacade.removeEntity("CabecalhoApontamento", new Object[]{nuapo});
                    XMLUtils.addContentElement(ctx.getBodyElement(), "RESPOSTA_ULTIMO_APONTAMENTO", isUltimoApontamento);
                    XMLUtils.addContentElement(ctx.getBodyElement(), "MSGQTDMAIOR", e.getMessage());
                } catch (ApontamentoPendentesException var55) {
                    if (nuapo != null) {
                        dwfEntityFacade.removeEntity("CabecalhoApontamento", new Object[]{nuapo});
                    }
                }

                if (new Boolean(clientEventRespotaUltimoApontamento) && atvGeraNotaProducao) {
                    apontamentoHelper.finalizarProducaoProdutoAcabadosApontamento(idiproc, nuapo);
                }

                StringBuffer strProdutosPendentes = new StringBuffer();

                for(ProdutoControle produtoControle : listaProdutosControlePendentesApontamento) {
                    if (strProdutosPendentes.length() > 0) {
                        strProdutosPendentes.append(", ");
                    }

                    strProdutosPendentes.append(produtoControle.getCodProd());
                    if (!" ".equals(produtoControle.getControle())) {
                        strProdutosPendentes.append(" - ");
                        strProdutosPendentes.append(produtoControle.getControle());
                    }
                }

                XMLUtils.addContentElement(ctx.getBodyElement(), "IDEIATV", execucaoInstanciaAtividadeVO.asBigDecimal("IDEIATV"));
                XMLUtils.addContentElement(ctx.getBodyElement(), "PERMITEPARCIAL", instanciaAtividadeVO.asBoolean("Atividade.PERMITEPARCIAL"));
                XMLUtils.addContentElement(ctx.getBodyElement(), "NUAPO", nuapo);
                XMLUtils.addContentElement(ctx.getBodyElement(), "LISTAPENDENTES", strProdutosPendentes.toString());
                if (previousAuthInfo != null) {
                    previousAuthInfo.makeCurrent();
                }

                if ((Boolean)MGECoreParameter.getParameter("mgecom.apontamentoProducao.utiliza.balanca")) {
                    Element produtosAcabados = XMLUtils.getChild(paramsElement, "produtos_acabados");
                    if (produtosAcabados != null) {
                        Element paElement = XMLUtils.getChild(produtosAcabados, "pa");
                        if (paElement != null) {
                            BigDecimal codProdPa = XMLUtils.getAttributeAsBigDecimal(paElement, "codprod");
                            JapeWrapper prodPesoDAO = JapeFactory.dao("ApontPesoProducao");
                            Collection<DynamicVO> dvPesagens = prodPesoDAO.find("OPNRO = ? and CODPROD  = ?", new Object[]{idiatv, codProdPa});
                            if (!dvPesagens.isEmpty()) {
                                prodPesoDAO.deleteByCriteria("OPNRO = ? and CODPROD  = ?", new Object[]{idiatv, codProdPa});
                            }
                        }

                        Element subProdutosAcabados = XMLUtils.getChild(paElement, "subprodutos");
                        if (subProdutosAcabados != null) {
                            Element spElement = XMLUtils.getChild(subProdutosAcabados, "sp");
                            if (spElement != null) {
                                BigDecimal codProdSP = XMLUtils.getAttributeAsBigDecimal(spElement, "codprod");
                                JapeWrapper spProdPesoDAO = JapeFactory.dao("ArmazenaPesoSubProduto");
                                Collection<DynamicVO> dvPesagensSP = spProdPesoDAO.find("OPNRO = ? and CODPRODSP  = ?", new Object[]{idiatv, codProdSP});
                                if (!dvPesagensSP.isEmpty()) {
                                    spProdPesoDAO.deleteByCriteria("OPNRO = ? and CODPRODSP  = ?", new Object[]{idiatv, codProdSP});
                                }
                            }
                        }

                        Element materiasPrimasPA = XMLUtils.getChild(paElement, "materias_primas");
                        if (materiasPrimasPA != null) {
                            Element mpElement = XMLUtils.getChild(materiasPrimasPA, "mp");
                            if (mpElement != null) {
                                JapeWrapper mpProdPesoDAO = JapeFactory.dao("ApontPesoMateriaPrima");
                                mpProdPesoDAO.deleteByCriteria("OPNRO = ?", new Object[]{idiatv});
                            }

                            return;
                        }
                    }

                    return;
                }
            } catch (Exception e) {
                SPBeanUtils.throwExceptionRollingBack(e, this.context);
            }

        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }
    }

    private void validarDataApontamento(DynamicVO vo, JdbcWrapper jdbc) throws Exception {
        if (vo.getProperty("DHAPO") == null) {
            NativeSql sqlBuscaInformacoesAtividade = new NativeSql(jdbc);
            ResultSet rset = null;

            try {
                sqlBuscaInformacoesAtividade.appendSql(" SELECT ");
                sqlBuscaInformacoesAtividade.appendSql(" \tATV.DATAHORAAPONTAMENTO, ");
                sqlBuscaInformacoesAtividade.appendSql(" \tAPO.DHAPO, ");
                sqlBuscaInformacoesAtividade.appendSql(" \tEFX.DESCRICAO ");
                sqlBuscaInformacoesAtividade.appendSql(" FROM TPRIATV IATV ");
                sqlBuscaInformacoesAtividade.appendSql(" INNER JOIN TPREFX EFX ON (IATV.IDEFX = EFX.IDEFX) ");
                sqlBuscaInformacoesAtividade.appendSql(" INNER JOIN TPRATV ATV ON (ATV.IDEFX = EFX.IDEFX) ");
                sqlBuscaInformacoesAtividade.appendSql(" LEFT JOIN TPRAPO APO ON(IATV.IDIATV = APO.IDIATV) ");
                sqlBuscaInformacoesAtividade.appendSql(" LEFT JOIN TPRAPA APA ON(APA.NUAPO = APO.NUAPO) ");
                sqlBuscaInformacoesAtividade.appendSql(" WHERE ");
                sqlBuscaInformacoesAtividade.appendSql(" APO.NUAPO = :NUAPO ");
                sqlBuscaInformacoesAtividade.appendSql(" AND EFX.TIPO NOT IN (1111) ");
                sqlBuscaInformacoesAtividade.setNamedParameter("NUAPO", vo.getProperty("NUAPO"));
                rset = sqlBuscaInformacoesAtividade.executeQuery();
                if (rset.next() && "S".equals(rset.getString("DATAHORAAPONTAMENTO"))) {
                    throw new Exception("A atividade " + rset.getString("DESCRICAO") + " está configurada com \"Data/Hora de apontamento\" como \"Manual Com Edição\". Essa configuração só é suportada na tela \"Operações de Produção\".");
                }
            } finally {
                NativeSql.releaseResources(sqlBuscaInformacoesAtividade);
                JdbcUtils.closeResultSet(rset);
            }

        }
    }

    public void verificaBalanca(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal codProd = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            JapeWrapper produto = JapeFactory.dao("Produto");
            DynamicVO dvProd = produto.findByPK(new Object[]{codProd});
            Element response = new Element("balanca");
            if ("S".equals(dvProd.asString("BALANCA"))) {
                XMLUtils.setAttibuteValue(response, "usaBalanca", "S");
            } else {
                XMLUtils.setAttibuteValue(response, "usaBalanca", "N");
            }

            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public void getCasasDecimais(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal codProd = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            JapeWrapper produto = JapeFactory.dao("Produto");
            DynamicVO dvProd = produto.findByPK(new Object[]{codProd});
            Element response = new Element("produto");
            if (dvProd.asInt("DECQTD") > 2) {
                XMLUtils.setAttibuteValue(response, "DECQTD", dvProd.asInt("DECQTD"));
            } else {
                XMLUtils.setAttibuteValue(response, "DECQTD", 2);
            }

            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public void podeEditarPesagem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal codUsuLogado = XMLUtils.getAttributeAsBigDecimal(paramsElement, "CODUSU");
            if (codUsuLogado == null) {
                codUsuLogado = AuthenticationInfo.getCurrent().getUserID();
            }

            DynamicVO usuarioVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Usuario", new Object[]{codUsuLogado});
            Element response = new Element("editaPesagem");
            if (usuarioVO.asString("CONTACESSO").contains("P")) {
                XMLUtils.setAttibuteValue(response, "podeEditar", "S");
            } else {
                XMLUtils.setAttibuteValue(response, "podeEditar", "N");
            }

            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private void validarExecucao(Element paramsElement) throws Exception {
        Element execucaoElement = XMLUtils.getRequiredChild(paramsElement, "execucao");
        BigDecimal executante = XMLUtils.getAttributeAsBigDecimal(execucaoElement, "executante");
        BigDecimal ideiatv = XMLUtils.getAttributeAsBigDecimal(execucaoElement, "ideiatv");
        BigDecimal idIAtv = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "idiatv");
        Timestamp dhInicio = XMLUtils.getAttributeAsTimestamp(execucaoElement, "dhinicio");
        Timestamp dtReferenciaAtual = XMLUtils.getAttributeAsTimestamp(execucaoElement, "dtReferenciaAtual");
        BigDecimal codWcp = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codwcp");
        BigDecimal oldCodWcp = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codwcpold");
        DynamicVO execucao = this.getExecucaoInstanciaAtividadeAtiva(idIAtv, executante);
        if (execucao != null) {
            if (ideiatv == null) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00224", new Exception("Execução de instância de atividade inválida. IDEIATV Recebido: null, esperado: " + execucao.asBigDecimal("IDEIATV")));
            }

            if (execucao.asBigDecimal("IDEIATV").compareTo(ideiatv) != 0) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00223", new Exception("Execução de instância de atividade inválida. IDEIATV Recebido: " + ideiatv + ", esperado: " + execucao.asBigDecimal("IDEIATV")));
            }
        } else {
            if (dhInicio == null) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00222", new Exception("É necessário informar \"Dh. Início\" para a criação de uma nova execução."));
            }

            if (dhInicio.getTime() > dtReferenciaAtual.getTime()) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00221", new Exception("Não é possível informar uma data futura para o início da execução."));
            }
        }

        if (codWcp != null && codWcp.compareTo(oldCodWcp) != 0) {
            DynamicVO execucaoOutroUsuario = this.getExecucaoAtivaOutroUsuario(idIAtv, executante);
            if (execucaoOutroUsuario != null) {
                DynamicVO workCenterVO = (DynamicVO)EntityFacadeFactory.getDWFFacade().findEntityByPrimaryKeyAsVO("WorkCenter", new Object[]{oldCodWcp});
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00226", new Exception("Não é possível alterar Centro de Trabalho, pois existem execuções de outros usuários em abertas nesta atividade para o Centro de Trabalho: " + oldCodWcp + " - " + workCenterVO.asString("NOME") + "."));
            }
        }

    }

    private ApontamentoTotem buildApontamentoTotemFromXML(Element paramsElement) throws Exception {
        ApontamentoTotem apontamentoTotem = new ApontamentoTotem();
        BigDecimal idiatv = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "idiatv");
        String observacao = XMLUtils.getAttributeAsString(paramsElement, "observacao");
        apontamentoTotem.setIdiatv(idiatv);
        apontamentoTotem.setObservacao(observacao);
        Element produtosAcabadosElement = XMLUtils.getRequiredChild(paramsElement, "produtos_acabados");
        List<Element> produtosAcabados = produtosAcabadosElement.getChildren("pa");
        HashMap<String, Pair<String, String>> mapCamposAdicionais = new HashMap();

        for(Element elementProudtoAcabado : produtosAcabados) {
            for(Element elemAdicional : elementProudtoAcabado.getChildren("ADICIONAL")) {
                String nomeCampo = XMLUtils.getAttributeAsString(elemAdicional, "nome");
                String tipoCampo = XMLUtils.getAttributeAsString(elemAdicional, "tipo");
                String valorCampo = XMLUtils.getAttributeAsString(elemAdicional, "valor");
                mapCamposAdicionais.put(nomeCampo, new Pair(tipoCampo, valorCampo));
            }

            BigDecimal quantidadePA = XMLUtils.getRequiredAttributeAsBigDecimal(elementProudtoAcabado, "qtd");
            BigDecimal quantidadePerda = XMLUtils.getRequiredAttributeAsBigDecimal(elementProudtoAcabado, "qtdPerda");
            BigDecimal codprodPA = XMLUtils.getRequiredAttributeAsBigDecimal(elementProudtoAcabado, "codprod");
            String controlePA = XMLUtils.getAttributeAsString(elementProudtoAcabado, "controle");
            BigDecimal motivoPerda = XMLUtils.getAttributeAsBigDecimal(elementProudtoAcabado, "motivoPerda");
            BigDecimal quantidadeMotivosPerda = XMLUtils.getAttributeAsBigDecimal(elementProudtoAcabado, "qtdMotivosPerda");
            ProdutoControle produtoPA = new ProdutoControle(codprodPA, controlePA);
            apontamentoTotem.addProdutoAcabado(produtoPA, quantidadePA, quantidadePerda, motivoPerda, quantidadeMotivosPerda, mapCamposAdicionais);
            Element materiasPrimasElement = XMLUtils.getChild(elementProudtoAcabado, "materias_primas");
            if (materiasPrimasElement != null) {
                for(Element element : materiasPrimasElement.getChildren("mp")) {
                    BigDecimal quantidadeMP = XMLUtils.getRequiredAttributeAsBigDecimal(element, "qtd");
                    BigDecimal codprodMP = XMLUtils.getRequiredAttributeAsBigDecimal(element, "codprod");
                    String controleMP = XMLUtils.getAttributeAsString(element, "controle");
                    BigDecimal codLocalBaixa = XMLUtils.getAttributeAsBigDecimal(element, "codLocalBaixa");
                    ProdutoControle produtoMP = new ProdutoControle(codprodMP, controleMP);
                    apontamentoTotem.addMateriaPrima(produtoPA, produtoMP, quantidadeMP);
                    apontamentoTotem.addLocalBaixaMp(produtoPA, produtoMP, codLocalBaixa != null ? codLocalBaixa : BigDecimal.ZERO);
                    Element detalhesPerdaMaterialElement = XMLUtils.getChild(element, "detalhes_perda_material");
                    BigDecimal quantidadeMPe = XMLUtils.getAttributeAsBigDecimal(element, "qtdMotivosPerda");
                    BigDecimal qtdTotalPerda = XMLUtils.getAttributeAsBigDecimal(element, "qtdTotalPerda");
                    BigDecimal codMpe = XMLUtils.getAttributeAsBigDecimal(element, "codMpe");
                    apontamentoTotem.addQtdMotivosPerda(produtoPA, produtoMP, quantidadeMPe);
                    apontamentoTotem.addQtdTotalPerda(produtoPA, produtoMP, qtdTotalPerda);
                    apontamentoTotem.addCodMpe(produtoPA, produtoMP, codMpe);
                    if (detalhesPerdaMaterialElement != null) {
                        for(Element elementDetalheMaterial : detalhesPerdaMaterialElement.getChildren("det")) {
                            BigDecimal quantidadePerdaDet = XMLUtils.getRequiredAttributeAsBigDecimal(elementDetalheMaterial, "qtd");
                            BigDecimal motivoPerdaDet = XMLUtils.getRequiredAttributeAsBigDecimal(elementDetalheMaterial, "codmpe");
                            apontamentoTotem.addDetalhePerdaMaterial(produtoPA, produtoMP, motivoPerdaDet, quantidadePerdaDet);
                        }
                    }
                }
            }

            Element detalhesPerdaElement = XMLUtils.getChild(elementProudtoAcabado, "detalhes_perda");
            if (detalhesPerdaElement != null) {
                for(Element element : detalhesPerdaElement.getChildren("det")) {
                    BigDecimal quantidadePerdaDet = XMLUtils.getRequiredAttributeAsBigDecimal(element, "qtd");
                    BigDecimal motivoPerdaDet = XMLUtils.getRequiredAttributeAsBigDecimal(element, "codmpe");
                    apontamentoTotem.addDetalhePerda(produtoPA, motivoPerdaDet, quantidadePerdaDet);
                }
            }

            Element subprodutosElement = XMLUtils.getChild(elementProudtoAcabado, "subprodutos");
            if (subprodutosElement != null) {
                for(Element element : subprodutosElement.getChildren("sp")) {
                    BigDecimal quantidadeSP = XMLUtils.getRequiredAttributeAsBigDecimal(element, "qtd");
                    BigDecimal codprodSP = XMLUtils.getRequiredAttributeAsBigDecimal(element, "codprod");
                    String controleSP = XMLUtils.getAttributeAsString(element, "controle");
                    ProdutoControle produtoSP = new ProdutoControle(codprodSP, controleSP);
                    apontamentoTotem.addSubProduto(produtoPA, produtoSP, quantidadeSP);
                }
            }

            Element recursosWCElement = XMLUtils.getChild(elementProudtoAcabado, "recursos");
            if (recursosWCElement != null) {
                for(Element element : recursosWCElement.getChildren("rec")) {
                    if (XMLUtils.getAttributeAsBigDecimalOrZero(element, "qtdapontada").compareTo(BigDecimal.ZERO) == 0) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00228", new Exception("Não é possível confirmar o apontamento pois existem itens (Recursos CT) com quantidade apontada igual ou menor que zero."));
                    }

                    if (XMLUtils.getAttributeAsBigDecimalOrZero(element, "qtdutilizada").compareTo(BigDecimal.ZERO) == 0) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00227", new Exception("Não é possível confirmar o apontamento pois não foi apontando os itens (Recursos CT)."));
                    }

                    BigDecimal quantidadeApontada = XMLUtils.getRequiredAttributeAsBigDecimal(element, "qtdapontada");
                    BigDecimal quantidadeUtilizada = XMLUtils.getRequiredAttributeAsBigDecimal(element, "qtdutilizada");
                    BigDecimal codWcp = XMLUtils.getRequiredAttributeAsBigDecimal(element, "codwcp");
                    BigDecimal codCre = XMLUtils.getRequiredAttributeAsBigDecimal(element, "codcre");
                    Collection<Map<String, BigDecimal>> itensRecursos = this.getItensRecursos(element);
                    RecursoControle recursoWC = new RecursoControle(codWcp, codCre, quantidadeApontada, itensRecursos);
                    apontamentoTotem.addRecursoWC(produtoPA, recursoWC, quantidadeUtilizada);
                }
            }
        }

        return apontamentoTotem;
    }

    private void validarApontamento(ApontamentoTotem apontamentoTotem) throws Exception {
        Collection<ProdutoAcabadoApontamentoTotem> produtosAcabados = apontamentoTotem.getProdutosAcabados();
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        BigDecimal idiatv = apontamentoTotem.getIdiatv();
        DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idiatv});
        if (instanciaAtividadeVO.asBoolean("Atividade.APONTAPA") && produtosAcabados.size() == 0) {
            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00229", new Exception("É necessário informar pelo menos um produto acabado no apontamento."));
        } else {
            for(ProdutoAcabadoApontamentoTotem produtoAcabadoApontamento : produtosAcabados) {
                if (produtoAcabadoApontamento.getQuantidadePA().compareTo(BigDecimal.ZERO) == 0) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00230", new Exception("Existe um ou mais itens apontados com quantidade igual a zero."));
                }

                HashMap<ProdutoControle, BigDecimal> materiasPrimas = produtoAcabadoApontamento.getMateriasPrimas();

                for(Map.Entry<ProdutoControle, BigDecimal> apontamentoMateriaPrima : materiasPrimas.entrySet()) {
                    if (((BigDecimal)apontamentoMateriaPrima.getValue()).compareTo(BigDecimal.ZERO) == 0) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00231", new Exception("Existe uma ou mais matérias primas apontadas com quantidade igual a zero."));
                    }
                }

                HashMap<ProdutoControle, BigDecimal> subprodutos = produtoAcabadoApontamento.getSubprodutos();

                for(Map.Entry<ProdutoControle, BigDecimal> apontamentoSubproduto : subprodutos.entrySet()) {
                    if (((BigDecimal)apontamentoSubproduto.getValue()).compareTo(BigDecimal.ZERO) == 0) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00231", new Exception("Existe uma ou mais matérias primas apontadas com quantidade igual a zero."));
                    }
                }
            }

        }
    }

    public void criarApontamento(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idIAtv = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "IDIATV");
            BigDecimal codProd = XMLUtils.getAttributeAsBigDecimal(paramsElement, "CODPROD");
            String controle = ComercialUtils.trimControleEstoque(XMLUtils.getAttributeAsString(paramsElement, "CONTROLE"));
            BigDecimal quantidade = XMLUtils.getAttributeAsBigDecimal(paramsElement, "QTDPRODUZIR");
            BigDecimal qtdPerda = XMLUtils.getAttributeAsBigDecimal(paramsElement, "QTDPERDA");
            BigDecimal codmpe = XMLUtils.getAttributeAsBigDecimal(paramsElement, "CODMPE");
            BigDecimal codUsu = ((AuthenticationInfo)ctx.getAutentication()).getUserID();
            ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
            Element retornoCriacaoApontamento = null;
            if (codProd == null) {
                retornoCriacaoApontamento = apontamentoHelper.criarApontamentosAtividade(codUsu, idIAtv);
            } else {
                DynamicVO iatvVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idIAtv});
                if ("P".equals(iatvVO.asString("SITUACAO"))) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00232", new Exception("Atividade parada não pode ser apontada!"));
                }

                retornoCriacaoApontamento = apontamentoHelper.criarApontamentosAtividadePorProduto(codUsu, idIAtv, codProd, controle, quantidade, qtdPerda, codmpe);
            }

            ctx.getBodyElement().addContent(retornoCriacaoApontamento);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getProdutosInclusaoApontamentoTotem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiatv = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "idiatv");
            ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
            ArrayList<ProdutoControle> produtosAcabadosAtividade = apontamentoHelper.getProdutosAcabadosAtividade(idiatv);
            Element produtosElement = new Element("produtos");

            for(ProdutoControle produtoAcabadoAtv : produtosAcabadosAtividade) {
                DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idiatv});
                DynamicVO atividadeVO = instanciaAtividadeVO.asDymamicVO("Atividade");
                DynamicVO instanciaProcessoVO = instanciaAtividadeVO.asDymamicVO("CabecalhoInstanciaProcesso");
                BigDecimal codprod = produtoAcabadoAtv.getCodProd();
                DynamicVO produtoVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{codprod});
                DynamicVO produtoAcabadoAProduzirVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabadoAProduzir", new Object[]{instanciaProcessoVO.asBigDecimal("IDIPROC"), produtoAcabadoAtv.getCodProd(), produtoAcabadoAtv.getControle()});
                BigDecimal qtdNovoApontamento = apontamentoHelper.calculaQtdNovoApontamento(instanciaProcessoVO.asBigDecimal("IDIPROC"), atividadeVO.asBigDecimal("IDRPAOPER"), atividadeVO.asBigDecimal("IDEFX"), produtoAcabadoAProduzirVO.asBigDecimal("QTDPRODUZIR"), produtoAcabadoAtv.getCodProd(), produtoAcabadoAtv.getControle());
                Element produtoElement = new Element("produto");
                produtoElement.setAttribute("codprod", produtoAcabadoAtv.getCodProd().toString());
                produtoElement.setAttribute("controle", produtoAcabadoAtv.getControle());
                produtoElement.setAttribute("titContEst", StringUtils.getNullAsEmpty(produtoVO.asString("TITCONTEST")));
                produtoElement.setAttribute("tipContEst", StringUtils.getNullAsEmpty(produtoVO.asString("TIPCONTEST")));
                produtoElement.setAttribute("descricao", produtoVO.asString("DESCRPROD"));
                produtoElement.setAttribute("quantidade", qtdNovoApontamento.toString());
                produtoElement.setAttribute("referencia", StringUtils.getNullAsEmpty(produtoVO.asString("REFERENCIA")));
                produtoElement.setAttribute("qtdPerda", "0".toString());
                produtoElement.setAttribute("DECQTD", StringUtils.isEmpty(produtoVO.asBigDecimal("DECQTD")) ? "2" : produtoVO.asBigDecimal("DECQTD").toString());
                produtoElement.setAttribute("BALANCA", produtoVO.asString("BALANCA"));
                produtosElement.addContent(produtoElement);
                if ("E".equals(produtoVO.asString("TIPCONTEST"))) {
                    dwfEntityFacade.removeByCriteria(new FinderWrapper("SerieMateriaPrimaTemporario", "this.IDIPROC = ?", new Object[]{instanciaProcessoVO.asBigDecimal("IDIPROC")}));
                }
            }

            ctx.getBodyElement().addContent(produtosElement);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getSubprodutosDePA(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal codprod = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "codprod");
            String controle = XMLUtils.getAttributeAsString(paramsElement, "controle");
            BigDecimal qtd = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "quantidade");
            BigDecimal idiatv = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "idiatv");
            DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idiatv});
            DynamicVO atividadeVO = instanciaAtividadeVO.asDymamicVO("Atividade");
            DynamicVO instanciaProcessoVO = instanciaAtividadeVO.asDymamicVO("CabecalhoInstanciaProcesso");
            DynamicVO processoVO = instanciaProcessoVO.asDymamicVO("ProcessoProdutivo");
            String tipoApontamentoSubproduto = atividadeVO.asString("APONTASP");
            Collection<String> tiposUsoMP = new ArrayList();
            tiposUsoMP.add("N");
            if ("S".equals(processoVO.asString("PROCDESMONTE"))) {
                tiposUsoMP.add("R");
            }

            ProdutoControle produto = new ProdutoControle(codprod, controle);
            Collection<OperacoesEstoqueAtividade.SubprodutoBean> subprodutos = OperacoesEstoqueAtividade.getSubprodutosPA(produto, qtd, processoVO.asBigDecimal("IDPROC"), instanciaAtividadeVO.asBigDecimal("IDEFX"), tipoApontamentoSubproduto, jdbc, instanciaAtividadeVO.asBigDecimal("IDIPROC"));
            Element produtosElement = new Element("subprodutos");

            for(OperacoesEstoqueAtividade.SubprodutoBean spBean : subprodutos) {
                Element produtoElement = new Element("sp");
                DynamicVO produtoVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{spBean.produto.getCodProd()});
                DynamicVO volumeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Volume", new Object[]{spBean.codvol});
                produtoElement.setAttribute("codprod", spBean.produto.getCodProd().toString());
                produtoElement.setAttribute("descricao", produtoVO.asString("DESCRPROD"));
                produtoElement.setAttribute("controle", spBean.produto.getControle() == null ? " " : spBean.produto.getControle());
                produtoElement.setAttribute("codvol", spBean.codvol);
                produtoElement.setAttribute("qtd", spBean.qtdmistura.toString());
                produtoElement.setAttribute("qtdmistura", spBean.qtdmistura.toString());
                produtoElement.setAttribute("descrvol", volumeVO.asString("DESCRVOL"));
                produtosElement.addContent(produtoElement);
            }

            ctx.getBodyElement().addContent(produtosElement);
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getMateriasPrimasESubProdutosDePA(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal codprod = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "codprod");
            String controle = XMLUtils.getAttributeAsString(paramsElement, "controle");
            BigDecimal qtd = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "quantidade");
            BigDecimal qtdPerda = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "qtdPerda");
            BigDecimal idiatv = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "idiatv");
            BigDecimal seqApa = XMLUtils.getAttributeAsBigDecimal(paramsElement, "seqApa");
            boolean editando = "true".equalsIgnoreCase(XMLUtils.getRequiredAttributeAsString(paramsElement, "editando"));
            BigDecimal codUsu = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codusu");
            JapeSession.putProperty("br.com.sankhya.mgeprod.apontamento.user", codUsu);
            DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idiatv});
            DynamicVO atividadeVO = instanciaAtividadeVO.asDymamicVO("Atividade");
            DynamicVO instanciaProcessoVO = instanciaAtividadeVO.asDymamicVO("CabecalhoInstanciaProcesso");
            DynamicVO processoVO = instanciaProcessoVO.asDymamicVO("ProcessoProdutivo");
            String tipoApontamentoMateriaPrima = atividadeVO.asString("APONTAMP");
            Collection<String> tiposUsoMP = new ArrayList();
            tiposUsoMP.add("N");
            if ("S".equals(processoVO.asString("PROCDESMONTE"))) {
                tiposUsoMP.add("R");
            }

            ProdutoControle produto = new ProdutoControle(codprod, controle);
            BigDecimal qtdComPerda = qtd.add(qtdPerda);
            Element materiasPrimasElement = this.getMateriasPrimasParaPA(jdbc, produto, qtdComPerda, instanciaAtividadeVO, processoVO, tipoApontamentoMateriaPrima, tiposUsoMP, editando, idiatv, seqApa);
            Element subProdutosElement = this.getSubprodutosParaPA(jdbc, produto, qtdComPerda, instanciaAtividadeVO, atividadeVO, processoVO);
            Element recursosElement = this.getRecursosParaPA(jdbc, produto, qtdComPerda, instanciaAtividadeVO, atividadeVO, processoVO);
            ctx.getBodyElement().addContent(subProdutosElement);
            ctx.getBodyElement().addContent(materiasPrimasElement);
            ctx.getBodyElement().addContent(recursosElement);
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private Element getMateriasPrimasParaPA(JdbcWrapper jdbc, ProdutoControle produto, BigDecimal qtd, DynamicVO instanciaAtividadeVO, DynamicVO processoVO, String tipoApontamentoMateriaPrima, Collection<String> tiposUsoMP, boolean editando, BigDecimal idIatv, BigDecimal seqApa) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        Element materiasPrimasElement = new Element("materiasprimas");
        BigDecimal idiproc = instanciaAtividadeVO.asBigDecimal("IDIPROC");
        ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
        Collection<OperacoesEstoqueAtividade.MPBean> mps = OperacoesEstoqueAtividade.getMateriasPrimasPAParaApontamento(produto, qtd, processoVO.asBigDecimal("IDPROC"), instanciaAtividadeVO.asBigDecimal("IDEFX"), tipoApontamentoMateriaPrima, tiposUsoMP, jdbc);
        ArrayList<OperacoesEstoqueAtividade.MPBean> materiaisMP = OperacoesEstoqueAtividade.vinculaMateriaPrimaAlternativa(mps, produto, (String)null, idiproc, jdbc);
        LinkedHashMap<OperacoesEstoqueAtividade.MPBean, OperacoesEstoqueAtividade.MPBean> materiasPrimas = new LinkedHashMap();

        for(OperacoesEstoqueAtividade.MPBean mpBean : materiaisMP) {
            if (materiasPrimas.containsKey(mpBean)) {
                OperacoesEstoqueAtividade.MPBean mp = (OperacoesEstoqueAtividade.MPBean)materiasPrimas.get(mpBean);
                mp.qtdmistura = mp.qtdmistura.add(mpBean.qtdmistura);
            } else {
                materiasPrimas.put(mpBean, mpBean);
            }
        }

        boolean quantidadeMPSuprida = true;

        for(OperacoesEstoqueAtividade.MPBean mpBean : materiasPrimas.values()) {
            DynamicVO produtoVO = null;

            try {
                produtoVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{mpBean.produto.getCodProd()});
            } catch (FinderException var38) {
                continue;
            }

            if ("F".equals(mpBean.tipoQtd) && "S".equals(mpBean.propmpfixa)) {
                BigDecimal qtdAProduzirPA = apontamentoHelper.getQtdAProduzirProdutoAcabadoPorOP(idiproc, produto);
                ApontamentoHelper.NecessidadeApontamentoPA necessidadeApontamentoPA = new ApontamentoHelper.NecessidadeApontamentoPA(idiproc, instanciaAtividadeVO.asBigDecimal("IDEFX"), qtd, qtdAProduzirPA);
                apontamentoHelper.proporcionarQtdMisturaMateriaPrimaTipoQtdFixa(mpBean, necessidadeApontamentoPA);
            }

            HashMap<String, BigDecimal> quantidadesPorLote = new HashMap();
            if ("L".equals(produtoVO.asString("TIPCONTEST"))) {
                quantidadesPorLote = apontamentoHelper.getQuantidadesMPPorLoteDisponiveis(idiproc, mpBean.produto.getCodProd());
            }

            boolean converterParaUNPAD = true;
            if (quantidadesPorLote.size() == 0) {
                quantidadesPorLote.put(mpBean.produto.getControle(), mpBean.qtdmistura);
                converterParaUNPAD = false;
            }

            BigDecimal quantidadeSuprida = BigDecimal.ZERO;
            BigDecimal qtdApontamentosMPCriados = BigDecimal.ZERO;

            for(Map.Entry<String, BigDecimal> entry : quantidadesPorLote.entrySet()) {
                String lote = (String)entry.getKey();
                BigDecimal quantidadeIteracao = (BigDecimal)entry.getValue();
                if (converterParaUNPAD && !produtoVO.asString("CODVOL").equals(mpBean.codvol)) {
                    quantidadeIteracao = UnidadeProdutoUtils.converteQuantidadePorUnidadeVolume(produtoVO, quantidadeIteracao, mpBean.produto.getControle(), produtoVO.asString("CODVOL"), mpBean.codvol);
                }

                BigDecimal quantidadePendente = mpBean.qtdmistura.subtract(quantidadeSuprida);
                if (quantidadeIteracao.compareTo(quantidadePendente) > 0) {
                    quantidadeIteracao = quantidadePendente;
                }

                if (StringUtils.isEmpty(lote)) {
                    lote = apontamentoHelper.getLoteSubOrdemPI(mpBean, produto, idiproc);
                }

                Element mpElement = new Element("mp");
                DynamicVO volumeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Volume", new Object[]{mpBean.codvol});
                String referencia = " ";
                if (produtoVO.asString("REFERENCIA") != null) {
                    referencia = produtoVO.asString("REFERENCIA");
                }

                mpElement.setAttribute("codprodmp", mpBean.produto.getCodProd().toString());
                mpElement.setAttribute("descricao", produtoVO.asString("DESCRPROD"));
                mpElement.setAttribute("referencia", referencia);
                mpElement.setAttribute("controlemp", ComercialUtils.trimControleEstoque(lote));
                mpElement.setAttribute("codvol", mpBean.codvol);
                mpElement.setAttribute("qtd", quantidadeIteracao.toString());
                mpElement.setAttribute("tipouso", mpBean.tipoUso);
                mpElement.setAttribute("descrvol", volumeVO.asString("DESCRVOL"));
                mpElement.setAttribute("fixaQtdApontadaMP", mpBean.fixarQtdApontada ? "S" : "N");
                mpElement.setAttribute("DECQTD", StringUtils.isEmpty(produtoVO.asBigDecimal("DECQTD")) ? "2" : produtoVO.asBigDecimal("DECQTD").toString());
                mpElement.setAttribute("tipContest", produtoVO.asString("TIPCONTEST"));
                mpElement.setAttribute("balanca", produtoVO.asString("BALANCA"));
                mpElement.setAttribute("vinculoSeriePA", mpBean.vinculoSeriePA == null ? "N" : mpBean.vinculoSeriePA);
                DynamicVO cabecalhoApontamentoVO = apontamentoHelper.getApontamentoMPPendenteAtividade(idIatv);
                BigDecimal nuApo = cabecalhoApontamentoVO != null ? cabecalhoApontamentoVO.asBigDecimal("NUAPO") : null;
                if (nuApo != null && seqApa != null) {
                    JapeWrapper apontamentoMpDAO = JapeFactory.dao("ApontamentoMateriais");
                    DynamicVO ampVO = apontamentoMpDAO.findOne("this.NUAPO = ? AND this.SEQAPA = ? AND this.CODPRODMP = ? AND this.CONTROLEMP = ?", new Object[]{nuApo, seqApa, mpBean.produto.getCodProd(), mpBean.produto.getControle()});
                    mpElement.setAttribute("qtdMotivosPerda", ampVO != null ? ampVO.asBigDecimalOrZero("QTDMPE").toString() : "0");
                    mpElement.addContent(apontamentoHelper.getElementDetalhesPerdatoMP(nuApo, seqApa, mpBean.produto.getCodProd(), mpBean.produto.getControle()));
                }

                LocalBaixaMPHelper baixaMPHelper = new LocalBaixaMPHelper(dwfEntityFacade, mpBean.produto.getCodProd(), ComercialUtils.trimControleEstoque(lote));
                mpElement.setAttribute("codLocalBaixa", baixaMPHelper.getLocalBaixaMPTotten(produto.getCodProd(), produto.getControle(), idIatv).toString());
                materiasPrimasElement.addContent(mpElement);
                qtdApontamentosMPCriados = qtdApontamentosMPCriados.add(quantidadeIteracao);
                quantidadeSuprida = quantidadeSuprida.add(quantidadeIteracao);
                if (quantidadeSuprida.compareTo(mpBean.qtdmistura) >= 0) {
                    break;
                }
            }

            if (quantidadeMPSuprida && qtdApontamentosMPCriados.longValue() > 0L && mpBean.qtdmistura.compareTo(qtdApontamentosMPCriados) > 0) {
                quantidadeMPSuprida = false;
            }
        }

        if (editando && !quantidadeMPSuprida) {
            ServiceContext.getCurrent().addClientEvent("br.com.sankhya.apontamentomp.naoreproporcionalizado", (Element)null);
        }

        return materiasPrimasElement;
    }

    private Element getSubprodutosParaPA(JdbcWrapper jdbc, ProdutoControle produto, BigDecimal qtd, DynamicVO instanciaAtividadeVO, DynamicVO atividadeVO, DynamicVO processoVO) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        String tipoApontamentoSubproduto = atividadeVO.asString("APONTASP");
        Collection<OperacoesEstoqueAtividade.SubprodutoBean> subprodutos = OperacoesEstoqueAtividade.getSubprodutosPA(produto, qtd, processoVO.asBigDecimal("IDPROC"), instanciaAtividadeVO.asBigDecimal("IDEFX"), tipoApontamentoSubproduto, jdbc, instanciaAtividadeVO.asBigDecimal("IDIPROC"));
        Element subProdutosElement = new Element("subprodutos");

        for(OperacoesEstoqueAtividade.SubprodutoBean spBean : subprodutos) {
            Element subProdutoElement = new Element("sp");
            DynamicVO produtoVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{spBean.produto.getCodProd()});
            DynamicVO volumeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Volume", new Object[]{spBean.codvol});
            subProdutoElement.setAttribute("codprod", spBean.produto.getCodProd().toString());
            subProdutoElement.setAttribute("descricao", produtoVO.asString("DESCRPROD"));
            subProdutoElement.setAttribute("controle", spBean.produto.getControle() == null ? " " : spBean.produto.getControle());
            subProdutoElement.setAttribute("codvol", spBean.codvol);
            subProdutoElement.setAttribute("referencia", StringUtils.getNullAsEmpty(produtoVO.asString("REFERENCIA")));
            subProdutoElement.setAttribute("qtd", spBean.qtdmistura.toString());
            subProdutoElement.setAttribute("qtdmistura", spBean.qtdmistura.toString());
            subProdutoElement.setAttribute("descrvol", volumeVO.asString("DESCRVOL"));
            System.out.println(produtoVO.asBigDecimal("DECQTD").toString());
            subProdutoElement.setAttribute("DECQTD", produtoVO.asBigDecimal("DECQTD").toString());
            subProdutoElement.setAttribute("BALANCA", produtoVO.asString("BALANCA"));
            subProdutosElement.addContent(subProdutoElement);
        }

        return subProdutosElement;
    }

    private Element getRecursosParaPA(JdbcWrapper jdbc, ProdutoControle produto, BigDecimal qtd, DynamicVO instanciaAtividadeVO, DynamicVO atividadeVO, DynamicVO processoVO) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        String tipoApontamentoRecurso = atividadeVO.asString("APONTARECWC");
        Collection<OperacoesEstoqueAtividade.RecursosBean> recursos = OperacoesEstoqueAtividade.getRecursosPA(produto, qtd, processoVO.asBigDecimal("IDPROC"), instanciaAtividadeVO.asBigDecimal("IDEFX"), tipoApontamentoRecurso, instanciaAtividadeVO.asBigDecimalOrZero("CODWCP"), instanciaAtividadeVO.asString("WorkCenter.NOME"), jdbc);
        Element recursosElement = new Element("recursos");

        for(OperacoesEstoqueAtividade.RecursosBean recursoBean : recursos) {
            DynamicVO categoriaVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("CategoriaRecurso", new Object[]{recursoBean.codCre});
            DynamicVO workCenterVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("WorkCenter", new Object[]{recursoBean.codWcp});
            Element recursoElement = new Element("recurso");
            recursoElement.setAttribute("codCre", recursoBean.codCre != null ? recursoBean.codCre.toString() : "");
            recursoElement.setAttribute("qtdUtilizacao", recursoBean.qtdUtilizacao != null ? recursoBean.qtdUtilizacao.toString() : "");
            recursoElement.setAttribute("codWcp", recursoBean.codWcp != null ? recursoBean.codWcp.toString() : "");
            recursoElement.setAttribute("unidade", recursoBean.unidade != null ? recursoBean.unidade : "");
            recursoElement.setAttribute("nomeCre", categoriaVO.asString("NOME") != null ? categoriaVO.asString("NOME") : "");
            recursoElement.setAttribute("nomeWcp", workCenterVO.asString("NOME") != null ? workCenterVO.asString("NOME") : "");
            recursoElement.setAttribute("descrvol", categoriaVO.asDymamicVO("Volume") != null ? categoriaVO.asDymamicVO("Volume").asString("DESCRVOL") : "");
            recursosElement.addContent(recursoElement);
        }

        return recursosElement;
    }

    public void getProdutosInclusaoApontamento(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal nuApo = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "nuapo");
            ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
            ArrayList<ProdutoControle> produtosAusentes = apontamentoHelper.getProdutosAusentesApontamento(nuApo);
            Element produtosElement = new Element("produtos");
            if (produtosAusentes.size() > 0) {
                BigDecimal codprod = ((ProdutoControle)produtosAusentes.get(0)).getCodProd();
                DynamicVO produtoVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{codprod});
                String decrProd = produtoVO.asString("DESCRPROD");
                String tituloControleEstoque = produtoVO.asString("TITCONTEST");
                String tipoControleEstoque = produtoVO.asString("TIPCONTEST");
                XMLUtils.addAttributeElement(produtosElement, "DESCRPROD", decrProd);
                XMLUtils.addAttributeElement(produtosElement, "TITCONTEST", tituloControleEstoque);
                XMLUtils.addAttributeElement(produtosElement, "TIPCONTEST", tipoControleEstoque);

                for(ProdutoControle produtoControle : produtosAusentes) {
                    Element produtoElement = new Element("produto");
                    produtoElement.setAttribute("codprod", produtoControle.getCodProd().toString());
                    produtoElement.setAttribute("controle", produtoControle.getControle());
                    produtosElement.addContent(produtoElement);
                }
            }

            ctx.getBodyElement().addContent(produtosElement);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void incluirPAEmApontamento(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal nuapo = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "nuapo");
            List<Element> produtos = paramsElement.getChildren("produto");
            ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);

            for(Element produtoElement : produtos) {
                String controle = XMLUtils.getAttributeAsString(produtoElement, "controle");
                controle = ComercialUtils.trimControleEstoque(controle);
                BigDecimal codprod = XMLUtils.getRequiredAttributeAsBigDecimal(produtoElement, "codprod");
                apontamentoHelper.incluirProdutoAcabado(nuapo, codprod, controle);
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void incluirPesagem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            JapeWrapper pesagemDAO = JapeFactory.dao(this.getEntityNamePorTipoApontamento(paramsElement));
            BigDecimal OPNRO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "OPNRO");
            BigDecimal CODPROD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            BigDecimal QTDPERDA = XMLUtils.getContentChildAsBigDecimal(paramsElement, "QTDPERDA");
            BigDecimal QTDAPONTADA = XMLUtils.getContentChildAsBigDecimal(paramsElement, "QTDAPONTADA");
            String PERDA = XMLUtils.getContentChildAsString(paramsElement, "PERDA");
            DynamicVO var12 = ((FluidCreateVO)((FluidCreateVO)((FluidCreateVO)((FluidCreateVO)((FluidCreateVO)pesagemDAO.create().set("OPNRO", OPNRO)).set("CODPROD", CODPROD)).set("QTDPERDA", QTDPERDA)).set("QTDAPONTADA", QTDAPONTADA)).set("PERDA", PERDA)).save();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void incluirPesagemSP(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JapeWrapper pesagemDAO = JapeFactory.dao("ArmazenaPesoSubProduto");
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal OPNRO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "OPNRO");
            BigDecimal CODPROD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            BigDecimal QTD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "QTD");
            DynamicVO var10 = ((FluidCreateVO)((FluidCreateVO)((FluidCreateVO)pesagemDAO.create().set("OPNRO", OPNRO)).set("CODPRODSP", CODPROD)).set("QTD", QTD)).save();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void removePesoApontado(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            JapeWrapper pesagemDAO = JapeFactory.dao(this.getEntityNamePorTipoApontamento(paramsElement));
            BigDecimal CODAPPRDOPESO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODAPPRDOPESO");
            pesagemDAO.delete(new Object[]{CODAPPRDOPESO});
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void removePesoApontadoSP(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JapeWrapper pesagemDAO = JapeFactory.dao("ArmazenaPesoSubProduto");
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal id = XMLUtils.getContentChildAsBigDecimal(paramsElement, "ID");
            pesagemDAO.delete(new Object[]{id});
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void removePesosApontados(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            JapeWrapper pesagemDAO = JapeFactory.dao(this.getEntityNamePorTipoApontamento(paramsElement));
            BigDecimal CODPROD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            BigDecimal OPNRO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "OPNRO");
            pesagemDAO.deleteByCriteria("OPNRO = ? and CODPROD  = ?", new Object[]{OPNRO, CODPROD});
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void removePesosApontadosSP(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JapeWrapper pesagemDAO = JapeFactory.dao("ArmazenaPesoSubProduto");
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal CODPROD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            BigDecimal OPNRO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "OPNRO");
            pesagemDAO.deleteByCriteria("OPNRO = ? and CODPRODSP  = ?", new Object[]{OPNRO, CODPROD});
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void alterarPesagem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            JapeWrapper pesagemDAO = JapeFactory.dao(this.getEntityNamePorTipoApontamento(paramsElement));
            BigDecimal CODAPPRDOPESO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODAPPRDOPESO");
            BigDecimal OPNRO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "OPNRO");
            BigDecimal CODPROD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            BigDecimal QTDPERDA = XMLUtils.getContentChildAsBigDecimal(paramsElement, "QTDPERDA");
            BigDecimal QTDAPONTADA = XMLUtils.getContentChildAsBigDecimal(paramsElement, "QTDAPONTADA");
            String PERDA = XMLUtils.getContentChildAsString(paramsElement, "PERDA");
            ((FluidUpdateVO)((FluidUpdateVO)((FluidUpdateVO)((FluidUpdateVO)((FluidUpdateVO)pesagemDAO.prepareToUpdateByPK(new Object[]{CODAPPRDOPESO}).set("OPNRO", OPNRO)).set("CODPROD", CODPROD)).set("QTDPERDA", QTDPERDA)).set("QTDAPONTADA", QTDAPONTADA)).set("PERDA", PERDA)).update();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void alterarPesagemSP(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JapeWrapper pesagemDAO = JapeFactory.dao("ArmazenaPesoSubProduto");
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal ID = XMLUtils.getContentChildAsBigDecimal(paramsElement, "ID");
            BigDecimal OPNRO = XMLUtils.getContentChildAsBigDecimal(paramsElement, "OPNRO");
            BigDecimal CODPROD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "CODPROD");
            BigDecimal QTD = XMLUtils.getContentChildAsBigDecimal(paramsElement, "QTD");
            ((FluidUpdateVO)((FluidUpdateVO)((FluidUpdateVO)pesagemDAO.prepareToUpdateByPK(new Object[]{ID}).set("OPNRO", OPNRO)).set("CODPRODSP", CODPROD)).set("QTD", QTD)).update();
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private ResourceLock.LockHandle getLockConfirmarApontamento(BigDecimal nuApontamento) throws Exception {
        String msgException = I18nServerSideBundle.getString("confirmacaoApontamentoEmAndamento", OperacaoProducaoSPBean.class, new Object[]{nuApontamento.intValue()});
        return this.findLock("mgeprod@OperacaoProducaoSP.confirmarApontamento(%s)", nuApontamento.toString(), msgException);
    }

    public void confirmarApontamento(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;
        ResourceLock.LockHandle lock = null;

        try {
            try {
                hnd = JapeSession.open();
                EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
                jdbc = dwfEntityFacade.getJdbcWrapper();
                jdbc.openSession();
                Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
                BigDecimal nuApontamento = XMLUtils.getRequiredAttributeAsBigDecimal(paramsElement, "NUAPO");
                lock = this.getLockConfirmarApontamento(nuApontamento);
                boolean aceitarQtdMaior = XMLUtils.getAttributeAsBoolean(paramsElement, "ACEITARQTDMAIOR");
                String clientEventRespotaUltimoApontamento = XMLUtils.getAttributeAsString(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO");
                boolean aceitaProporcaoInvalidaMPAlternativa = XMLUtils.getAttributeAsBoolean(paramsElement, "ACEITA_PROPORCAO_INVALIDA_MPALTERNATIVA");
                boolean respostaSerieLiberado = XMLUtils.getAttributeAsBoolean(paramsElement, "RESPOSTA_SERIE_LIBERADO");
                boolean respostaSerieLiberadoPerda = XMLUtils.getAttributeAsBoolean(paramsElement, "RESPOSTA_SERIE_LIBERADO_PERDA");
                boolean respostaSerieLiberadoMP = XMLUtils.getAttributeAsBoolean(paramsElement, "RESPOSTA_SERIE_LIBERADO_MP");
                boolean isConfirmadoUltimoApontamentoMpFixo = XMLUtils.getAttributeAsBoolean(paramsElement, "CONFIRMADO_ULTIMO_APONTAMENTO_MP_FIXO");
                boolean isMostradoPopUpUltimoApontamentoMPFixa = XMLUtils.getAttributeAsBoolean(paramsElement, "POPUP_APONTAMENTO_MP_FIXO_MOSTRADO");
                JapeSession.putProperty("br.com.sankhya.mgeprod.confirmado.ult.apontamento.mp.fixa", isConfirmadoUltimoApontamentoMpFixo);
                JapeSession.putProperty("br.com.sankhya.mgeprod.popup.apresentado.ult.apontamento.mp.fixa", isMostradoPopUpUltimoApontamentoMPFixa);
                DynamicVO cabecalhoApontamentoVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("CabecalhoApontamento", new Object[]{nuApontamento});
                BigDecimal idiatv = cabecalhoApontamentoVO.asBigDecimal("InstanciaAtividade.IDIATV");
                BigDecimal idiproc = cabecalhoApontamentoVO.asBigDecimal("InstanciaAtividade.IDIPROC");
                BigDecimal idefx = cabecalhoApontamentoVO.asBigDecimal("InstanciaAtividade.IDEFX");
                Collection<DynamicVO> apontamentosPA = cabecalhoApontamentoVO.asCollection("ApontamentoPA");
                boolean temQtdApontadaIgualMaiorQtdProduzir = this.validaQtdApontadaIgualMaiorQtdProduzir(jdbc, idiatv, idiproc, idefx, apontamentosPA);
                this.validaQtdSeriesPAApontamento(jdbc, idiatv, idiproc, idefx);
                this.validaQtdSeriesMPApontamento(jdbc, nuApontamento, idiproc);
                boolean atvGeraNotaProducao = this.atividadeGeraNotaProducao(dwfEntityFacade, idiatv);
                JapeSession.putProperty("br.com.sankhya.mgeprod.gera.nota.producao", atvGeraNotaProducao);
                JapeSession.putProperty("br.com.sankhya.mgeprod.is.ultimo.apontamento", new Boolean(clientEventRespotaUltimoApontamento) || aceitarQtdMaior);
                ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
                apontamentoHelper.validarConfirmacaoApontamento(cabecalhoApontamentoVO, true);
                if (!aceitarQtdMaior) {
                    Collection<LiberacaoSolicitada> liberacoesSolicitadasMP = apontamentoHelper.validarQtdApontada(nuApontamento, idefx, apontamentosPA);
                    if (!liberacoesSolicitadasMP.isEmpty()) {
                        ctx.getBodyElement().addContent(LiberacaoAlcadaHelper.buildXMLLiberacoesPendentes(liberacoesSolicitadasMP));
                        return;
                    }
                }

                boolean permitePerda100Porcento = atvGeraNotaProducao ? apontamentoHelper.permiteApontamentoComPerdaTotal(cabecalhoApontamentoVO) : false;
                boolean temQtdApontadaMenorQtdProduzir = atvGeraNotaProducao ? this.validaQtdApontadaMenorQtdProduzir(jdbc, idiatv, idiproc, idefx) : false;
                if ((atvGeraNotaProducao || permitePerda100Porcento) && temQtdApontadaMenorQtdProduzir && !aceitarQtdMaior && StringUtils.isEmpty(clientEventRespotaUltimoApontamento)) {
                    ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.ultimo", new Element("event"));
                    throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00233", new ServiceCanceledException());
                }

                try {
                    if (new Boolean(clientEventRespotaUltimoApontamento) || temQtdApontadaIgualMaiorQtdProduzir) {
                        this.processarPerdaUltimoApontamento(dwfEntityFacade, jdbc, idiatv, idiproc, nuApontamento, cabecalhoApontamentoVO);

                        for(DynamicVO apontamentoVO : apontamentosPA) {
                            apontamentoHelper.validaMotivoDePerda(apontamentoVO);
                        }

                        JapeSession.putProperty("br.com.sankhya.apontamento.producao.ultimo.apontamento", true);
                    }

                    for(DynamicVO apontamentoVO : apontamentosPA) {
                        if (apontamentoVO.asBigDecimalOrZero("CODMPE").doubleValue() > (double)0.0F && apontamentoVO.asBigDecimalOrZero("QTDPERDA").doubleValue() <= (double)0.0F) {
                            throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00563", new Exception("Usuário informou um motivo de perda, favor informar o valor do campo 'Qtd. Perda'."));
                        }
                    }

                    if (JapeSession.getPropertyAsBoolean("br.com.sankhya.apontamento.producao.ultimo.apontamento", true) && !respostaSerieLiberadoPerda && this.isPAControladoPorSerie(jdbc, idiproc) && (Boolean)this.verificaQtdSeriesMPsemVinculoPerda(jdbc, idiproc, idefx, false).getRight()) {
                        XMLUtils.addAttributeElement(paramsElement, "notaPerda", "S");
                        XMLUtils.addAttributeElement(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO", clientEventRespotaUltimoApontamento);
                        paramsElement.addContent(this.getMateriasPrimasSemVinculo(idefx, idiproc, nuApontamento, jdbc, true));
                        ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.liberaNroSerie", (Element)paramsElement.detach());
                        throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00233", new ServiceCanceledException());
                    }

                    if (atvGeraNotaProducao && !respostaSerieLiberado) {
                        if (this.isPAControladoPorSerie(jdbc, idiproc)) {
                            XMLUtils.addAttributeElement(paramsElement, "notaProducao", "S");
                            XMLUtils.addAttributeElement(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO", clientEventRespotaUltimoApontamento);
                            paramsElement.addContent(this.getMateriasPrimasSemVinculo(idefx, idiproc, nuApontamento, jdbc, false));
                            ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.liberaNroSerie", (Element)paramsElement.detach());
                            throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00233", new ServiceCanceledException());
                        }

                        Element seriesMPs = this.buscaSeriesMP(jdbc, idiproc, nuApontamento);
                        if (seriesMPs != null && !respostaSerieLiberadoMP) {
                            XMLUtils.addAttributeElement(paramsElement, "notaProducaoSerieMP", "S");
                            XMLUtils.addAttributeElement(paramsElement, "RESPOSTA_ULTIMO_APONTAMENTO", clientEventRespotaUltimoApontamento);
                            paramsElement.addContent(seriesMPs);
                            ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.liberaNroSerie", (Element)paramsElement.detach());
                            throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00233", new ServiceCanceledException());
                        }
                    }

                    apontamentoHelper.confirmarApontamento(nuApontamento, aceitarQtdMaior, aceitaProporcaoInvalidaMPAlternativa);
                    OperacoesEstoqueHelper operacoesEstoqueHelper = new OperacoesEstoqueHelper(jdbc);
                    operacoesEstoqueHelper.executarOperacoesEstoqueAtividade(idiatv, nuApontamento, MomentoOperacaoEstoque.APONTAMENTO_PA);
                } catch (ApontamentoInvalidoException e) {
                    XMLUtils.addContentElement(ctx.getBodyElement(), "MSGQTDMAIOR", e.getMessage());
                } catch (ProporcaoApontamentoInvalidaException var34) {
                    ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.operacaoproducao.mpalt.proporcao.apontamento.invalida", new Element("event"));
                    throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00233", new ServiceCanceledException());
                }

                if (new Boolean(clientEventRespotaUltimoApontamento) && atvGeraNotaProducao) {
                    apontamentoHelper.finalizarProducaoProdutoAcabadosApontamento(idiproc, nuApontamento);
                }

                boolean necessitaTransferenciaParcial = this.necessitaTransferenciaParcial(dwfEntityFacade, jdbc, idiproc, idefx, nuApontamento);
                XMLUtils.addContentElement(ctx.getBodyElement(), "necessitaTransferenciaParcial", necessitaTransferenciaParcial);
            } catch (Exception e) {
                if ((Boolean)JapeSession.getProperty("br.com.sankhya.mgeprod.finalizar.liberacao.desvio.pa", false)) {
                    XMLUtils.addContentElement(ctx.getBodyElement(), "necessitaLiberacao", true);
                } else {
                    SPBeanUtils.throwExceptionRollingBack(e, this.context);
                }

                return;
            }

        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
            ResourceLock.release(lock);
        }
    }

    private boolean atividadeGeraNotaProducao(EntityFacade dwfEntityFacade, BigDecimal idiatv) throws Exception {
        DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idiatv});
        Collection<DynamicVO> operacoesEstoqueList = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("OperacoesEstoque", " this.IDEFX = ? ", new Object[]{instanciaAtividadeVO.asBigDecimal("IDEFX")}));
        boolean atvGeraNotaProducao = false;

        for(DynamicVO operacaoEstoqueVO : operacoesEstoqueList) {
            if ("PA".equals(operacaoEstoqueVO.asString("QUANDO"))) {
                DynamicVO topVO = operacaoEstoqueVO.asDymamicVO("TipoOperacao");
                DynamicVO modeloNotaVO = operacaoEstoqueVO.asDymamicVO("CabecalhoNota");
                if (modeloNotaVO == null) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00235", new Exception(String.format(I18nServerSideBundle.getString("modeloNotaOperacaoEstoqueNaoExiste", OperacaoProducaoSPBean.class), operacaoEstoqueVO.asBigDecimal("NUNOTAMODELO"))));
                }

                DynamicVO topModeloNotaVO = modeloNotaVO.asDymamicVO("TipoOperacao");
                if (!"SP".equals(operacaoEstoqueVO.asString("TIPOITENS")) || (topVO == null || !"F".equals(topVO.asString("TIPMOV"))) && (topModeloNotaVO == null || !"F".equals(topModeloNotaVO.asString("TIPMOV")))) {
                    if (topVO != null && "F".equals(topVO.asString("TIPMOV"))) {
                        atvGeraNotaProducao = true;
                        break;
                    }

                    if (topModeloNotaVO != null && "F".equals(topModeloNotaVO.asString("TIPMOV"))) {
                        atvGeraNotaProducao = true;
                        break;
                    }
                }
            }
        }

        return atvGeraNotaProducao;
    }

    private boolean validaQtdApontadaMenorQtdProduzir(JdbcWrapper jdbc, BigDecimal idiatv, BigDecimal idiproc, BigDecimal idefx) throws Exception {
        NativeSql sqlBuscaApontamentoQtdApontadaMenorQtdProduzir = new NativeSql(jdbc);
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" SELECT IPA.CODPRODPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t, IPA.CONTROLEPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t   \t, SUM (APA.QTDAPONTADA) + SUM(APA_PERDA.QTDPERDA) - SUM (IPA.QTDPRODUZIR) AS TOTAL_APONTADO ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" \tFROM TPRIPA IPA, ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t (SELECT APA.CODPRODPA, APA.CONTROLEPA,SUM(APA.QTDAPONTADA) AS QTDAPONTADA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" \t\t  \tFROM TPRAPA APA  ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" \t\t  WHERE EXISTS ( SELECT APO.NUAPO ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t\t\t   \t \tFROM TPRAPO APO ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t\t\t   \t \tINNER JOIN TPRIATV IATV ON (IATV.IDIATV = APO.IDIATV) ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t\t\t   \t WHERE APO.NUAPO   = APA.NUAPO ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t\t\t\t\tAND IATV.IDEFX = :IDEFX AND IATV.IDIPROC = :IDIPROC");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t\t\t   ) ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t     GROUP BY APA.CODPRODPA, APA.CONTROLEPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t ) APA, ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t (SELECT APA.CODPRODPA, APA.CONTROLEPA,SUM(APA.QTDPERDA) AS QTDPERDA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t \tFROM TPRAPA APA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t \tINNER JOIN TPRAPO APO ON (APO.NUAPO = APA.NUAPO) ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t WHERE EXISTS (SELECT 1  ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t \tFROM TPRIATV IATV  ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t\tWHERE IATV.IDIPROC = :IDIPROC  ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t \t\t\tAND APO.IDIATV = IATV.IDIATV  ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t \t\t)  ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t  GROUP BY APA.CODPRODPA, APA.CONTROLEPA  ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t ) APA_PERDA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" WHERE IPA.IDIPROC   = :IDIPROC ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" AND IPA.CONCLUIDO = 'N' ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" AND APA.CODPRODPA = IPA.CODPRODPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" AND APA.CONTROLEPA = IPA.CONTROLEPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" AND APA_PERDA.CODPRODPA = IPA.CODPRODPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql(" AND APA_PERDA.CONTROLEPA = IPA.CONTROLEPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\tAND EXISTS ( SELECT 1 ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t   \t \tFROM TPRAPA APA INNER JOIN TPRAPO APO ON(APO.NUAPO = APA.NUAPO) ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t   \t WHERE APA.CONTROLEPA = IPA.CONTROLEPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t\t\tAND APA.CODPRODPA = IPA.CODPRODPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\t\t\t   )");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\tGROUP BY IPA.CODPRODPA, IPA.CONTROLEPA ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.appendSql("\tHAVING SUM (APA.QTDAPONTADA) + SUM(APA_PERDA.QTDPERDA) - SUM (IPA.QTDPRODUZIR) < 0 ");
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.setNamedParameter("IDIPROC", idiproc);
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.setNamedParameter("IDIATV", idiatv);
        sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.setNamedParameter("IDEFX", idefx);
        ResultSet result = sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.executeQuery();
        boolean existeApontamentoQtdApontadaMenor = false;
        if (result.next() && result.getDouble("TOTAL_APONTADO") < (double)0.0F) {
            existeApontamentoQtdApontadaMenor = true;
        }

        result.close();
        return existeApontamentoQtdApontadaMenor;
    }

    public void iniciaCicloControleQualidade(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idIAtv = XMLUtils.getAttributeAsBigDecimal(paramsElement, "IDIATV");
            DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idIAtv});
            DynamicVO atividadeVO = instanciaAtividadeVO.asDymamicVO("Atividade");
            DynamicVO elementoVO = atividadeVO.asDymamicVO("ElementoFluxo");
            BigDecimal idEfx = atividadeVO.asBigDecimal("IDEFX");
            BigDecimal idProc = elementoVO.asBigDecimal("IDPROC");
            Collection<DynamicVO> eventosFluxo = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("EventoFluxo", "this.IDEFXANEXADO = ? AND this.IDEFX IN (SELECT IDEFX FROM TPREFX WHERE IDPROC = ? AND TIPO = ?)", new Object[]{idEfx, idProc, 3312}));
            if (eventosFluxo.size() != 1) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00236", new Exception("Não existe evento de ciclo de controle de qualidade anexado à atividade " + idEfx + " no processo " + idProc + "."));
            }

            ControleAtividadeHelper controleAtividadeHelper = new ControleAtividadeHelper(jdbc);
            controleAtividadeHelper.disparaSinalCicloControleQualidade(idIAtv);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void transferirParcial(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idEfx = XMLUtils.getAttributeAsBigDecimal(paramsElement, "IDEFX");
            BigDecimal idiproc = XMLUtils.getAttributeAsBigDecimal(paramsElement, "IDIPROC");
            BigDecimal idIAtv = XMLUtils.getAttributeAsBigDecimal(paramsElement, "IDIATV");
            BigDecimal nuApo = XMLUtils.getAttributeAsBigDecimal(paramsElement, "NUAPO");
            BigDecimal codusu = XMLUtils.getAttributeAsBigDecimal(paramsElement, "USUARIOLOGADO");
            Element produtosElemnt = XMLUtils.getRequiredChild(paramsElement, "produtos");
            AuthenticationInfo previousAuthInfo = null;
            if (codusu != null) {
                previousAuthInfo = AuthenticationInfo.getCurrent();
                DynamicVO usuarioVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Usuario", new Object[]{codusu});
                AuthenticationInfo auth = new AuthenticationInfo(usuarioVO.asString("NOMEUSU"), codusu, BigDecimalUtil.ZERO_VALUE, 0);
                auth.makeCurrent();
            }

            HashMap<String, BigDecimal> dadosRepo = new HashMap();
            dadosRepo.put("IDEFX", idEfx);
            dadosRepo.put("IDIATV", idIAtv);
            dadosRepo.put("NUAPO", nuApo);
            List<ControleRepositorioPAHelper.ProdutoPA> produtosPALst = new ArrayList();

            for(Object produtoObj : produtosElemnt.getChildren()) {
                Element produtoElement = (Element)produtoObj;
                BigDecimal codProd = XMLUtils.getContentChildAsBigDecimal(produtoElement, "CODPROD");
                String controle = ComercialUtils.trimControleEstoque(XMLUtils.getContentChildAsString(produtoElement, "CONTROLE"));
                BigDecimal quantidade = XMLUtils.getContentChildAsBigDecimal(produtoElement, "QUANTIDADE");
                BigDecimal qtdPerda = XMLUtils.getContentChildAsBigDecimal(produtoElement, "QTDPERDA");

                try {
                    dwfEntityFacade.findEntityByPrimaryKeyAsVO("ProdutoAcabadoAProduzir", new Object[]{idiproc, codProd, ComercialUtils.trimControleEstoque(controle)});
                } catch (ObjectNotFoundException var30) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00237", new Exception(String.format("Produto %s - %s não pertence aos produtos acabados ", codProd, ComercialUtils.trimControleEstoque(controle))));
                }

                BigDecimal qtdOperacao = XMLUtils.getContentChildAsBigDecimal(produtoElement, "ESTOQUE_REP_OPER");
                BigDecimal qtdTransferir = BigDecimalUtil.getValueOrZero(quantidade).add(BigDecimalUtil.getValueOrZero(qtdPerda));
                Boolean validadorTransferencia = this.validadorTransferenciaParcial(idiproc, idIAtv, qtdTransferir.doubleValue(), jdbc);
                if (!validadorTransferencia) {
                    if (qtdTransferir.doubleValue() > (double)0.0F && qtdTransferir.doubleValue() >= qtdOperacao.doubleValue()) {
                        validadorTransferencia = false;
                    }

                    if (validadorTransferencia) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00491", new Exception("É proibido transferir a quantidade total do produto em processamento na atividade (Qtd. em Operação) pela Transferência Parcial. Para realizar esta ação, finalize a atividade."));
                    }

                    ControleRepositorioPAHelper.ProdutoPA produtoPA = new ControleRepositorioPAHelper.ProdutoPA(codProd, controle, quantidade, qtdPerda);
                    produtosPALst.add(produtoPA);
                }
            }

            JapeSession.putProperty("br.com.sankhya.mgeprod.movimentar.automatico.repositorio", dadosRepo);
            JapeSession.putProperty("br.com.sankhya.mgeprod.movimentar.automatico.repositorio.pas", produtosPALst);
            ControleAtividadeHelper controlHelper = new ControleAtividadeHelper(jdbc);
            controlHelper.disparaSinalTransferenciaParcial(idIAtv);
            if (previousAuthInfo != null) {
                previousAuthInfo.makeCurrent();
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public Boolean validadorTransferenciaParcial(BigDecimal idiproc, BigDecimal idIAtv, Double qtdTransferir, JdbcWrapper jdbc) throws Exception {
        Boolean TransferenciaValidadoAux = false;
        Boolean TransferenciaValidado = false;
        NativeSql sqlBuscaOutrasAtvAbertas = new NativeSql(jdbc);
        NativeSql sqlBuscaEstoqueRepositorio = new NativeSql(jdbc);

        try {
            sqlBuscaOutrasAtvAbertas.appendSql("SELECT 1 ");
            sqlBuscaOutrasAtvAbertas.appendSql("FROM TPRIATV IATV ");
            sqlBuscaOutrasAtvAbertas.appendSql("WHERE IATV.DHFINAL IS NULL AND IATV.IDIPROC = :IDIPROC ");
            sqlBuscaOutrasAtvAbertas.appendSql("AND IATV.IDIATV < :IDIATV ");
            sqlBuscaOutrasAtvAbertas.appendSql("AND (nullvalue(IATV.IDEXECWFLOW,0) > 0)");
            sqlBuscaOutrasAtvAbertas.appendSql("AND NOT EXISTS (SELECT 1 FROM TPREFX EFX, TPRATV ATV WHERE ATV.IDEFX = IATV.IDEFX AND EFX.IDPROC = ATV.IDPROC AND EFX.TIPO IN (2101, 2301, 3312))");
            sqlBuscaOutrasAtvAbertas.setNamedParameter("IDIPROC", idiproc);
            sqlBuscaOutrasAtvAbertas.setNamedParameter("IDIATV", idIAtv);
            ResultSet resultSqlOutrasAtvAbertas = sqlBuscaOutrasAtvAbertas.executeQuery();
            if (resultSqlOutrasAtvAbertas.next()) {
                TransferenciaValidadoAux = true;
            }

            if (TransferenciaValidadoAux) {
                sqlBuscaEstoqueRepositorio.appendSql("SELECT SUM(ESTOQUE) AS ESTOQUE ");
                sqlBuscaEstoqueRepositorio.appendSql("FROM TPRESR ");
                sqlBuscaEstoqueRepositorio.appendSql("WHERE IDIPROC = :IDIPROC ");
                sqlBuscaEstoqueRepositorio.setNamedParameter("IDIPROC", idiproc);
                ResultSet resultSqlBuscaEstoqueRepositorio = sqlBuscaEstoqueRepositorio.executeQuery();
                if (resultSqlBuscaEstoqueRepositorio.next() && resultSqlBuscaEstoqueRepositorio.getBigDecimal("ESTOQUE").compareTo(BigDecimal.valueOf(qtdTransferir)) > 0) {
                    TransferenciaValidado = true;
                }

                resultSqlBuscaEstoqueRepositorio.close();
            }

            resultSqlOutrasAtvAbertas.close();
        } finally {
            NativeSql.releaseResources(sqlBuscaOutrasAtvAbertas);
            NativeSql.releaseResources(sqlBuscaEstoqueRepositorio);
        }

        return TransferenciaValidado;
    }

    public void getDadosTransferenciaParcial(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idIProc = XMLUtils.getAttributeAsBigDecimal(paramsElement, "IDIPROC");
            BigDecimal idEfx = XMLUtils.getAttributeAsBigDecimal(paramsElement, "IDEFX");
            DynamicVO atividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Atividade", new Object[]{idEfx});
            NativeSql sql = new NativeSql(jdbc, this.getClass(), "OperacaoProducao_queBuscaProdutosTranferenciaParcial.sql");
            sql.setNamedParameter("IDIPROC", idIProc);
            sql.setNamedParameter("IDEFX", idEfx);
            sql.setNamedParameter("IDRPA_OPER", atividadeVO.asBigDecimal("IDRPAOPER"));
            ResultSet rset = sql.executeQuery();
            Element response = XMLUtils.buildXMLFromResultSet("entities", "entity", rset, new XMLUtils.RowBuilder() {
                public boolean acceptColumn(String columnName) {
                    return true;
                }

                public void addCalculatedColumns(Element parent, ResultSet rs) throws Exception {
                }

                public Object formatColumn(Object value, String column) {
                    return value;
                }

                public String[] getSumColumns() {
                    return new String[]{"QTD_TRANSFERIR"};
                }
            });
            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void validarCodVol(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getChild(ctx.getRequestBody(), "params");
            BigDecimal codprod = XMLUtils.getRequiredAttributeAsBigDecimal(params, "codprod");
            String controle = XMLUtils.getAttributeAsString(params, "controle");
            String codvol = XMLUtils.getRequiredAttributeAsString(params, "codvol");
            ListaMateriaisUtils.validarUnidadeMateriaPrima(codprod, controle, codvol);
            XMLUtils.addContentElement(ctx.getBodyElement(), "result", "ok");
        } catch (Exception e) {
            throw (MGEModelException)SKError.registry(TSLevel.ERROR, "PROD_E00238", new MGEModelException(e.getMessage()));
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void loginApontamento(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            String parLoginApontamento = (String)MGECoreParameter.getParameter("mge.com.producao.identifica.login.apontamento");
            Element params = XMLUtils.getChild(ctx.getRequestBody(), "params");
            String usuario = XMLUtils.getRequiredAttributeAsString(params, "login");
            String senha = XMLUtils.getAttributeAsString(params, "password");
            String usuarioAux = "";
            ValidadorLogin.AcessoSistema acessoSistema = new ValidadorLogin.AcessoSistema();
            if (!StringUtils.isEmpty(parLoginApontamento)) {
                usuarioAux = OperacaoProducaoHelper.getInstance().getLoginApontamentoProducao(jdbc, parLoginApontamento, usuario);
                if (usuarioAux.equals(usuario)) {
                    acessoSistema.setValidarSenha(true);
                } else {
                    acessoSistema.setValidarSenha(false);
                    usuario = usuarioAux;
                }
            } else {
                acessoSistema.setValidarSenha(true);
            }

            acessoSistema.setNomeUsuario(usuario);
            acessoSistema.setSenha(senha);
            AuthorizationHelper.LoginResult login = AuthorizationHelper.getUserAuthenticate(acessoSistema);
            boolean acessoAlterarWC = this.hasAuthorization(ctx.getResourceId(), login.getUsuarioVO().getCODUSU(), "AWC");
            DynamicVO usuarioVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Usuario", new Object[]{login.getUsuarioVO().getCODUSU()});
            XMLUtils.addContentElement(ctx.getBodyElement(), "userid", login.getUsuarioVO().getCODUSU());
            XMLUtils.addContentElement(ctx.getBodyElement(), "username", login.getUsuarioVO().getNOMEUSU());
            XMLUtils.addContentElement(ctx.getBodyElement(), "acessoAlterarWC", acessoAlterarWC);
            XMLUtils.addContentElement(ctx.getBodyElement(), "selecionaWorkCenter", usuarioVO.asString("SELECTWCAPO"));
            XMLUtils.addContentElement(ctx.getBodyElement(), "usaPesagemManual", StringUtils.getNullAsEmpty(usuarioVO.asString("CONTACESSO")).contains("P"));
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getQuantidadeApontada(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getChild(ctx.getRequestBody(), "params");
            BigDecimal codProd = XMLUtils.getContentChildAsBigDecimal(params, "codProd");
            BigDecimal qtd = XMLUtils.getContentChildAsBigDecimal(params, "qtd");
            String codVolAtual = XMLUtils.getContentChildAsString(params, "volumeAtual");
            String codVolAntigo = XMLUtils.getContentChildAsString(params, "volumeAntigo");
            String controle = XMLUtils.getContentChildAsString(params, "controle");
            DynamicVO matPrimaVO = (DynamicVO)EntityFacadeFactory.getDWFFacade().findEntityByPrimaryKeyAsVO("Produto", new Object[]{codProd});
            BigDecimal quantidade = UnidadeProdutoUtils.converteQuantidadePorUnidadeVolume(matPrimaVO, qtd, ComercialUtils.trimControleEstoque(controle), codVolAntigo, codVolAtual);
            Element response = new Element("qtdConvertida");
            response.setAttribute("qtd", quantidade.toString());
            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            throw (MGEModelException)SKError.registry(TSLevel.ERROR, "PROD_E00239", new MGEModelException(e.getMessage()));
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void getPesosApontados(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getChild(ctx.getRequestBody(), "params");
            BigDecimal nrOp = XMLUtils.getContentChildAsBigDecimal(params, "nrOp");
            BigDecimal codProdPa = XMLUtils.getContentChildAsBigDecimal(params, "codProdPa");
            JapeWrapper prodPesoDAO = JapeFactory.dao(this.getEntityNamePorTipoApontamento(params));
            Collection<DynamicVO> dvPesagens = prodPesoDAO.find("OPNRO = ? and CODPROD  = ?", new Object[]{nrOp, codProdPa});
            Element pesagens = new Element("Pesagens");
            if (!dvPesagens.isEmpty()) {
                for(DynamicVO pesagem : dvPesagens) {
                    Element response = new Element("Pesagem");
                    response.setAttribute("OPNRO", pesagem.asBigDecimal("OPNRO").toString());
                    response.setAttribute("CODPROD", pesagem.asBigDecimal("CODPROD").toString());
                    response.setAttribute("QTDAPONTADA", pesagem.asBigDecimal("QTDAPONTADA").toString());
                    response.setAttribute("QTDPERDA", pesagem.asBigDecimal("QTDPERDA").toString());
                    response.setAttribute("CODAPPRDOPESO", pesagem.asBigDecimal("CODAPPRDOPESO").toString());
                    response.setAttribute("PERDA", pesagem.asString("PERDA"));
                    pesagens.addContent(response);
                }
            } else {
                Element response = new Element("Pesagem");
                response.setAttribute("OPNRO", nrOp.toString());
                response.setAttribute("CODPROD", codProdPa.toString());
                response.setAttribute("QTDAPONTADA", "0");
                response.setAttribute("QTDPERDA", "0");
                response.setAttribute("CODAPPRDOPESO", "-1");
                response.setAttribute("PERDA", "N");
                pesagens.addContent(response);
            }

            ctx.getBodyElement().addContent(pesagens);
        } catch (Exception e) {
            e.printStackTrace();
            throw (MGEModelException)SKError.registry(TSLevel.ERROR, "PROD_E00240", new MGEModelException(e.getMessage()));
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void getPesosApontadosSP(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            Element params = XMLUtils.getChild(ctx.getRequestBody(), "params");
            BigDecimal nrOp = XMLUtils.getContentChildAsBigDecimal(params, "nrOp");
            BigDecimal codProdSP = XMLUtils.getContentChildAsBigDecimal(params, "codProdPa");
            JapeWrapper prodPesoDAO = JapeFactory.dao("ArmazenaPesoSubProduto");
            Collection<DynamicVO> dvPesagens = prodPesoDAO.find("OPNRO = ? and CODPRODSP  = ?", new Object[]{nrOp, codProdSP});
            Element pesagens = new Element("Pesagens");
            if (!dvPesagens.isEmpty()) {
                for(DynamicVO pesagem : dvPesagens) {
                    Element response = new Element("Pesagem");
                    response.setAttribute("OPNRO", pesagem.asBigDecimal("OPNRO").toString());
                    response.setAttribute("CODPROD", pesagem.asBigDecimal("CODPRODSP").toString());
                    response.setAttribute("QTD", pesagem.asBigDecimal("QTD").toString());
                    response.setAttribute("ID", pesagem.asBigDecimal("ID").toString());
                    pesagens.addContent(response);
                }
            } else {
                Element response = new Element("Pesagem");
                response.setAttribute("OPNRO", nrOp.toString());
                response.setAttribute("CODPROD", codProdSP.toString());
                response.setAttribute("QTD", "0");
                response.setAttribute("ID", "-1");
                pesagens.addContent(response);
            }

            ctx.getBodyElement().addContent(pesagens);
        } catch (Exception e) {
            e.printStackTrace();
            throw (MGEModelException)SKError.registry(TSLevel.ERROR, "PROD_E00241", new MGEModelException(e.getMessage()));
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void unidadeAlternativaProdutoMP(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        EntityFacade entityFacade = null;

        try {
            hnd = JapeSession.open();
            entityFacade = EntityFacadeFactory.getDWFFacade();
            Element params = XMLUtils.getChild(ctx.getRequestBody(), "params");
            BigDecimal codProd = XMLUtils.getContentChildAsBigDecimal(params, "codProd");
            String codVolAtual = XMLUtils.getContentChildAsString(params, "volumeAtual");
            String controle = XMLUtils.getContentChildAsString(params, "controle");
            BigDecimal atividade = XMLUtils.getContentChildAsBigDecimal(params, "atividade");
            Collection<DynamicVO> volAltVOs = entityFacade.findByDynamicFinderAsVO(new FinderWrapper("ListaMateriaisAtividade", " this.CODPRODMP = ? AND this.IDEFX = ? ", new Object[]{codProd, atividade}));
            DynamicVO volAltVO = (DynamicVO)volAltVOs.iterator().next();
            if (volAltVO != null) {
                volAltVO = UnidadeProdutoUtils.getVolumeAlternativo(codProd, volAltVO.asString("CODVOL"), controle);
            } else {
                volAltVO = UnidadeProdutoUtils.getVolumeAlternativo(codProd, codVolAtual, controle);
            }

            String codVolAlternativo = new String(volAltVO.asString("CODVOL"));
            Element response = new Element("volumeAlternativo");
            response.setAttribute("codVol", codVolAlternativo);
            ctx.getBodyElement().addContent(response);
        } catch (Exception e) {
            throw (MGEModelException)SKError.registry(TSLevel.ERROR, "PROD_E00242", new MGEModelException(e.getMessage()));
        } finally {
            JapeSession.close(hnd);
        }

    }

    private void processarPerdaUltimoApontamento(EntityFacade dwfEntityFacade, JdbcWrapper jdbc, BigDecimal idiatv, BigDecimal idiproc, BigDecimal nuapo, DynamicVO cabecalhoApontamentoVO) throws Exception {
        NativeSql sqlBuscaApontamentoQtdApontadaMenorQtdProduzir = null;
        JapeSession.putProperty("br.com.sankhya.mgeprod.ignorar.reproporcionalizacao.qtd.apontada.mp", Boolean.TRUE);
        ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);

        try {
            sqlBuscaApontamentoQtdApontadaMenorQtdProduzir = new NativeSql(jdbc, this.getClass(), "BuscaApontamentoQtdApontada_queBuscaApontamentoQtdApontada.sql");
            sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.setNamedParameter("IDIATV", idiatv);
            sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.setNamedParameter("IDIPROC", idiproc);
            sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.setNamedParameter("NUAPO", nuapo);
            ResultSet result = sqlBuscaApontamentoQtdApontadaMenorQtdProduzir.executeQuery();

            while(result.next()) {
                if (result.getDouble("TOTAL_APONTADO") < (double)0.0F) {
                    PersistentLocalEntity apontamentoPAEntity = dwfEntityFacade.findEntityByPrimaryKey("ApontamentoPA", new Object[]{nuapo, result.getBigDecimal("SEQAPA")});
                    DynamicVO apontamentoPAVO = (DynamicVO)apontamentoPAEntity.getValueObject();
                    if (cabecalhoApontamentoVO == null) {
                        cabecalhoApontamentoVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("CabecalhoApontamento", new Object[]{nuapo});
                    }

                    BigDecimal idefx = cabecalhoApontamentoVO.asBigDecimal("InstanciaAtividade.IDEFX");
                    BigDecimal qtdRestanteRepositorio = apontamentoHelper.calculaQtdNovoApontamento(idiproc, (BigDecimal)null, idefx, apontamentoPAVO.asBigDecimal("QTDAPONTADA"), apontamentoPAVO.asBigDecimal("CODPRODPA"), apontamentoPAVO.asString("CONTROLEPA"));
                    if (!BigDecimalUtil.isEmpty(qtdRestanteRepositorio)) {
                        if (apontamentoPAVO.asBigDecimal("QTDPERDA").compareTo(BigDecimal.ZERO) == 0) {
                            apontamentoPAVO.setProperty("QTDPERDA", qtdRestanteRepositorio);
                        } else if (qtdRestanteRepositorio.compareTo(apontamentoPAVO.asBigDecimal("QTDPERDA")) != 0) {
                            apontamentoPAVO.setProperty("QTDPERDA", qtdRestanteRepositorio.add(apontamentoPAVO.asBigDecimal("QTDPERDA")));
                        } else if (BigDecimal.ZERO.compareTo(result.getBigDecimal("QTDPERDA")) != 0) {
                            apontamentoPAVO.setProperty("QTDPERDA", result.getBigDecimal("QTDPERDA").abs());
                        } else {
                            apontamentoPAVO.setProperty("QTDPERDA", result.getBigDecimal("TOTAL_APONTADO").abs());
                        }
                    }

                    if (BigDecimal.ZERO.compareTo(apontamentoPAVO.asBigDecimal("QTDPERDA")) != 0) {
                        apontamentoPAEntity.setValueObject((EntityVO)apontamentoPAVO);
                    }
                }
            }

            result.close();
        } finally {
            JapeSession.putProperty("br.com.sankhya.mgeprod.ignorar.reproporcionalizacao.qtd.apontada.mp", Boolean.FALSE);
            NativeSql.releaseResources(sqlBuscaApontamentoQtdApontadaMenorQtdProduzir);
        }

    }

    private boolean validaQtdApontadaIgualMaiorQtdProduzir(JdbcWrapper jdbc, BigDecimal idiatv, BigDecimal idiproc, BigDecimal idefx, Collection<DynamicVO> apontamentosPA) throws Exception {
        boolean existeApontamentoQtdApontadaIgual = false;
        NativeSql sql = new NativeSql(jdbc, this.getClass(), "OperacaoProducao_validaQtdApontadaIgualMaiorQtdProduzir.sql");
        sql.setIdStatementFromCache("OperacaoProducao_validaQtdApontadaIgualMaiorQtdProduzir.sql");
        sql.setReuseStatements(true);

        for(DynamicVO apontamentoVO : apontamentosPA) {
            ProdutoControle produtoControlePA = new ProdutoControle(apontamentoVO.asBigDecimal("CODPRODPA"), apontamentoVO.asString("CONTROLEPA"));
            sql.setNamedParameter("IDIPROC", idiproc);
            sql.setNamedParameter("IDIATV", idiatv);
            sql.setNamedParameter("IDEFX", idefx);
            sql.setNamedParameter("CODPRODPA", produtoControlePA.getCodProd());
            sql.setNamedParameter("CONTROLEPA", produtoControlePA.getControle());
            ResultSet result = sql.executeQuery();
            if (result.next()) {
                if (result.getDouble("SOMAQTDAPONTADA") > (double)0.0F && "S".equals(result.getString("PROIBEAPONT"))) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00243", new Exception("Apontamento à maior que o tamanho de lote da OP é proibido."));
                }

                if (result.getDouble("TOTAL_APONTADO") >= (double)0.0F) {
                    existeApontamentoQtdApontadaIgual = true;
                }
            }

            result.close();
        }

        return existeApontamentoQtdApontadaIgual;
    }

    public void alterarWorkCenter(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiatv = XMLUtils.getAttributeAsBigDecimal(paramsElement, "idiatv");
            BigDecimal codwcp = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codwcp");
            BigDecimal codwcpOld = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codwcpold");
            BigDecimal qtdProduzir = XMLUtils.getAttributeAsBigDecimal(paramsElement, "qtdproduzir");
            BigDecimal codProdPA = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codprodpa");
            String controlePA = XMLUtils.getAttributeAsString(paramsElement, "controlepa");
            boolean resposta = XMLUtils.getAttributeAsBoolean(paramsElement, "RESPOSTA");
            boolean isRealocarCT = XMLUtils.getAttributeAsBoolean(paramsElement, "REALOCAR");
            WorkCenterHelper.getInstance().validCapacityWorkCenter(codwcp, codProdPA, ComercialUtils.trimControleEstoque(controlePA), qtdProduzir, (BigDecimal)null, false);
            JapeSession.putProperty("br.sankhya.operacaoProducao.oldWcp", codwcpOld);
            JapeSession.putProperty("br.com.sankhya.prod.aviso.indisponibilidade.resposta", resposta);
            this.doAlteracaoLote(dwfEntityFacade, idiatv, codwcp, codwcpOld, isRealocarCT);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private void doAlteracaoLote(EntityFacade dwfEntityFacade, BigDecimal idiatv, BigDecimal codwcp, BigDecimal codwcpOld) throws Exception, PersistenceException {
        this.doAlteracaoLote(dwfEntityFacade, idiatv, codwcp, codwcpOld, false);
    }

    private void doAlteracaoLote(EntityFacade dwfEntityFacade, BigDecimal idiatv, BigDecimal codwcp, BigDecimal codwcpOld, boolean isRealocarCT) throws Exception, PersistenceException {
        PersistentLocalEntity instanciaAtividadeEntity = dwfEntityFacade.findEntityByPrimaryKey("InstanciaAtividade", new Object[]{idiatv});
        DynamicVO instanciaAtividadeVO = (DynamicVO)instanciaAtividadeEntity.getValueObject();
        if (isRealocarCT) {
            JapeWrapper historicoWorkCenterAtividadeDAO = JapeFactory.dao("HistoricoWorkCenterAtividade");
            DynamicVO historicoWorkCenterAtividadeVO = historicoWorkCenterAtividadeDAO.findOne("this.IDIPROC = ? AND DHLIBALOC IS NULL", new Object[]{instanciaAtividadeVO.asBigDecimal("IDIPROC")});
            if (historicoWorkCenterAtividadeVO != null) {
                return;
            }
        }

        instanciaAtividadeVO.setProperty("CODWCP", codwcp);

        for(PersistentLocalEntity entity : EntityFacadeFactory.getDWFFacade().findByDynamicFinder(new FinderWrapper("WorkCenterPorInstanciaProcesso", "this.IDIPROC = ? AND this.CODWCP = ? AND this.IDEFX = ?", new Object[]{instanciaAtividadeVO.asBigDecimal("IDIPROC"), codwcpOld, instanciaAtividadeVO.asBigDecimal("IDEFX")}))) {
            DynamicVO wcVO = (DynamicVO)entity.getValueObject();
            wcVO.setProperty("CODWCP", codwcp);
            entity.setValueObject((EntityVO)wcVO);
        }

        if (codwcp != null) {
            OperacaoProducaoHelper operacaoHelper = OperacaoProducaoHelper.getInstance();
            if ("I".equals(instanciaAtividadeVO.asString("SITUACAO")) || isRealocarCT) {
                operacaoHelper.validaDisponibilidadeWorkCenter(instanciaAtividadeVO, true, isRealocarCT);
                if (BigDecimal.ZERO.compareTo(codwcpOld) != 0) {
                    DynamicVO historicoWC = this.buscaHistoricoWCVO(dwfEntityFacade, codwcpOld, instanciaAtividadeVO.asBigDecimal("IDIPROC"), instanciaAtividadeVO.asBigDecimal("IDIATV"));
                    if (historicoWC != null) {
                        PersistentLocalEntity historicoWCEntity = dwfEntityFacade.findEntityByPrimaryKey("HistoricoWorkCenterAtividade", new Object[]{codwcpOld, instanciaAtividadeVO.asBigDecimal("IDIPROC"), instanciaAtividadeVO.asBigDecimal("IDIATV"), historicoWC.asTimestamp("DHALOC")});
                        DynamicVO historicoWCVO = (DynamicVO)historicoWCEntity.getValueObject();
                        historicoWCVO.setProperty("DHLIBALOC", TimeUtils.getNow());
                        historicoWCVO.setProperty("CODUSULIBALOC", AuthenticationInfo.getCurrent().getUserID());
                        historicoWCEntity.setValueObject((EntityVO)historicoWCVO);
                    }
                }

                operacaoHelper.registrarHistoricoWorkCenter(instanciaAtividadeVO);
            }
        }

        instanciaAtividadeEntity.setValueObject((EntityVO)instanciaAtividadeVO);
    }

    public DynamicVO buscaHistoricoWCVO(EntityFacade dwfEntityFacade, BigDecimal codwcp, BigDecimal idiproc, BigDecimal idiatv) throws Exception {
        Collection<DynamicVO> historicosWC = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("HistoricoWorkCenterAtividade", "this.CODWCP = ? AND this.IDIPROC = ? AND this.IDIATV = ? AND this.DHLIBALOC IS NULL", new Object[]{codwcp, idiproc, idiatv}));
        DynamicVO historicoWC = null;
        if (historicosWC.size() > 0) {
            historicoWC = (DynamicVO)historicosWC.iterator().next();
            return historicoWC;
        } else {
            return null;
        }
    }

    public boolean hasAuthorization(String resourceId, BigDecimal codUsu, String chaveAcesso) throws Exception {
        Element element = MGEAuthorizationManager.getAuthorizationConfig(resourceId, codUsu, false);
        if ("S".equals(element.getAttribute("isSup").getValue())) {
            return true;
        } else {
            for(Element ite : element.getChildren()) {
                if (chaveAcesso.equals(XMLUtils.getAttributeAsString(ite, "name"))) {
                    return XMLUtils.getAttributeAsBoolean(ite, "status");
                }
            }

            return false;
        }
    }

    public Collection<Map<String, BigDecimal>> getItensRecursos(Element elementProdutoAcabado) throws Exception {
        Collection<Map<String, BigDecimal>> itensRecursos = new ArrayList();
        Element itensRecursosWC = XMLUtils.getChild(elementProdutoAcabado, "records");

        for(Element element : itensRecursosWC.getChildren("row")) {
            HashMap<String, BigDecimal> itemRecurso = new HashMap();
            itemRecurso.put("CODRHP", XMLUtils.getContentChildAsBigDecimal(element, "CODRHP"));
            itemRecurso.put("CODMQP", XMLUtils.getContentChildAsBigDecimal(element, "CODMQP"));
            itemRecurso.put("NUEQP", XMLUtils.getContentChildAsBigDecimal(element, "NUEQP"));
            itensRecursos.add(itemRecurso);
        }

        return itensRecursos;
    }

    public void alterarWorkCenterTelaFilaOperacoes(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal codWcp = requestBody.get("codWcp").getAsBigDecimal();
            BigDecimal oldCodWcp = requestBody.get("oldCodWcp").getAsBigDecimal();
            JsonObject objRequisitos = null;
            JsonArray listRegistros = null;
            if (requestBody.get("registros") instanceof JsonObject) {
                objRequisitos = requestBody.getAsJsonObject("registros");
            } else {
                listRegistros = requestBody.getAsJsonArray("registros");
            }

            WorkCenterHelper wcHelper = WorkCenterHelper.getInstance(dwfFacade, jdbc);
            if (objRequisitos != null) {
                JsonElement elemIdiatv = objRequisitos.getAsJsonObject().get("IDIATV");
                BigDecimal idIatv = BigDecimalUtil.getBigDecimal(elemIdiatv.getAsString());
                if (idIatv != null) {
                    idIatv = elemIdiatv.getAsBigDecimal();
                    this.doAlteracaoLote(dwfFacade, idIatv, codWcp, oldCodWcp);
                }

                BigDecimal idEfx = objRequisitos.getAsJsonObject().get("IDEFX").getAsBigDecimal();
                BigDecimal idIproc = objRequisitos.getAsJsonObject().get("IDIPROC").getAsBigDecimal();
                wcHelper.alterWorkCenter(idIproc, codWcp, oldCodWcp, idEfx);
            } else {
                for(int i = 0; i < listRegistros.size(); ++i) {
                    JsonElement elemIdiatv = listRegistros.get(i).getAsJsonObject().get("IDIATV");
                    BigDecimal idIatv = BigDecimalUtil.getBigDecimal(elemIdiatv.getAsString());
                    if (idIatv != null) {
                        idIatv = elemIdiatv.getAsBigDecimal();
                        this.doAlteracaoLote(dwfFacade, idIatv, codWcp, oldCodWcp);
                    }

                    BigDecimal idEfx = listRegistros.get(i).getAsJsonObject().get("IDEFX").getAsBigDecimal();
                    BigDecimal idIproc = listRegistros.get(i).getAsJsonObject().get("IDIPROC").getAsBigDecimal();
                    wcHelper.alterWorkCenter(idIproc, codWcp, oldCodWcp, idEfx);
                }
            }
        } catch (Exception e) {
            Exception ex = (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00750", new Exception("Falha ao tentar laterar o centro de trabalho" + e.getMessage(), e));
            SPBeanUtils.throwExceptionRollingBack(ex, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

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

    public void incluirNroSerieMP(ServiceContext serviceCtx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            hnd.setFindersMaxRows(-1);
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            Element serieElem = XMLUtils.getRequiredChild(serviceCtx.getRequestBody(), "SERIE");
            BigDecimal codProdMP = XMLUtils.getAttributeAsBigDecimal(serieElem, "CODPRODMP");
            String serieMP = XMLUtils.getContentAsString(serieElem);
            BigDecimal codProdPA = XMLUtils.getAttributeAsBigDecimal(serieElem, "CODPRODPA");
            String seriePA = XMLUtils.getAttributeAsString(serieElem, "SERIEPA");
            BigDecimal idIproc = XMLUtils.getAttributeAsBigDecimal(serieElem, "IDIPROC");
            BigDecimal nuApo = XMLUtils.getAttributeAsBigDecimal(serieElem, "NUAPO");
            String isVinculo = XMLUtils.getAttributeAsString(serieElem, "ISVINCULO");
            String isTemp = XMLUtils.getAttributeAsString(serieElem, "ISTEMP");
            String entityName = null;
            StringBuffer strWhere = new StringBuffer();
            Collection<Object> params = new ArrayList();
            if (!"S".equals(isTemp)) {
                entityName = "SerieMateriaPrima";
                strWhere.append("this.IDIPROC = ? AND this.NUAPO = ? AND this.CODPRODMP = ?");
                params.add(idIproc);
                params.add(nuApo);
                params.add(codProdMP);
            } else {
                entityName = "SerieMateriaPrimaTemporario";
                strWhere.append("this.IDIPROC = ? AND this.CODPRODMP = ?");
                params.add(idIproc);
                params.add(codProdMP);
            }

            DynamicVO serieVO = (DynamicVO)dwfEntityFacade.getDefaultValueObjectInstance(entityName);
            serieVO.setProperty("CODPRODMP", codProdMP);
            serieVO.setProperty("SERIEMP", serieMP);
            if (!"S".equals(isTemp)) {
                serieVO.setProperty("NUAPO", nuApo);
            }

            serieVO.setProperty("IDIPROC", idIproc);
            if ("S".equals(isVinculo)) {
                serieVO.setProperty("CODPRODPA", codProdPA);
                serieVO.setProperty("SERIEPA", seriePA);
            }

            serieVO.setProperty("LIBERADO", "N");
            this.persistSerieMP(serieVO);
            Collection<DynamicVO> mpVO = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper(entityName, strWhere.toString(), params.toArray()));
            Element el = new Element("response");
            XMLUtils.addAttributeElement(el, "value", mpVO.size());
            serviceCtx.getBodyElement().addContent(el);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    private void persistSerieMP(DynamicVO serieVO) throws Exception {
        JdbcWrapper jdbc = EntityFacadeFactory.getDWFFacade().getJdbcWrapper();
        NativeSql sqlInsSerieMP = null;
        NativeSql sqlVerificaSerieMP = null;

        try {
            sqlInsSerieMP = new NativeSql(jdbc);
            sqlVerificaSerieMP = new NativeSql(jdbc);
            boolean isTemporario = serieVO.getValueObjectID().contains("SerieMateriaPrimaTemporario");
            if (isTemporario) {
                sqlInsSerieMP.appendSql("INSERT INTO TPRSERMP_TEMP (CODPRODMP, SERIEMP, IDIPROC, CODPRODPA, SERIEPA, LIBERADO) ");
                sqlInsSerieMP.appendSql("VALUES(:CODPRODMP, :SERIEMP, :IDIPROC, :CODPRODPA, :SERIEPA, :LIBERADO)");
            } else {
                sqlInsSerieMP.appendSql("INSERT INTO TPRSERMP (CODPRODMP, SERIEMP, NUAPO, IDIPROC, CODPRODPA, SERIEPA, LIBERADO) ");
                sqlInsSerieMP.appendSql("VALUES(:CODPRODMP, :SERIEMP, :NUAPO, :IDIPROC, :CODPRODPA, :SERIEPA, :LIBERADO)");
            }

            sqlInsSerieMP.setReuseStatements(true);
            sqlVerificaSerieMP.appendSql("SELECT SERIEMP AS SERIEMP ");
            sqlVerificaSerieMP.appendSql("FROM TPRSERMP ");
            sqlVerificaSerieMP.appendSql("WHERE SERIEMP = :SERIEMP ");
            sqlVerificaSerieMP.appendSql("AND CODPRODMP = :CODPRODMP ");
            sqlVerificaSerieMP.appendSql("AND IDIPROC =  :IDIPROC ");
            sqlVerificaSerieMP.setNamedParameter("SERIEMP", serieVO.asString("SERIEMP"));
            sqlVerificaSerieMP.setNamedParameter("CODPRODMP", serieVO.asBigDecimal("CODPRODMP"));
            sqlVerificaSerieMP.setNamedParameter("IDIPROC", serieVO.asBigDecimal("IDIPROC"));
            ResultSet verificaSerieMP = sqlVerificaSerieMP.executeQuery();

            while(verificaSerieMP.next()) {
                if (verificaSerieMP.getString("SERIEMP").equals(serieVO.asString("SERIEMP"))) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00337", new Exception(String.format("Série [%s] já cadastrado.", serieVO.asString("SERIEMP"))));
                }
            }

            sqlInsSerieMP.setNamedParameter("CODPRODMP", serieVO.asBigDecimal("CODPRODMP"));
            sqlInsSerieMP.setNamedParameter("SERIEMP", serieVO.asString("SERIEMP"));
            if (!isTemporario) {
                sqlInsSerieMP.setNamedParameter("NUAPO", serieVO.asBigDecimal("NUAPO"));
            }

            sqlInsSerieMP.setNamedParameter("IDIPROC", serieVO.asBigDecimal("IDIPROC"));
            sqlInsSerieMP.setNamedParameter("CODPRODPA", serieVO.asBigDecimal("CODPRODPA"));
            sqlInsSerieMP.setNamedParameter("SERIEPA", serieVO.asString("SERIEPA"));
            sqlInsSerieMP.setNamedParameter("LIBERADO", serieVO.asString("LIBERADO"));
            sqlInsSerieMP.executeUpdate();
        } finally {
            NativeSql.releaseResources(sqlInsSerieMP);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void excluirNroSerie(ServiceContext serviceCtx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            hnd.setFindersMaxRows(-1);
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            Element serieElem = XMLUtils.getRequiredChild(serviceCtx.getRequestBody(), "SERIE");
            BigDecimal codProdPA = XMLUtils.getAttributeAsBigDecimal(serieElem, "CODPRODPA");
            String seriePA = XMLUtils.getAttributeAsString(serieElem, "SERIEPA");
            BigDecimal codProdMP = XMLUtils.getAttributeAsBigDecimal(serieElem, "CODPRODMP");
            String serieMP = XMLUtils.getContentAsString(serieElem);
            BigDecimal nuApo = XMLUtils.getAttributeAsBigDecimal(serieElem, "NUAPO");
            BigDecimal idIproc = XMLUtils.getAttributeAsBigDecimal(serieElem, "IDIPROC");
            String isVinculo = XMLUtils.getAttributeAsString(serieElem, "ISVINCULO");
            String isTemp = XMLUtils.getAttributeAsString(serieElem, "ISTEMP");
            String entityName = null;
            if (!"S".equals(isTemp)) {
                entityName = "SerieMateriaPrima";
            } else {
                entityName = "SerieMateriaPrimaTemporario";
            }

            StringBuffer strWhere = new StringBuffer();
            Collection<Object> params = new ArrayList();
            if ("S".equals(isVinculo)) {
                if (!"S".equals(isTemp)) {
                    if (StringUtils.getEmptyAsNull(serieMP) == null) {
                        strWhere.append("this.IDIPROC = ? AND this.CODPRODPA = ? AND this.SERIEPA = ? AND this.NUAPO = ? AND this.CODPRODMP = ? AND this.LIBERADO = 'N' ");
                        params.add(idIproc);
                        params.add(codProdPA);
                        params.add(seriePA);
                        params.add(nuApo);
                        params.add(codProdMP);
                    } else {
                        strWhere.append("this.IDIPROC = ? AND this.CODPRODPA = ? AND this.SERIEPA = ? AND this.NUAPO = ? AND this.CODPRODMP = ? AND this.SERIEMP = ? AND this.LIBERADO = 'N' ");
                        params.add(idIproc);
                        params.add(codProdPA);
                        params.add(seriePA);
                        params.add(nuApo);
                        params.add(codProdMP);
                        params.add(serieMP);
                    }
                } else if (StringUtils.getEmptyAsNull(serieMP) == null) {
                    strWhere.append("this.IDIPROC = ? AND this.CODPRODPA = ? AND this.SERIEPA = ? AND this.CODPRODMP = ? AND this.LIBERADO = 'N'");
                    params.add(idIproc);
                    params.add(codProdPA);
                    params.add(seriePA);
                    params.add(codProdMP);
                } else {
                    strWhere.append("this.IDIPROC = ? AND this.CODPRODPA = ? AND this.SERIEPA = ? AND this.CODPRODMP = ? AND this.SERIEMP = ? AND this.LIBERADO = 'N'");
                    params.add(idIproc);
                    params.add(codProdPA);
                    params.add(seriePA);
                    params.add(codProdMP);
                    params.add(serieMP);
                }
            } else if (!"S".equals(isTemp)) {
                if (StringUtils.getEmptyAsNull(serieMP) == null) {
                    strWhere.append("this.IDIPROC = ? AND this.NUAPO = ? AND this.CODPRODMP = ? AND this.LIBERADO = 'N' ");
                    params.add(idIproc);
                    params.add(nuApo);
                    params.add(codProdMP);
                } else {
                    strWhere.append("this.IDIPROC = ? AND this.NUAPO = ? AND this.CODPRODMP = ? AND this.SERIEMP = ? AND this.LIBERADO = 'N' ");
                    params.add(idIproc);
                    params.add(nuApo);
                    params.add(codProdMP);
                    params.add(serieMP);
                }
            } else if (StringUtils.getEmptyAsNull(serieMP) == null) {
                strWhere.append("this.IDIPROC = ? AND this.CODPRODMP = ? AND this.LIBERADO = 'N' ");
                params.add(idIproc);
                params.add(codProdMP);
            } else {
                strWhere.append("this.IDIPROC = ? AND this.CODPRODMP = ? AND this.SERIEMP = ? AND this.LIBERADO = 'N' ");
                params.add(idIproc);
                params.add(codProdMP);
                params.add(serieMP);
            }

            dwfEntityFacade.removeByCriteria(new FinderWrapper(entityName, strWhere.toString(), params.toArray()));
            StringBuffer str = new StringBuffer();
            Collection<Object> param = new ArrayList();
            if (!"S".equals(isTemp)) {
                str.append(" this.IDIPROC = ? AND this.NUAPO = ? AND this.CODPRODMP = ? ");
                param.add(idIproc);
                param.add(nuApo);
                param.add(codProdMP);
            } else {
                str.append(" this.IDIPROC = ? AND this.CODPRODMP = ? ");
                param.add(idIproc);
                param.add(codProdMP);
            }

            Collection<DynamicVO> mpVO = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper(entityName, str.toString(), param.toArray()));
            Element el = new Element("response");
            XMLUtils.addAttributeElement(el, "value", mpVO.size());
            serviceCtx.getBodyElement().addContent(el);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    private void validaQtdSeriesPAApontamento(JdbcWrapper jdbc, BigDecimal idiatv, BigDecimal idiproc, BigDecimal idefx) throws Exception {
        NativeSql sql = new NativeSql(jdbc, this.getClass(), "OperacaoProducao_validaQtdSeriesPAApontamento.sql");
        sql.setNamedParameter("IDIPROC", idiproc);
        sql.setNamedParameter("IDIATV", idiatv);
        sql.setNamedParameter("IDEFX", idefx);
        ResultSet result = sql.executeQuery();
        if (result.next() && !"S".equals(result.getString("VALCBGLOBAL")) && !NumeroSerieGlobalHelper.usaSerieGlobal()) {
            if (result.getInt("SERIESPA") < result.getInt("SOMAQTDAPONTADA") && "E".equals(result.getString("TIPCONTEST"))) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00245", new Exception("Quantidade de séries PA não pode ser menor do que a quantidade de produto apontada."));
            }

            if (result.getInt("QTDPERDA") != result.getInt("SERIES_PERDA") && "E".equals(result.getString("TIPCONTEST"))) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00244", new Exception("Quantidade de perda apontada diferente com a quantidade de séries PA de perda."));
            }
        }

        result.close();
    }

    private void validaQtdSeriesMPApontamento(JdbcWrapper jdbc, BigDecimal nuApo, BigDecimal idiproc) throws Exception {
        NativeSql sql = new NativeSql(jdbc, this.getClass(), "OperacaoProducao_validaQtdSeriesMPApontamento.sql");
        sql.setNamedParameter("NUAPO", nuApo);
        ResultSet result = sql.executeQuery();

        while(result.next()) {
            if (!"S".equals(result.getString("VALCBGLOBAL")) && !NumeroSerieGlobalHelper.usaSerieGlobal() && result.getInt("SERIESMP") < result.getInt("QTD")) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00246", new Exception(String.format("Quantidade de séries MP não pode ser menor do que a quantidade apontada da matéria-prima: %s - '%s'.", result.getString("CODPRODMP"), result.getString("DESCRPROD"))));
            }
        }

        result.close();
    }

    private void buildSerieMPApontamentoTotem(BigDecimal idiproc, BigDecimal nuapo) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();

        for(DynamicVO vo : dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("SerieMateriaPrimaTemporario", " this.IDIPROC = ? ", new Object[]{idiproc}))) {
            DynamicVO serieVO = (DynamicVO)dwfEntityFacade.getDefaultValueObjectInstance("SerieMateriaPrima");
            serieVO.setProperty("CODPRODMP", vo.asBigDecimal("CODPRODMP"));
            serieVO.setProperty("SERIEMP", vo.asString("SERIEMP"));
            serieVO.setProperty("CODPRODPA", vo.asBigDecimal("CODPRODPA"));
            serieVO.setProperty("SERIEPA", vo.asString("SERIEPA"));
            serieVO.setProperty("NUAPO", nuapo);
            serieVO.setProperty("IDIPROC", idiproc);
            serieVO.setProperty("LIBERADO", "N");
            dwfEntityFacade.createEntity("SerieMateriaPrima", (EntityVO)serieVO);
        }

        dwfEntityFacade.removeByCriteria(new FinderWrapper("SerieMateriaPrimaTemporario", "this.IDIPROC = ?", new Object[]{idiproc}));
    }

    private boolean isPAControladoPorSerie(JdbcWrapper jdbc, BigDecimal idiproc) throws Exception {
        NativeSql sqlIsPASErie = new NativeSql(jdbc);
        sqlIsPASErie.appendSql("SELECT PRO.TIPCONTEST, ");
        sqlIsPASErie.appendSql("\t   PRO.VALCBGLOBAL ");
        sqlIsPASErie.appendSql("\tFROM TPRIPA IPA INNER JOIN TGFPRO PRO ON (IPA.CODPRODPA = PRO.CODPROD) ");
        sqlIsPASErie.appendSql("WHERE IPA.IDIPROC = :IDIPROC ");
        sqlIsPASErie.setNamedParameter("IDIPROC", idiproc);
        ResultSet result = sqlIsPASErie.executeQuery();
        boolean isPASerie = false;
        if (result.next() && !"S".equals(result.getString("VALCBGLOBAL")) && "E".equals(result.getString("TIPCONTEST"))) {
            isPASerie = true;
        }

        result.close();
        return isPASerie;
    }

    private Pair<Integer, Boolean> verificaQtdSeriesMPsemVinculoPerda(JdbcWrapper jdbc, BigDecimal idiproc, BigDecimal idefx, boolean isTemp) throws Exception {
        NativeSql sql = new NativeSql(jdbc, this.getClass(), "OperacaoProducao_verificarQtdSeriesMPsemVinculoPerda.sql");
        sql.setNamedParameter("IDIPROC", idiproc);
        sql.setNamedParameter("IDEFX", idefx);
        int qtdSeriesMPSemVinculo = 0;
        ResultSet result = sql.executeQuery();
        boolean showPopUpLiberarSeriesMP = false;
        if (result.next()) {
            if (result.getInt("QTDPERDA") > 0 && result.getInt("SERIESMP_SEM_VINCULO") > 0) {
                showPopUpLiberarSeriesMP = true;
            }

            if (isTemp) {
                if (result.getInt("SERIESMP_SEM_VINCULO_TEMP") > 0) {
                    qtdSeriesMPSemVinculo = result.getInt("SERIESMP_SEM_VINCULO_TEMP");
                }
            } else if (result.getInt("SERIESMP_SEM_VINCULO") > 0) {
                qtdSeriesMPSemVinculo = result.getInt("SERIESMP_SEM_VINCULO");
            }
        }

        result.close();
        return new Pair(qtdSeriesMPSemVinculo, showPopUpLiberarSeriesMP);
    }

    private Element getMateriasPrimasSemVinculo(BigDecimal idefx, BigDecimal idiproc, BigDecimal nuapo, JdbcWrapper jdbc, boolean subProduto) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        Collection<DynamicVO> operacoesEstoqueList = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("OperacoesEstoque", " this.IDEFX = ? ", new Object[]{idefx}));
        Collection<GeradorNotasOperacoesEstoqueHelper.ResumoPA> listaResumoPA = null;

        for(DynamicVO operacaoEstoqueVO : operacoesEstoqueList) {
            DynamicVO topVO = operacaoEstoqueVO.asDymamicVO("TipoOperacao");
            DynamicVO modeloNotaVO = operacaoEstoqueVO.asDymamicVO("CabecalhoNota");
            DynamicVO topModeloNotaVO = modeloNotaVO.asDymamicVO("TipoOperacao");
            OperacoesEstoqueAtividade opEstAtv = new OperacoesEstoqueAtividade(idiproc, idefx, jdbc);
            if ("SP".equals(operacaoEstoqueVO.asString("TIPOITENS"))) {
                if (topVO != null && "F".equals(topVO.asString("TIPMOV"))) {
                    listaResumoPA = opEstAtv.getListaResumoPA(idiproc, idefx, nuapo, operacaoEstoqueVO, subProduto);
                    break;
                }

                if (topModeloNotaVO != null && "F".equals(topModeloNotaVO.asString("TIPMOV"))) {
                    listaResumoPA = opEstAtv.getListaResumoPA(idiproc, idefx, nuapo, operacaoEstoqueVO, subProduto);
                    break;
                }
            }

            if (topVO != null && "F".equals(topVO.asString("TIPMOV"))) {
                listaResumoPA = opEstAtv.getListaResumoPA(idiproc, idefx, nuapo, operacaoEstoqueVO, subProduto);
                break;
            }

            if (topModeloNotaVO != null && "F".equals(topModeloNotaVO.asString("TIPMOV"))) {
                listaResumoPA = opEstAtv.getListaResumoPA(idiproc, idefx, nuapo, operacaoEstoqueVO, subProduto);
                break;
            }
        }

        Element allItem = new Element("ALLMP");
        Set<BigDecimal> setCodProdMP = new HashSet();

        for(DynamicVO mpVO : dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("SerieMateriaPrima", " this.IDIPROC = ? AND this.CODPRODPA IS NULL AND this.LIBERADO = 'N'", new Object[]{idiproc}))) {
            for(OperacoesEstoqueAtividade.MPBean mpBean : ((GeradorNotasOperacoesEstoqueHelper.ResumoPA)listaResumoPA.iterator().next()).getMateriais()) {
                if (setCodProdMP.contains(mpVO.asBigDecimal("CODPRODMP"))) {
                    break;
                }

                if (mpVO.asBigDecimal("CODPRODMP").compareTo(mpBean.produto.getCodProd()) == 0) {
                    setCodProdMP.add(mpVO.asBigDecimal("CODPRODMP"));
                    Element item = new Element("MP");
                    XMLUtils.addAttributeElement(item, "CODPRODMP", mpBean.produto.getCodProd());
                    XMLUtils.addAttributeElement(item, "QTD", mpBean.qtdmistura);
                    allItem.addContent(item);
                }
            }
        }

        return allItem;
    }

    public void incluirOPApontamentoConjunta(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal idiproc = requestBody.get("IDIPROC").getAsBigDecimal();
            BigDecimal idIcop = requestBody.get("IDICOP").getAsBigDecimal();
            JsonArray allOpJson = new JsonArray();
            JapeWrapper iCopDAO = JapeFactory.dao("InstanciaCoProdutos");
            if (idiproc.intValue() == 0) {
                for(DynamicVO iCopVO : iCopDAO.find("this.IDICOP = ?", new Object[]{idIcop})) {
                    idiproc = iCopVO.asBigDecimal("IDIPROC");
                    allOpJson.add(this.buildJsonOrdemProducao(jdbc, iCopVO.asBigDecimal("IDIPROC"), idIcop, true));
                }
            } else {
                allOpJson.add(this.buildJsonOrdemProducao(jdbc, idiproc, idIcop, false));
            }

            JsonObject response = new JsonObject();
            response.add("allOrdens", allOpJson);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private JsonObject buildJsonOrdemProducao(JdbcWrapper jdbc, BigDecimal idIproc, BigDecimal idIcop, boolean isCoProduto) throws Exception {
        EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
        JsonArray listOpJson = new JsonArray();
        JsonArray listDescAtvJson = new JsonArray();
        JsonArray listMpJsonNew = new JsonArray();
        Collection<DynamicVO> instanciaAtividadeVO = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("InstanciaAtividade", "this.IDIPROC = ? AND this.DHFINAL IS NULL", new Object[]{idIproc}));
        OperacaoProducaoHelper operHelper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);

        for(DynamicVO instanciaAtvVO : instanciaAtividadeVO) {
            DynamicVO atividadeVO = instanciaAtvVO.asDymamicVO("Atividade");
            DynamicVO cabecalhoInstanciaVO = instanciaAtvVO.asDymamicVO("CabecalhoInstanciaProcesso");
            DynamicVO elementoFluxoVO = atividadeVO.asDymamicVO("ElementoFluxo");
            DynamicVO processoVO = cabecalhoInstanciaVO.asDymamicVO("ProcessoProdutivo");
            if (!operHelper.validaExecutanteAtividade(instanciaAtvVO.asBigDecimal("IDIATV"))) {
                JsonObject objJson = new JsonObject();
                objJson.addProperty("OP_NOT_EXECUTE", "S");
                objJson.addProperty("DESCRICAO", elementoFluxoVO.asString("DESCRICAO"));
                listOpJson.add(objJson);
            } else {
                String tipoApontamentoMateriaPrima = atividadeVO.asString("APONTAMP");
                String permiteParcial = atividadeVO.asString("PERMITEPARCIAL");
                BigDecimal idefx = elementoFluxoVO.asBigDecimal("IDEFX");
                BigDecimal idproc = processoVO.asBigDecimal("IDPROC");
                Collection<DynamicVO> produtoAcabadoAProduzirVO = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ProdutoAcabadoAProduzir", "this.IDIPROC = ? ", new Object[]{idIproc}));
                ApontamentoHelper apontHelper = new ApontamentoHelper(jdbc);
                NativeSql quelastDescAtv = new NativeSql(jdbc);
                quelastDescAtv.loadSql(this.getClass(), "ApontamentoConjunta_atividadeEmExecucao.sql");
                quelastDescAtv.setReuseStatements(true);

                for(DynamicVO paProduzirVO : produtoAcabadoAProduzirVO) {
                    BigDecimal codProdPA = paProduzirVO.asBigDecimal("CODPRODPA");
                    String controlePA = ComercialUtils.trimControleEstoque(paProduzirVO.asString("CONTROLEPA"));
                    DynamicVO produtoVO = paProduzirVO.asDymamicVO("Produto");
                    int decQtd = produtoVO.asBigDecimal("DECQTD") == null ? 2 : produtoVO.asInt("DECQTD");
                    BigDecimal qtdProcessamento = apontHelper.calculaQtdNovoApontamento(idIproc, atividadeVO.asBigDecimal("IDRPAOPER"), idefx, paProduzirVO.asBigDecimal("QTDPRODUZIR"), codProdPA, controlePA);
                    Boolean sugerirQtdZero = "N".equals(atividadeVO.asString("QTDBASEAPON"));
                    BigDecimal qtdNovoApontamento = BigDecimal.ZERO;
                    if (!sugerirQtdZero) {
                        qtdNovoApontamento = qtdProcessamento;
                    }

                    JsonObject objJson = new JsonObject();
                    objJson.addProperty("IDIPROC", idIproc);
                    objJson.addProperty("CODPRODPA", codProdPA);
                    objJson.addProperty("DESCRPROD", produtoVO.asString("DESCRPROD"));
                    objJson.addProperty("CONTROLEPA", controlePA);
                    objJson.addProperty("TAMLOTE", BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(paProduzirVO.asBigDecimal("QTDPRODUZIR")), decQtd));
                    objJson.addProperty("DESCRICAO", elementoFluxoVO.asString("DESCRICAO"));
                    objJson.addProperty("QTDPROCESS", BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(qtdProcessamento), decQtd));
                    objJson.addProperty("QTDAPONTADA", BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(qtdNovoApontamento), decQtd));
                    objJson.addProperty("CODVOL", produtoVO.asString("CODVOL"));
                    objJson.addProperty("CODPRC", processoVO.asBigDecimal("CODPRC"));
                    objJson.addProperty("DESCRABREV", processoVO.asString("DESCRABREV"));
                    objJson.addProperty("IDEFX", idefx);
                    objJson.addProperty("QTDPERDA", BigDecimal.ZERO);
                    objJson.addProperty("IDIATV", instanciaAtvVO.asBigDecimal("IDIATV"));
                    objJson.addProperty("TIPOMP", tipoApontamentoMateriaPrima);
                    objJson.addProperty("PERMITEPARCIAL", permiteParcial);
                    objJson.addProperty("IDPROC", idproc);
                    objJson.addProperty("DECQTD", decQtd);
                    objJson.addProperty("SITUACAO", instanciaAtvVO.asString("SITUACAO"));
                    objJson.addProperty("IDICOP", cabecalhoInstanciaVO.asBigDecimal("IDICOP"));
                    objJson.addProperty("OP_NOT_EXECUTE", "N");
                    ProdutoControle produtoPA = new ProdutoControle(codProdPA, controlePA);
                    quelastDescAtv.setNamedParameter("IDIPROC", idIproc);
                    ResultSet rs = null;
                    String lastAtvExec = "N";

                    try {
                        rs = quelastDescAtv.executeQuery();
                        if (rs.next()) {
                            if (idefx.compareTo(rs.getBigDecimal("IDEFX")) == 0) {
                                lastAtvExec = "S";
                            }

                            listMpJsonNew.addAll(apontHelper.getListMpAtvJson(idefx, idproc, idIproc, produtoPA, lastAtvExec, tipoApontamentoMateriaPrima, idIcop));
                        }
                    } finally {
                        JdbcUtils.closeResultSet(rs);
                    }

                    objJson.addProperty("LAST_ATV_EXEC", lastAtvExec);
                    JsonObject objDescAtvJson = new JsonObject();
                    objDescAtvJson.addProperty("IDIPROC", idIproc);
                    objDescAtvJson.addProperty("CODPRODPA", codProdPA);
                    objDescAtvJson.addProperty("CONTROLEPA", controlePA);
                    objDescAtvJson.addProperty("LAST_ATV_EXEC", lastAtvExec);
                    objDescAtvJson.addProperty("DATA", idefx);
                    objDescAtvJson.addProperty("VALUE", elementoFluxoVO.asString("DESCRICAO"));
                    listDescAtvJson.add(objDescAtvJson);
                    listOpJson.add(objJson);
                }
            }
        }

        JsonObject objJson = new JsonObject();
        objJson.add("ordemProducao", listOpJson);
        objJson.add("listMP", listMpJsonNew);
        objJson.add("descricaoAtv", listDescAtvJson);
        return objJson;
    }

    public void getQtdMisturaMpApontamentoConjunta(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonArray listOpJson = requestBody.getAsJsonArray("LISTOP");
            JsonArray listObjectMP = requestBody.getAsJsonArray("LISTOBJECTMP");
            JsonArray listMpJson = new JsonArray();

            for(int i = 0; i < listOpJson.size(); ++i) {
                JsonObject objOP = listOpJson.get(i).getAsJsonObject();
                BigDecimal idefx = objOP.get("IDEFX").getAsBigDecimal();
                BigDecimal idiproc = objOP.get("IDIPROC").getAsBigDecimal();
                BigDecimal codprodPA = objOP.get("CODPRODPA").getAsBigDecimal();
                String controlePA = ComercialUtils.trimControleEstoque(objOP.get("CONTROLEPA").getAsString());
                String tipoMP = objOP.get("TIPOMP") == null ? "" : objOP.get("TIPOMP").getAsString();
                int decQtd = objOP.get("DECQTD").getAsInt();
                if (!"N".equals(tipoMP)) {
                    DynamicVO produtoPAVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{codprodPA});

                    for(int j = 0; j < listObjectMP.size(); ++j) {
                        JsonObject objMP = listObjectMP.get(j).getAsJsonObject();
                        BigDecimal codProdMP = objMP.get("CODPRODMP").getAsBigDecimal();
                        String controleMP = ComercialUtils.trimControleEstoque(objMP.get("CONTROLEMP").getAsString());
                        DynamicVO produtoMPVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{codProdMP});
                        Collection<Object> params = new ArrayList();
                        StringBuffer strWhere = new StringBuffer("this.IDEFX = ? AND this.CODPRODMP = ? AND this.CODPRODPA = ? AND nullValue(this.CONTROLEMP, ' ') = ? AND nullValue(this.CONTROLEPA, ' ') = ? ");
                        params.add(idefx);
                        params.add(codProdMP);
                        params.add(codprodPA);
                        if ("L".equals(produtoMPVO.asString("TIPCONTEST"))) {
                            params.add(" ");
                        } else {
                            params.add(controleMP);
                        }

                        if ("L".equals(produtoPAVO.asString("TIPCONTEST"))) {
                            params.add(" ");
                        } else {
                            params.add(controlePA);
                        }

                        for(DynamicVO mpVO : dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ListaMateriaisAtividade", strWhere.toString(), params.toArray()))) {
                            JsonObject mpObjectJson = new JsonObject();
                            mpObjectJson.addProperty("IDIPROC", idiproc);
                            mpObjectJson.addProperty("CODPRODPA", codprodPA);
                            mpObjectJson.addProperty("CONTROLEPA", controlePA);
                            mpObjectJson.addProperty("CODPRODMP", codProdMP);
                            mpObjectJson.addProperty("CONTROLEMP", controleMP);
                            mpObjectJson.addProperty("QTDMISTURA", ProducaoUtils.getValorArredondadoPorDecQtd(codProdMP, mpVO.asBigDecimal("QTDMISTURA")));
                            listMpJson.add(mpObjectJson);
                        }
                    }
                }
            }

            JsonObject response = new JsonObject();
            response.add("listMP", listMpJson);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void incluirMPApontamentoConjunta(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonObject mpObjectJson = null;
            JsonArray listMpJsonNew = null;
            JapeWrapper iCopDAO = JapeFactory.dao("InstanciaCoProdutos");
            if (requestBody.get("CODPRODMP") == null) {
                listMpJsonNew = new JsonArray();
                ApontamentoHelper apontHelper = new ApontamentoHelper(jdbc);
                JsonObject obj = requestBody.get("OBJECTOP").getAsJsonObject();
                BigDecimal idefx = obj.get("IDEFX").getAsBigDecimal();
                BigDecimal idproc = obj.get("IDPROC").getAsBigDecimal();
                BigDecimal idiproc = obj.get("IDIPROC").getAsBigDecimal();
                String tipoApontamentoMateriaPrima = obj.get("TIPOMP").getAsString();
                BigDecimal codProdPA = obj.get("CODPRODPA").getAsBigDecimal();
                String controlePA = ComercialUtils.trimControleEstoque(obj.get("CONTROLEPA").getAsString());
                ProdutoControle produtoPA = new ProdutoControle(codProdPA, controlePA);
                DynamicVO iCopVO = iCopDAO.findOne("this.IDIPROC = ?", new Object[]{idiproc});
                listMpJsonNew.addAll(apontHelper.getListMpAtvJson(idefx, idproc, idiproc, produtoPA, "N", tipoApontamentoMateriaPrima, iCopVO.asBigDecimal("IDICOP")));
            } else {
                BigDecimal codProdMP = requestBody.get("CODPRODMP").getAsBigDecimal();
                String controleMP = requestBody.get("CONTROLEMP").getAsString();
                JsonArray arrayCODPRODPA = requestBody.get("STRCODPRODPA").getAsJsonArray();
                JsonArray arrayIDEFX = requestBody.get("STRIDEFX").getAsJsonArray();
                Collection<BigDecimal> listCODPRODPA = new ArrayList();
                Collection<BigDecimal> listIDEFX = new ArrayList();

                for(JsonElement obj : arrayCODPRODPA) {
                    listCODPRODPA.add(obj.getAsBigDecimal());
                }

                for(JsonElement obj : arrayIDEFX) {
                    listIDEFX.add(obj.getAsBigDecimal());
                }

                String strWhere = "this.CODPROD IN (SELECT DISTINCT LMP.CODPRODMP  FROM TPRLMP LMP INNER JOIN TPRATV ATV ON (ATV.IDEFX = LMP.IDEFX)  WHERE $IN{LMP.CODPRODPA}IN$ inCollection[0]  AND $IN{ATV.IDEFX}IN$ inCollection[1]  AND ATV.APONTAMP <> 'N'  AND LMP.CODPRODMP = ? AND (LMP.CONTROLEMP IS NULL OR LMP.CONTROLEMP = ?))";

                for(DynamicVO mpVO : dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ProdutoMateriaPrima", strWhere, new Object[]{listCODPRODPA, listIDEFX, codProdMP, controleMP}))) {
                    int decQtd = mpVO.asBigDecimal("DECQTD") == null ? 2 : mpVO.asBigDecimal("DECQTD").intValue();
                    mpObjectJson = new JsonObject();
                    mpObjectJson.addProperty("CODPRODMP", mpVO.asBigDecimal("CODPROD"));
                    mpObjectJson.addProperty("DESCRPROD", mpVO.asString("DESCRPROD"));
                    mpObjectJson.addProperty("CONTROLEMP", ComercialUtils.trimControleEstoque(controleMP));
                    mpObjectJson.addProperty("REFERENCIA", mpVO.asString("REFERENCIA"));
                    mpObjectJson.addProperty("QTD", BigDecimal.ZERO);
                    mpObjectJson.addProperty("CODVOL", mpVO.asString("CODVOL"));
                    mpObjectJson.addProperty("DECQTD", decQtd);
                }
            }

            JsonObject response = new JsonObject();
            response.add("objectMP", mpObjectJson);
            response.add("listMP", listMpJsonNew);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void confirmarApontamentoConjunta(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonArray listOpJson = requestBody.getAsJsonArray("LISTOP");
            JsonArray listMpResultJson = requestBody.getAsJsonArray("LISTMPRESULT");
            JsonArray listObjectMP = requestBody.getAsJsonArray("LISTOBJECTMP");
            boolean aceitarQtdMaior = requestBody.get("ACEITARQTDMAIOR").getAsBoolean();
            boolean clientEventRespotaUltimoApontamento = requestBody.get("RESPOSTA_ULTIMO_APONTAMENTO").getAsBoolean();
            boolean aceitaProporcaoInvalidaMPAlternativa = requestBody.get("ACEITA_PROPORCAO_INVALIDA_MPALTERNATIVA").getAsBoolean();
            boolean aceitaWCIndisponivel = requestBody.get("ACEITA_WC_INDISPONIVEL").getAsBoolean();
            boolean processaPerdaUltimoApontamento = requestBody.get("PROCESSA_PERDA_ULTIMO_APONTAMENTO").getAsBoolean();
            JapeSession.putProperty("br.com.sankhya.mgeprod.is.ultimo.apontamento", new Boolean(clientEventRespotaUltimoApontamento) || aceitarQtdMaior);
            BigDecimal codUsu = ((AuthenticationInfo)ctx.getAutentication()).getUserID();
            OperacaoProducaoHelper operHelper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
            ApontamentoHelper apontHelper = new ApontamentoHelper(jdbc);
            StringBuffer strNuApoBuilded = new StringBuffer();
            JsonObject response = new JsonObject();
            JsonArray listApontamentoJson = new JsonArray();
            StringBuffer strMsgQtdMaior = new StringBuffer();
            StringBuffer strMsgUltimoApont = new StringBuffer();
            boolean isUltimoApontamento = false;
            ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
            JapeSession.putProperty("br.com.sankhya.mgeprod.confirmar.apontamento.producao.conjunta", true);

            for(int i = 0; i < listOpJson.size(); ++i) {
                JsonObject objOP = listOpJson.get(i).getAsJsonObject();
                BigDecimal idefx = objOP.get("IDEFX").getAsBigDecimal();
                BigDecimal idiatv = objOP.get("IDIATV").getAsBigDecimal();
                BigDecimal idiproc = objOP.get("IDIPROC").getAsBigDecimal();
                BigDecimal codprodPA = objOP.get("CODPRODPA").getAsBigDecimal();
                String controlePA = ComercialUtils.trimControleEstoque(objOP.get("CONTROLEPA").getAsString());
                BigDecimal qtdApontadaPA = objOP.get("QTDAPONTADA") == null ? BigDecimal.ZERO : objOP.get("QTDAPONTADA").getAsBigDecimal();
                BigDecimal qtdPerdaPA = objOP.get("QTDPERDA") == null ? BigDecimal.ZERO : objOP.get("QTDPERDA").getAsBigDecimal();
                String descricaoPA = objOP.get("DESCRPROD").getAsString();
                Collection<OperacoesEstoqueAtividade.MPBean> listMpBean = new ArrayList();
                if (qtdApontadaPA.compareTo(BigDecimal.ZERO) == 0 && qtdPerdaPA.compareTo(BigDecimal.ZERO) == 0) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00065", new Exception("Não é possível confirmar o apontamento pois existem itens (PA) com quantidade apontada e quantidade de perda iguais a zero no mesmo apontamento."));
                }

                if (isUltimoApontamento && !clientEventRespotaUltimoApontamento) {
                    strMsgUltimoApont.append(" > OP: " + idiproc + " / " + codprodPA + " - " + descricaoPA + " <br>");
                } else {
                    for(int k = 0; k < listObjectMP.size(); ++k) {
                        JsonObject obj = listObjectMP.get(k).getAsJsonObject();
                        ProdutoControle produtoMP = new ProdutoControle(obj.get("CODPRODMP").getAsBigDecimal(), StringUtils.getNullAsEmpty(obj.get("CONTROLEMP").getAsString()));

                        for(int j = 0; j < listMpResultJson.size(); ++j) {
                            JsonObject objMP = listMpResultJson.get(j).getAsJsonObject();
                            BigDecimal idiprocResult = objMP.get("IDIPROC").getAsBigDecimal();
                            BigDecimal codprodResult = objMP.get("CODPRODPA").getAsBigDecimal();
                            String controleResult = ComercialUtils.trimControleEstoque(objMP.get("CONTROLEPA").getAsString());
                            BigDecimal codprodMpResult = objMP.get("CODPRODMP").getAsBigDecimal();
                            String controleMpResult = ComercialUtils.trimControleEstoque(objMP.get("CONTROLEMP").getAsString());
                            String codVol = objMP.get("CODVOL").getAsString();
                            BigDecimal qtdApontadaResult = BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(objMP.get("QTDAPONTADA").getAsBigDecimal()), objMP.get("DECQTD").getAsInt());
                            if (idiproc.compareTo(idiprocResult) == 0 && codprodPA.compareTo(codprodResult) == 0 && controlePA.equals(controleResult) && produtoMP.getCodProd().compareTo(codprodMpResult) == 0 && produtoMP.getControle().equals(controleMpResult)) {
                                OperacoesEstoqueAtividade.MPBean mpBean = new OperacoesEstoqueAtividade.MPBean(produtoMP, codVol, qtdApontadaResult, (BigDecimal)null, (String)null);
                                listMpBean.add(mpBean);
                            }
                        }
                    }

                    JapeSession.putProperty("br.com.sankhya.mgeprod.aceita.wc.indisponivel", aceitaWCIndisponivel);
                    DynamicVO entityInstancia = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idiatv});
                    if (entityInstancia.asTimestamp("DHINICIO") == null) {
                        operHelper.iniciarInstanciaAtividade(idiatv, jdbc);
                    }

                    ProdutoControle produtoPA = new ProdutoControle(codprodPA, controlePA);
                    BigDecimal nuapo = null;

                    try {
                        nuapo = apontHelper.buildApontamentoConjunta(idiatv, idiproc, codUsu, produtoPA, listMpBean, qtdApontadaPA, qtdPerdaPA);
                    } catch (Exception e) {
                        throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00248", new Exception("Erro ao apontar OP/PA: [" + idiproc + " / " + codprodPA + "]. <br>-> " + e.getMessage()));
                    }

                    JsonObject objApontJson = new JsonObject();
                    objApontJson.addProperty("NUAPO", nuapo);
                    objApontJson.addProperty("IDIPROC", idiproc);
                    objApontJson.addProperty("CODPRODPA", codprodPA);
                    objApontJson.addProperty("CONTROLEPA", controlePA);
                    listApontamentoJson.add(objApontJson);
                    if (strNuApoBuilded.length() > 0) {
                        strNuApoBuilded.append(", ").append(nuapo);
                    } else {
                        strNuApoBuilded.append(nuapo);
                    }

                    JapeWrapper cabecalhoApontamentoDAO = JapeFactory.dao("CabecalhoApontamento");
                    DynamicVO cabecalhoApontamentoVO = cabecalhoApontamentoDAO.findByPK(new Object[]{nuapo});
                    Collection<DynamicVO> apontamentosPA = cabecalhoApontamentoVO.asCollection("ApontamentoPA");
                    boolean temQtdApontadaIgualMaiorQtdProduzir = this.validaQtdApontadaIgualMaiorQtdProduzir(jdbc, idiatv, idiproc, idefx, apontamentosPA);
                    boolean atvGeraNotaProducao = this.atividadeGeraNotaProducao(dwfEntityFacade, idiatv);
                    boolean permitePerda100Porcento = apontamentoHelper.permiteApontamentoComPerdaTotal(cabecalhoApontamentoVO);
                    if (atvGeraNotaProducao || permitePerda100Porcento) {
                        boolean temQtdApontadaMenorQtdProduzir = this.validaQtdApontadaMenorQtdProduzir(jdbc, idiatv, idiproc, idefx);
                        if (temQtdApontadaMenorQtdProduzir && !clientEventRespotaUltimoApontamento && !aceitarQtdMaior && !processaPerdaUltimoApontamento) {
                            if (strMsgUltimoApont.length() == 0) {
                                isUltimoApontamento = true;
                                strMsgUltimoApont.append("<b>");
                                strMsgUltimoApont.append(" > OP: " + idiproc + " / " + codprodPA + " - " + descricaoPA + " <br>");
                            }
                            continue;
                        }
                    }

                    try {
                        if (clientEventRespotaUltimoApontamento || temQtdApontadaIgualMaiorQtdProduzir || clientEventRespotaUltimoApontamento && !processaPerdaUltimoApontamento) {
                            this.processarPerdaUltimoApontamento(dwfEntityFacade, jdbc, idiatv, idiproc, nuapo, cabecalhoApontamentoVO);
                            JapeSession.putProperty("br.com.sankhya.apontamento.producao.ultimo.apontamento", true);
                        }

                        apontamentoHelper.confirmarApontamento(nuapo, aceitarQtdMaior, aceitaProporcaoInvalidaMPAlternativa);
                        OperacoesEstoqueHelper operacoesEstoqueHelper = new OperacoesEstoqueHelper(jdbc);
                        operacoesEstoqueHelper.executarOperacoesEstoqueAtividade(idiatv, nuapo, MomentoOperacaoEstoque.APONTAMENTO_PA);
                    } catch (ApontamentoInvalidoException e) {
                        if (strMsgQtdMaior.length() == 0) {
                            strMsgQtdMaior.append("<b>");
                        }

                        strMsgQtdMaior.append(" > OP: " + idiproc + " / " + e.getMessage() + " <br>");
                    } catch (ProporcaoApontamentoInvalidaException var56) {
                        ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.operacaoproducao.mpalt.proporcao.apontamento.invalida", new Element("event"));
                        throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00250", new ServiceCanceledException());
                    }

                    if (clientEventRespotaUltimoApontamento && atvGeraNotaProducao) {
                        apontamentoHelper.finalizarProducaoProdutoAcabadosApontamento(idiproc, nuapo);
                    }
                }
            }

            if (strMsgQtdMaior.length() > 0) {
                strMsgQtdMaior.append("</b>");
                Element elemMsgQtdMaior = new Element("msg_qtd_maior");
                elemMsgQtdMaior.setAttribute("values", strMsgQtdMaior.toString());
                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.apontamentoconjunta.msgqtdmaior", elemMsgQtdMaior);
                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00250", new ServiceCanceledException());
            }

            if (strMsgUltimoApont.length() > 0) {
                strMsgUltimoApont.append("</b>");
                Element elemMsgUltimoApont = new Element("msg_ultimo_apont");
                elemMsgUltimoApont.setAttribute("values", strMsgUltimoApont.toString());
                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.ultimo", elemMsgUltimoApont);
                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00532", new ServiceCanceledException());
            }

            StringBuffer strMsgApontBuilded = new StringBuffer("Nros dos apontamentos: ");
            strMsgApontBuilded.append(strNuApoBuilded);
            response.addProperty("MSG_APONT_BUILDED", strMsgApontBuilded.toString());
            response.add("listApontamento", listApontamentoJson);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void transferirParcialApontamentoConjunta(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonArray objectsTransfer = requestBody.get("LISTOBJECTTRANSFER").getAsJsonArray();
            JsonArray apontamentos = requestBody.get("LISTAPONTAMENTO").getAsJsonArray();
            ControleAtividadeHelper controlHelper = new ControleAtividadeHelper(jdbc);
            ApontamentoHelper apontHelper = new ApontamentoHelper(jdbc);
            JsonArray objectsTransferAtualiz = new JsonArray();

            for(int i = 0; i < objectsTransfer.size(); ++i) {
                JsonObject objTrans = objectsTransfer.get(i).getAsJsonObject();
                BigDecimal idIproc = objTrans.get("IDIPROC").getAsBigDecimal();
                BigDecimal idEfx = objTrans.get("IDEFX").getAsBigDecimal();
                BigDecimal idIatv = objTrans.get("IDIATV").getAsBigDecimal();
                BigDecimal quantidade = objTrans.get("QTDTRANSFERIR") == null ? BigDecimal.ZERO : objTrans.get("QTDTRANSFERIR").getAsBigDecimal();
                BigDecimal qtdPerda = objTrans.get("QTDPERDA") == null ? BigDecimal.ZERO : objTrans.get("QTDPERDA").getAsBigDecimal();
                BigDecimal codprodPA = objTrans.get("CODPRODPA").getAsBigDecimal();
                String controlePA = ComercialUtils.trimControleEstoque(objTrans.get("CONTROLEPA").getAsString());
                BigDecimal nuapo = BigDecimal.ZERO;

                for(int j = 0; j < apontamentos.size(); ++j) {
                    JsonObject objApont = apontamentos.get(j).getAsJsonObject();
                    BigDecimal idiprocApont = objApont.get("IDIPROC").getAsBigDecimal();
                    BigDecimal codprodApont = objApont.get("CODPRODPA").getAsBigDecimal();
                    String controleApont = ComercialUtils.trimControleEstoque(objApont.get("CONTROLEPA").getAsString());
                    if (idIproc.compareTo(idiprocApont) == 0 && codprodPA.compareTo(codprodApont) == 0 && controlePA.equals(controleApont)) {
                        nuapo = objApont.get("NUAPO").getAsBigDecimal();
                        break;
                    }
                }

                HashMap<String, BigDecimal> dadosRepo = new HashMap();
                dadosRepo.put("IDEFX", idEfx);
                dadosRepo.put("IDIATV", idIatv);
                dadosRepo.put("NUAPO", nuapo);
                dadosRepo.put("QTDPARCIAL", quantidade);
                dadosRepo.put("QTDPERDA", qtdPerda);
                JapeSession.putProperty("br.com.sankhya.mgeprod.movimentar.automatico.repositorio", dadosRepo);
                List<ControleRepositorioPAHelper.ProdutoPA> produtosPALst = new ArrayList();
                produtosPALst.add(new ControleRepositorioPAHelper.ProdutoPA(codprodPA, controlePA, quantidade, qtdPerda));
                JapeSession.putProperty("br.com.sankhya.mgeprod.movimentar.automatico.repositorio.pas", produtosPALst);
                controlHelper.disparaSinalTransferenciaParcial(idIatv);
                DynamicVO atividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Atividade", new Object[]{idEfx});
                BigDecimal tamLote = objTrans.get("TAMLOTE").getAsBigDecimal();
                BigDecimal qtdApontada = objTrans.get("QTDAPONTADA").getAsBigDecimal();
                int decQtd = objTrans.get("DECQTD").getAsInt();
                BigDecimal newQtdProcess = apontHelper.calculaQtdNovoApontamento(idIproc, atividadeVO.asBigDecimal("IDRPAOPER"), idEfx, tamLote, codprodPA, controlePA);
                BigDecimal qtdTransferir = qtdApontada.subtract(quantidade);
                objTrans.addProperty("QTDPROCESS", BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(tamLote.subtract(newQtdProcess)), decQtd));
                objTrans.addProperty("QTDTRANSFERIR", BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(qtdTransferir.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : qtdTransferir), decQtd));
                objTrans.addProperty("QTDAPONTADA", BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(qtdTransferir.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : qtdTransferir), decQtd));
                objectsTransferAtualiz.add(objTrans);
            }

            JsonObject response = new JsonObject();
            response.add("listTransferAtualiz", objectsTransferAtualiz);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void finalizarAtvApontamentoConjunta(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonArray listOP = requestBody.get("LISTOP").getAsJsonArray();
            BigDecimal codUsu = ((AuthenticationInfo)ctx.getAutentication()).getUserID();
            JapeSession.putProperty("br.com.sankhya.mgeprod.apontamento.user", codUsu);
            ArrayList<BigDecimal> idiatvs = new ArrayList();

            for(int i = 0; i < listOP.size(); ++i) {
                JsonObject objOP = listOP.get(i).getAsJsonObject();
                BigDecimal idiatv = objOP.get("IDIATV").getAsBigDecimal();
                BigDecimal idIproc = objOP.get("IDIPROC").getAsBigDecimal();
                BigDecimal idEfx = objOP.get("IDEFX").getAsBigDecimal();
                BigDecimal idProc = objOP.get("IDPROC").getAsBigDecimal();
                OperacaoProducaoHelper.getInstance().validaObrigatoriedadeFormularioAtividade(idIproc, idProc, idEfx, jdbc);
                idiatvs.add(idiatv);
            }

            JapeSession.putProperty("br.com.sankhya.mgeprod.redimensionar.op.pa.perda", (Object)null);
            List<LiberacaoSolicitada> liberacaoSolicitadas = new ArrayList();
            JapeSession.putProperty("br.com.sankhya.mgeprod.liberacoes.atividade.producao.conjunta", liberacaoSolicitadas);
            JapeSession.putProperty("br.com.sankhya.mgeprod.confirmar.apontamento.producao.conjunta", Boolean.TRUE);
            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();
            helper.setCodUserExecutante(codUsu);
            List<BigDecimal> listAtvFinalizadas = helper.finalizarInstanciaAtividades(idiatvs, hnd, jdbc, true);
            JsonObject response = new JsonObject();
            JsonArray opsFinalizadas = new JsonArray();

            for(JsonElement op : listOP) {
                BigDecimal idAtv = op.getAsJsonObject().get("IDIATV").getAsBigDecimal();
                if (listAtvFinalizadas.contains(idAtv)) {
                    JsonObject opFinalizada = new JsonObject();
                    PersistentLocalEntity entityInstancia = dwfEntityFacade.findEntityByPrimaryKey("InstanciaAtividade", new Object[]{idAtv});
                    DynamicVO instanciaAtividadeVO = (DynamicVO)entityInstancia.getValueObject();
                    DynamicVO ativiadeVO = instanciaAtividadeVO.asDymamicVO("Atividade");
                    DynamicVO elementoFluxoVO = ativiadeVO.asDymamicVO("ElementoFluxo");
                    opFinalizada.addProperty("DESC", elementoFluxoVO.asString("DESCRICAO"));
                    opFinalizada.addProperty("IDIPROC", op.getAsJsonObject().get("IDIPROC").getAsBigDecimal());
                    opsFinalizadas.add(opFinalizada);
                }
            }

            response.add("listAtvFinalizadas", opsFinalizadas);
            ctx.setJsonResponse(response);
            if (!liberacaoSolicitadas.isEmpty() && JapeSession.getPropertyAsBoolean("br.com.sankhya.mgeprod.finalizar.liberacao.desvio.pa", false)) {
                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.finalizar.liberacao.desvio.pa", LiberacaoAlcadaHelper.buildXMLLiberacoesPendentes(liberacaoSolicitadas));
            }
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void pararInstanciaAtividades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element instanciasElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "instancias");
            String tipoParada = XMLUtils.getAttributeAsString(instanciasElem, "tipoParada");
            BigDecimal codUserExec = AuthenticationInfo.getCurrent().getUserID();
            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();

            for(Element instanciaElem : instanciasElem.getChildren("instancia")) {
                BigDecimal idIatv = XMLUtils.getRequiredContentAsBigDecimal(XMLUtils.getRequiredChild(instanciaElem, "IDIATV"));
                BigDecimal codMtp = XMLUtils.getContentAsBigDecimal(XMLUtils.getRequiredChild(instanciaElem, "CODMTP"));
                String observacao = XMLUtils.getContentAsString(XMLUtils.getChild(instanciaElem, "OBSERVACAO"));
                if (tipoParada == null) {
                    tipoParada = XMLUtils.getContentAsString(XMLUtils.getChild(instanciaElem, "TIPO"));
                }

                DynamicVO execucao = this.getExecucaoInstanciaAtividadeAtiva(idIatv, codUserExec);
                if (execucao == null) {
                    Collection<DynamicVO> execucoesAbertas = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ExecucaoAtividade", "this.IDIATV = ? AND this.DHFINAL IS NULL", idIatv));
                    if (execucoesAbertas != null && execucoesAbertas.size() > 0) {
                        DynamicVO execucaoVO = (DynamicVO)execucoesAbertas.iterator().next();
                        execucao = this.getExecucaoInstanciaAtividadeAtiva(idIatv, execucaoVO.asBigDecimal("CODEXEC"), true);
                    }
                }

                if (execucao != null) {
                    helper.finalizarExecucaoInsanciaAtividade(execucao.asBigDecimal("IDEIATV"), TimeUtils.getNow());
                    helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, codUserExec, codUserExec, idIatv, tipoParada, codMtp, observacao);
                } else {
                    helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, codUserExec, codUserExec, idIatv, tipoParada, codMtp, observacao);
                }

                if ("T".equals(tipoParada)) {
                    helper.limparUsuarioExecutanteAtividade(idIatv);
                }
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void continuarInstanciaAtividades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element instanciasElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "instancias");
            BigDecimal codUserExec = AuthenticationInfo.getCurrent().getUserID();
            OperacaoProducaoHelper helper = OperacaoProducaoHelper.getInstance();
            Element avisosElem = new Element("avisos");

            for(Element instanciaElem : instanciasElem.getChildren("instancia")) {
                BigDecimal idIatv = XMLUtils.getRequiredContentAsBigDecimal(XMLUtils.getRequiredChild(instanciaElem, "IDIATV"));
                DynamicVO execucao = this.getExecucaoInstanciaAtividadeAtiva(idIatv, codUserExec, true);
                if (execucao == null) {
                    Collection<DynamicVO> execucoesAbertas = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ExecucaoAtividade", "this.IDIATV = ? AND this.DHFINAL IS NULL", idIatv));
                    execucao = (DynamicVO)execucoesAbertas.iterator().next();
                    if (execucao != null && StringUtils.isNotEmpty(execucao.asString("OBSERVACAO")) && "T".equals(execucao.asString("TIPO"))) {
                        DynamicVO instanciaAtividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("InstanciaAtividade", new Object[]{idIatv});
                        DynamicVO atividadeVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Atividade", new Object[]{instanciaAtividadeVO.asBigDecimalOrZero("IDEFX")});
                        DynamicVO usuarioVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Usuario", new Object[]{execucao.asBigDecimal("CODEXEC")});
                        StringBuilder sbMsg = new StringBuilder();
                        sbMsg.append(" Informações de troca de turno - ");
                        sbMsg.append("Atividade: ");
                        sbMsg.append(atividadeVO.asString("ElementoFluxo.DESCRICAO"));
                        sbMsg.append(" - Ordem: ");
                        sbMsg.append(instanciaAtividadeVO.asBigDecimal("IDIPROC")).append(" - ");
                        sbMsg.append(" Usuário: ");
                        sbMsg.append(usuarioVO.asBigDecimal("CODUSU"));
                        sbMsg.append(" ");
                        sbMsg.append(usuarioVO.asString("NOMEUSU"));
                        sbMsg.append(" - Observação: ");
                        sbMsg.append(execucao.asString("OBSERVACAO"));
                        Element avisoElem = new Element("aviso");
                        avisoElem.addContent(sbMsg.toString());
                        avisosElem.addContent(avisoElem);
                    }
                }

                if (execucao != null) {
                    helper.finalizarExecucaoInsanciaAtividade(execucao.asBigDecimal("IDEIATV"), TimeUtils.getNow());
                    helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, codUserExec, codUserExec, idIatv);
                } else {
                    helper.criarExecucaoInstanciaAtividade(TimeUtils.getNow(), (Timestamp)null, codUserExec, codUserExec, idIatv);
                }

                helper.atribuirUsuarioExecutanteAtividade(idIatv, codUserExec);
            }

            if (avisosElem != null && avisosElem.getChildren().size() > 0) {
                ctx.addClientEvent("br.com.sankhya.mgeprod.trocaturno.avisos", avisosElem);
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getAtividades(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element atividadesElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal codwcp = XMLUtils.getAttributeAsBigDecimal(atividadesElem, "CODWCP");
            JsonArray listaAtividadesJson = new JsonArray();

            for(DynamicVO atividadeVO : dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("InstanciaAtividade", "Atividade->ElementoFluxo->TIPO IN (1101, 1109, 1110) AND CabecalhoInstanciaProcesso->STATUSPROC NOT IN('C', 'S', 'AP', 'P', 'P2') AND this.CODWCP = ? AND this.DHFINAL IS NULL ", new Object[]{codwcp}))) {
                JsonObject atividadeObjectJson = new JsonObject();
                atividadeObjectJson.addProperty("CODEXEC", atividadeVO.asLong("CODEXEC"));
                atividadeObjectJson.addProperty("CODWCP", codwcp);
                atividadeObjectJson.addProperty("DHACEITE", atividadeVO.asTimestamp("DHACEITE") == null ? "" : atividadeVO.asTimestamp("DHACEITE").toString());
                atividadeObjectJson.addProperty("DHFINAL", atividadeVO.asTimestamp("DHFINAL") == null ? "" : atividadeVO.asTimestamp("DHFINAL").toString());
                atividadeObjectJson.addProperty("DHFINPREV", atividadeVO.asTimestamp("DHFINPREV") == null ? "" : atividadeVO.asTimestamp("DHFINPREV").toString());
                atividadeObjectJson.addProperty("DHINCLUSAO", atividadeVO.asTimestamp("DHINCLUSAO") == null ? "" : atividadeVO.asTimestamp("DHINCLUSAO").toString());
                atividadeObjectJson.addProperty("DHINICIO", atividadeVO.asTimestamp("DHINICIO") == null ? "" : atividadeVO.asTimestamp("DHINICIO").toString());
                atividadeObjectJson.addProperty("DHINIPREV", atividadeVO.asTimestamp("DHINIPREV") == null ? "" : atividadeVO.asTimestamp("DHINIPREV").toString());
                atividadeObjectJson.addProperty("IDEFX", atividadeVO.asLong("IDEFX"));
                atividadeObjectJson.addProperty("IDEXECWFLOW", atividadeVO.asString("IDEXECWFLOW"));
                atividadeObjectJson.addProperty("IDIATV", atividadeVO.asBigDecimal("IDIATV"));
                atividadeObjectJson.addProperty("IDIPROC", atividadeVO.asBigDecimal("IDIPROC"));
                atividadeObjectJson.addProperty("TEMPOGASTOMIN", atividadeVO.asBigDecimal("TEMPOGASTOMIN"));
                listaAtividadesJson.add(atividadeObjectJson);
            }

            JsonObject response = new JsonObject();
            response.add("listaAtividades", listaAtividadesJson);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getProdutosAcabados(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element produtosAcabadosElem = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiatv = XMLUtils.getAttributeAsBigDecimal(produtosAcabadosElem, "IDIATV");
            JsonArray listaProdutosAcabadosJson = new JsonArray();

            for(DynamicVO produtoAcabadoVO : dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ProdutoAcabadoAProduzir", "EXISTS (SELECT 1 FROM TPRIATV ATV WHERE ATV.IDIPROC = this.IDIPROC AND ATV.IDIATV = ?)", new Object[]{idiatv}))) {
                JsonObject produtoAcabadoObjectJson = new JsonObject();
                DynamicVO produtoVO = produtoAcabadoVO.asDymamicVO("Produto");
                produtoAcabadoObjectJson.addProperty("CODPRODPA", produtoAcabadoVO.asBigDecimal("CODPRODPA"));
                produtoAcabadoObjectJson.addProperty("CONCLUIDO", produtoAcabadoVO.asString("CONCLUIDO"));
                produtoAcabadoObjectJson.addProperty("CONTROLEPA", produtoAcabadoVO.asString("CONTROLEPA"));
                produtoAcabadoObjectJson.addProperty("DTFAB", produtoAcabadoVO.asTimestamp("DTFAB") == null ? "" : produtoAcabadoVO.asTimestamp("DTFAB").toString());
                produtoAcabadoObjectJson.addProperty("DTVAL", produtoAcabadoVO.asTimestamp("DTVAL") == null ? "" : produtoAcabadoVO.asTimestamp("DTVAL").toString());
                produtoAcabadoObjectJson.addProperty("IDIPROC", produtoAcabadoVO.asLong("IDIPROC"));
                produtoAcabadoObjectJson.addProperty("NROLOTE", produtoAcabadoVO.asString("NROLOTE"));
                produtoAcabadoObjectJson.addProperty("QTDPRODUZIR", produtoAcabadoVO.asBigDecimal("QTDPRODUZIR"));
                produtoAcabadoObjectJson.addProperty("REFERENCIA", produtoAcabadoVO.asString("REFERENCIA") == null ? "" : produtoAcabadoVO.asString("REFERENCIA"));
                produtoAcabadoObjectJson.addProperty("CODVOL", produtoVO.asString("CODVOL"));
                listaProdutosAcabadosJson.add(produtoAcabadoObjectJson);
            }

            JsonObject response = new JsonObject();
            response.add("listaProdutosAcabados", listaProdutosAcabadosJson);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private Element buscaSeriesMP(JdbcWrapper jdbc, BigDecimal idiproc, BigDecimal nuApo) throws Exception {
        Element elementSeriesMPs = null;
        NativeSql sql = new NativeSql(jdbc);
        sql.appendSql(" SELECT DISTINCT SERMP.CODPRODMP ");
        sql.appendSql(" ,(SELECT nullvalue(SUM(QTD),0) FROM TPRAMP WHERE CODPRODMP = SERMP.CODPRODMP AND NUAPO IN ");
        sql.appendSql("   (SELECT NUAPO FROM TPRAPO WHERE IDIATV IN (SELECT IDIATV FROM TPRIATV WHERE IDIPROC = SERMP.IDIPROC))) AS QTDMISTURA ");
        sql.appendSql(" FROM TPRSERMP SERMP INNER JOIN TGFPRO PRO ON (PRO.CODPROD = SERMP.CODPRODMP)");
        sql.appendSql(" WHERE SERMP.IDIPROC = :IDIPROC ");
        sql.appendSql(" AND SERMP.CODPRODPA IS NULL ");
        sql.appendSql(" AND SERMP.LIBERADO = 'N' ");
        sql.appendSql(" AND PRO.TIPCONTEST = 'E'");
        sql.setNamedParameter("IDIPROC", idiproc);
        sql.setNamedParameter("NUAPO", nuApo);
        ResultSet result = sql.executeQuery();

        while(result.next()) {
            if (elementSeriesMPs == null) {
                elementSeriesMPs = new Element("ALLMP");
            }

            Element item = new Element("MP");
            XMLUtils.addAttributeElement(item, "CODPRODMP", result.getBigDecimal("CODPRODMP"));
            XMLUtils.addAttributeElement(item, "QTD", result.getBigDecimal("QTDMISTURA"));
            elementSeriesMPs.addContent(item);
        }

        result.close();
        return elementSeriesMPs;
    }

    private boolean necessitaTransferenciaParcial(EntityFacade entityFacade, JdbcWrapper jdbc, BigDecimal idiproc, BigDecimal idefx, BigDecimal nuApo) throws Exception {
        DynamicVO atividadeVO = (DynamicVO)entityFacade.findEntityByPrimaryKeyAsVO("Atividade", new Object[]{idefx});
        if (!atividadeVO.asBoolean("PERMITEPARCIAL")) {
            return false;
        } else {
            NativeSql sql = new NativeSql(jdbc);
            ResultSet rset = null;

            try {
                sql = new NativeSql(jdbc, this.getClass(), "OperacaoProducao_queNecessitaTranferenciaParcial.sql");
                sql.setNamedParameter("IDIPROC", idiproc);
                sql.setNamedParameter("IDEFX", idefx);
                sql.setNamedParameter("IDRPA_OPER", atividadeVO.asBigDecimal("IDRPAOPER"));
                rset = sql.executeQuery();

                while(rset.next()) {
                    BigDecimal qtdOperacao = BigDecimalUtil.getValueOrZero(rset.getBigDecimal("TAMLOTE"));
                    BigDecimal qtdTransferir = BigDecimalUtil.getValueOrZero(rset.getBigDecimal("QTD_TRANSFERIR"));
                    BigDecimal qtdPerda = BigDecimalUtil.getValueOrZero(rset.getBigDecimal("QTDPERDA"));
                    BigDecimal faltaApontar = BigDecimalUtil.getValueOrZero(rset.getBigDecimal("FALTA_APONTAR"));
                    BigDecimal quantidade = qtdTransferir.add(qtdPerda);
                    if (quantidade.doubleValue() > (double)0.0F && quantidade.doubleValue() >= qtdOperacao.doubleValue()) {
                        boolean var19 = false;
                        return var19;
                    }

                    if (faltaApontar.doubleValue() > (double)0.0F && faltaApontar.compareTo(quantidade) == 0) {
                        boolean var14 = false;
                        return var14;
                    }
                }

                rset.close();
                boolean var18 = true;
                return var18;
            } finally {
                JdbcUtils.closeResultSet(rset);
                NativeSql.releaseResources(sql);
            }
        }
    }

    public void getProdutosApontamentoTotem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiatv = XMLUtils.getAttributeAsBigDecimal(paramsElement, "idiatv");
            ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
            JapeWrapper apontamentoPaDAO = JapeFactory.dao("ApontamentoPA");
            Element produtosPAsElement = new Element("produtos");
            BigDecimal nuApo = apontamentoHelper.getNuApoApontamentoPendenteAtividade(idiatv);
            if (nuApo != null) {
                JapeWrapper liberacaoLimiteDAO = JapeFactory.dao("LiberacaoLimite");
                DynamicVO liberacaoLimiteVO = liberacaoLimiteDAO.findOne("this.NUCHAVE = ? AND this.TABELA = ? and this.EVENTO = ?", new Object[]{nuApo, "TPRAPO", 80});
                if (liberacaoLimiteVO != null) {
                    XMLUtils.addContentElement(ctx.getBodyElement(), "LIBERACAO", true);
                }

                Collection<DynamicVO> apontamentoPasVO = apontamentoPaDAO.find("this.NUAPO = ?", new Object[]{nuApo});
                Collection<Pair<String, String>> camposAdicionais = new ArrayList();

                for(FieldMetadata field : DataDictionaryUtils.getFieldsMetadata("ApontamentoPA")) {
                    if (field.getName().startsWith("AD_")) {
                        camposAdicionais.add(new Pair(field.getName(), field.getUserType()));
                    }
                }

                for(DynamicVO apaVO : apontamentoPasVO) {
                    ProdutoControle produtoPA = new ProdutoControle(apaVO.asBigDecimal("CODPRODPA"), apaVO.asString("CONTROLEPA"));
                    BigDecimal qtdApontadaPA = apaVO.asBigDecimalOrZero("QTDAPONTADA");
                    BigDecimal qtdPerdaPA = apaVO.asBigDecimalOrZero("QTDPERDA");
                    BigDecimal qtdMotivosPerdaPA = apaVO.asBigDecimalOrZero("QTDMPE");
                    BigDecimal seqApa = apaVO.asBigDecimal("SEQAPA");
                    DynamicVO produtoPaVO = (DynamicVO)dwfEntityFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{produtoPA.getCodProd()});
                    Element produtoElement = new Element("produto");
                    produtoElement.setAttribute("nuapo", nuApo.toString());
                    produtoElement.setAttribute("seqapa", seqApa.toString());
                    produtoElement.setAttribute("codprod", produtoPA.getCodProd().toString());
                    produtoElement.setAttribute("controle", produtoPA.getControle());
                    produtoElement.setAttribute("titContEst", StringUtils.getNullAsEmpty(produtoPaVO.asString("TITCONTEST")));
                    produtoElement.setAttribute("tipContEst", StringUtils.getNullAsEmpty(produtoPaVO.asString("TIPCONTEST")));
                    produtoElement.setAttribute("descricao", produtoPaVO.asString("DESCRPROD"));
                    produtoElement.setAttribute("quantidade", qtdApontadaPA.toString());
                    produtoElement.setAttribute("referencia", StringUtils.getNullAsEmpty(produtoPaVO.asString("REFERENCIA")));
                    produtoElement.setAttribute("qtdPerda", StringUtils.getNullAsEmpty(qtdPerdaPA.toString()));
                    produtoElement.setAttribute("qtdMotivosPerda", StringUtils.getNullAsEmpty(qtdMotivosPerdaPA.toString()));
                    produtoElement.setAttribute("DECQTD", StringUtils.isEmpty(produtoPaVO.asBigDecimal("DECQTD")) ? "2" : produtoPaVO.asBigDecimal("DECQTD").toString());
                    produtoElement.setAttribute("BALANCA", produtoPaVO.asString("BALANCA"));

                    for(Pair<String, String> campoAdicional : camposAdicionais) {
                        String nomeCampo = (String)campoAdicional.getLeft();
                        String tipoCampo = (String)campoAdicional.getRight();
                        if ("I-F-T".indexOf(tipoCampo) > -1) {
                            produtoElement.setAttribute(nomeCampo, apaVO.asBigDecimalOrZero(nomeCampo).toString());
                        } else if ("S".equals(tipoCampo)) {
                            produtoElement.setAttribute(nomeCampo, apaVO.asString(nomeCampo) == null ? "" : apaVO.asString(nomeCampo));
                        } else if ("C".equals(tipoCampo)) {
                            produtoElement.setAttribute(nomeCampo, apaVO.asString(nomeCampo) == null ? "" : apaVO.asString(nomeCampo));
                        } else if ("H-D".indexOf(tipoCampo) > -1) {
                            produtoElement.setAttribute(nomeCampo, apaVO.asTimestamp(nomeCampo) == null ? "" : apaVO.asTimestamp(nomeCampo).toString());
                        }
                    }

                    produtosPAsElement.addContent(produtoElement);
                    produtoElement.addContent(apontamentoHelper.getElementDetalhesPerdatoPA(nuApo, seqApa));
                    produtoElement.addContent(apontamentoHelper.getElementMPtoPA(nuApo, seqApa));
                    produtoElement.addContent(apontamentoHelper.getElementSubprodutosToPA(nuApo, seqApa));
                    produtoElement.addContent(apontamentoHelper.getElementRecursosToPA(nuApo, seqApa));
                }

                ctx.getBodyElement().addContent(produtosPAsElement);
                return;
            }

            ctx.getBodyElement().addContent(produtosPAsElement);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
            return;
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void removeApontamentoTotem(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idiatv = XMLUtils.getAttributeAsBigDecimal(paramsElement, "IDIATV");
            BigDecimal nuApo = XMLUtils.getAttributeAsBigDecimal(paramsElement, "NUAPO");
            BigDecimal seqApa = XMLUtils.getAttributeAsBigDecimal(paramsElement, "SEQAPA");
            BigDecimal codProdPA = XMLUtils.getAttributeAsBigDecimal(paramsElement, "CODPRODPA");
            String controlePA = XMLUtils.getAttributeAsString(paramsElement, "CONTROLEPA");
            if (nuApo.intValue() == 0) {
                ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
                apontamentoHelper.removeApontamentosAtividadeProdutoTotem(idiatv, new ProdutoControle(codProdPA, controlePA));
            } else {
                dwfEntityFacade.removeEntity("ApontamentoPA", new Object[]{nuApo, seqApa});
                Collection<DynamicVO> apontamentoPAsVO = dwfEntityFacade.findByDynamicFinderAsVO(new FinderWrapper("ApontamentoPA", "this.NUAPO = ?", new Object[]{nuApo}));
                if (apontamentoPAsVO.isEmpty()) {
                    dwfEntityFacade.removeEntity("CabecalhoApontamento", new Object[]{nuApo});
                }
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void realocarCentroDeTrabalhoPorCategoria(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            Element paramsElement = XMLUtils.getRequiredChild(ctx.getRequestBody(), "params");
            BigDecimal idIproc = XMLUtils.getAttributeAsBigDecimal(paramsElement, "idiproc");
            BigDecimal idIatv = XMLUtils.getAttributeAsBigDecimal(paramsElement, "idiatv");
            BigDecimal codWcp = XMLUtils.getAttributeAsBigDecimal(paramsElement, "codwcp");
            boolean isWorkCenterPadrao = XMLUtils.getAttributeAsBoolean(paramsElement, "isWorkCenterPadrao");

            try {
                JapeWrapper historicoWorkCenterAtividadeDAO = JapeFactory.dao("HistoricoWorkCenterAtividade");
                DynamicVO historicoWorkCenterAtividadeVO = historicoWorkCenterAtividadeDAO.findOne("this.IDIPROC = ? AND DHLIBALOC IS NULL", new Object[]{idIproc});
                if (historicoWorkCenterAtividadeVO == null) {
                    this.doAlteracaoLote(dwfEntityFacade, idIatv, codWcp, codWcp, true);
                }
            } catch (AlocacaoCentroDeTrabalhoInvalidaException e) {
                if (isWorkCenterPadrao) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00526", new Exception(e.getMessage()));
                }

                ctx.getBodyElement().setAttribute("alocacaoInvalida", "true");
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getPesagemProducaoOPandIDvolume(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal idIproc = JsonUtils.getBigDecimalOrZero(requestBody, "IDIPROC");
            BigDecimal idVolume = JsonUtils.getBigDecimalOrZero(requestBody, "IDVOLUME");
            boolean isTelaOP = JsonUtils.getBoolean(requestBody, "TELAOP");
            JsonArray allInstanciaAtvJson = new JsonArray();
            JapeWrapper instanciaAtividadeDAO = JapeFactory.dao("InstanciaAtividade");
            JapeWrapper produtoAcabadoAProduzirDAO = JapeFactory.dao("ProdutoAcabadoAProduzir");
            BigDecimal idIatv = null;
            StringBuffer strWhereInstanciaAtv = new StringBuffer();
            Collection<Object> paramsInstanciaAtv = new ArrayList();
            StringBuffer strWhereProduto = new StringBuffer();
            Collection<Object> paramsProduto = new ArrayList();
            if (!isTelaOP) {
                JapeWrapper apontamentoVolumesDAO = JapeFactory.dao("ApontamentoVolumes");
                DynamicVO apontamentoVolumesVO = apontamentoVolumesDAO.findByPK(new Object[]{idVolume});
                if (apontamentoVolumesVO == null) {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00564", new Exception("ID do volume não localizada."));
                }

                idIatv = apontamentoVolumesVO.asBigDecimal("IDIATV");
                idIproc = apontamentoVolumesVO.asBigDecimal("IDIPROC");
                if (idIatv != null) {
                    strWhereInstanciaAtv.append("this.IDIATV = ?");
                    paramsInstanciaAtv.add(idIatv);
                }

                strWhereProduto.append("this.IDIPROC = ? AND this.CODPRODPA = ? AND (nullValue(this.CONTROLEPA, ' ' ) = ' ' OR this.CONTROLEPA = ?)");
                paramsProduto.add(idIproc);
                paramsProduto.add(apontamentoVolumesVO.asBigDecimal("CODPROD"));
                paramsProduto.add(ComercialUtils.trimControleEstoque(apontamentoVolumesVO.asString("CONTROLE")));
            } else {
                strWhereInstanciaAtv.append("this.IDIPROC = ? AND this.DHFINAL IS NULL AND EXISTS (SELECT 1 FROM TPRATV WHERE IDEFX = this.IDEFX AND SUBAPOPORCONF='P')");
                paramsInstanciaAtv.add(idIproc);
                strWhereProduto.append("this.IDIPROC = ?");
                paramsProduto.add(idIproc);
            }

            DynamicVO instanciaAtvVO = instanciaAtividadeDAO.findOne(strWhereInstanciaAtv.toString(), paramsInstanciaAtv.toArray());
            OperacaoProducaoHelper operHelper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
            if (instanciaAtvVO == null) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00565", new Exception("Ordem de produção não localizada."));
            }

            idIatv = instanciaAtvVO.asBigDecimal("IDIATV");
            DynamicVO atividadeVO = instanciaAtvVO.asDymamicVO("Atividade");
            DynamicVO elementoFluxoVO = atividadeVO.asDymamicVO("ElementoFluxo");
            if (!operHelper.validaExecutanteAtividade(idIatv)) {
                JsonObject objJson = new JsonObject();
                objJson.addProperty("ATV_NOT_EXECUTE", "S");
                objJson.addProperty("DESCRICAO", elementoFluxoVO.asString("DESCRICAO"));
                allInstanciaAtvJson.add(objJson);
            } else {
                for(DynamicVO paProduzirVO : produtoAcabadoAProduzirDAO.find(strWhereProduto.toString(), paramsProduto.toArray())) {
                    BigDecimal codProdPA = paProduzirVO.asBigDecimal("CODPRODPA");
                    String controlePA = ComercialUtils.trimControleEstoque(paProduzirVO.asString("CONTROLEPA"));
                    DynamicVO produtoVO = paProduzirVO.asDymamicVO("Produto");
                    int decQtd = produtoVO.asBigDecimal("DECQTD") == null ? 2 : produtoVO.asInt("DECQTD");
                    JsonObject objJson = new JsonObject();
                    objJson.addProperty("IDIPROC", idIproc);
                    objJson.addProperty("IDIATV", idIatv);
                    objJson.addProperty("IDEFX", elementoFluxoVO.asBigDecimal("IDEFX"));
                    objJson.addProperty("ATIVIDADE", elementoFluxoVO.asString("DESCRICAO"));
                    objJson.addProperty("CODPROD", codProdPA);
                    objJson.addProperty("CONTROLE", controlePA);
                    objJson.addProperty("DESCRPROD", produtoVO.asString("DESCRPROD"));
                    objJson.addProperty("NROLOTE", paProduzirVO.asString("NROLOTE"));
                    objJson.addProperty("TAMLOTE", BigDecimalUtil.getRounded(BigDecimalUtil.getValueOrZero(paProduzirVO.asBigDecimal("QTDPRODUZIR")), decQtd));
                    objJson.addProperty("DECQTD", decQtd);
                    objJson.addProperty("OP_NOT_EXECUTE", "N");
                    BigDecimal qtdApontada = BigDecimal.ZERO;
                    JapeWrapper apontamentoPaDAO = JapeFactory.dao("ApontamentoPA");

                    for(DynamicVO apontamentoPaVO : apontamentoPaDAO.find("this.NUAPO IN (SELECT NUAPO FROM TPRAPO WHERE IDIATV = ?) AND this.CODPRODPA = ? AND (nullValue(this.CONTROLEPA, ' ' ) = ' ' OR this.CONTROLEPA = ?)", new Object[]{idIatv, codProdPA, controlePA})) {
                        qtdApontada = qtdApontada.add(apontamentoPaVO.asBigDecimalOrZero("QTDAPONTADA").add(apontamentoPaVO.asBigDecimalOrZero("QTDPERDA")));
                    }

                    objJson.addProperty("QTDAPONTADA", BigDecimalUtil.getRounded(qtdApontada, decQtd));
                    allInstanciaAtvJson.add(objJson);
                }
            }

            JsonObject response = new JsonObject();
            response.add("allInstanciaAtv", allInstanciaAtvJson);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void inserirPesagemVolume(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal idIproc = JsonUtils.getBigDecimalOrZero(requestBody, "IDIPROC");
            BigDecimal idIatv = JsonUtils.getBigDecimalOrZero(requestBody, "IDIATV");
            BigDecimal codProd = JsonUtils.getBigDecimalOrZero(requestBody, "CODPROD");
            String controle = JsonUtils.getString(requestBody, "CONTROLE");
            String lote = JsonUtils.getString(requestBody, "LOTE");
            BigDecimal qtdPeso = JsonUtils.getBigDecimalOrZero(requestBody, "PESO");
            String tipo = JsonUtils.getString(requestBody, "TIPO");
            JsonArray listAdicionais = requestBody.getAsJsonArray("ADICIONAIS");
            BigDecimal idVolume = JsonUtils.getBigDecimalOrZero(requestBody, "IDVOLUME");
            JsonObject loadRecordRequestJson = JsonUtils.getJsonObject(requestBody, "loadRecordRequest");
            boolean procedureExists = JsonUtils.getBoolean(requestBody, "procedureBuscaIncrementoCriada");
            DatasetUtils.LoadRecordRequest loadRecordRequest = null;
            if (loadRecordRequestJson != null) {
                loadRecordRequest = (DatasetUtils.LoadRecordRequest)(new Gson()).fromJson(loadRecordRequestJson, DatasetUtils.LoadRecordRequest.class);
            }

            JapeWrapper produtoDAO = JapeFactory.dao("Produto");
            BigDecimal indBruto = BigDecimal.ZERO;
            BigDecimal indLiquido = BigDecimal.ZERO;
            BigDecimal qtdPesoBruto = BigDecimal.ZERO;
            BigDecimal qtdPesoLiquido = BigDecimal.ZERO;
            if (procedureExists) {
                ProcedureCaller pCaller = new ProcedureCaller("BUSCA_INCREMENTO_PESAGEM");
                pCaller.addInputParameter(codProd);
                pCaller.addInputParameter(ComercialUtils.trimControleEstoque(controle));
                pCaller.addInputParameter(idIproc);
                pCaller.addInputParameter(qtdPeso);
                pCaller.addOutputParameter(2, "P_PESOBRUTO");
                pCaller.addOutputParameter(2, "P_PESOLIQUIDO");
                pCaller.execute(jdbc.getConnection());
                qtdPesoBruto = BigDecimalUtil.getValueOrZero(pCaller.resultAsBigDecimal("P_PESOBRUTO"));
                qtdPesoLiquido = BigDecimalUtil.getValueOrZero(pCaller.resultAsBigDecimal("P_PESOLIQUIDO"));
            } else {
                DynamicVO produtoVO = produtoDAO.findByPK(new Object[]{codProd});
                if (produtoVO != null) {
                    indBruto = BigDecimalUtil.getValueOrZero(produtoVO.asBigDecimal("INCPESOBRUTO"));
                    indLiquido = BigDecimalUtil.getValueOrZero(produtoVO.asBigDecimal("INCPESOLIQUIDO"));
                }

                qtdPesoBruto = qtdPeso.add(indBruto);
                qtdPesoLiquido = qtdPesoBruto.add(indLiquido);
            }

            JapeWrapper apontamentoVolumesDAO = JapeFactory.dao("ApontamentoVolumes");
            if (idVolume.intValue() != 0) {
                DynamicVO apontamentoVolumesVO = apontamentoVolumesDAO.findByPK(new Object[]{idVolume});
                if (apontamentoVolumesVO != null) {
                    FluidUpdateVO volumesVO = apontamentoVolumesDAO.prepareToUpdate(apontamentoVolumesVO);
                    volumesVO.set("PESOBRUTO", qtdPesoBruto);
                    volumesVO.set("PESOLIQ", qtdPesoLiquido);
                    volumesVO.set("TIPO", tipo);

                    for(int i = 0; i < listAdicionais.size(); ++i) {
                        JsonObject objAdicional = listAdicionais.get(i).getAsJsonObject();
                        String filedName = JsonUtils.getString(objAdicional, "data");
                        String value = JsonUtils.getString(objAdicional, "value");
                        String dataType = JsonUtils.getString(objAdicional, "dataType");
                        if (value != null) {
                            if ("I-F-T".indexOf(dataType) > -1) {
                                volumesVO.set(filedName, BigDecimalUtil.valueOf(value));
                            } else if ("S".equals(dataType)) {
                                volumesVO.set(filedName, value);
                            } else if ("C".equals(dataType)) {
                                volumesVO.set(filedName, value.toCharArray());
                            } else if ("H-D".indexOf(dataType) > -1) {
                                volumesVO.set(filedName, TimeUtils.buildTimeawareDate(value));
                            }
                        }
                    }

                    volumesVO.update();
                    ctx.setJsonResponse(criaRetornoLoadRecord(dwfEntityFacade, jdbc, loadRecordRequest, apontamentoVolumesVO));
                }
            } else {
                FluidCreateVO volumesVO = apontamentoVolumesDAO.create();
                volumesVO.set("CODPROD", codProd);
                volumesVO.set("CONTROLE", controle);
                volumesVO.set("IDIPROC", idIproc);
                volumesVO.set("NROLOTE", lote);
                volumesVO.set("IDIATV", idIatv);
                volumesVO.set("PESOBRUTO", qtdPesoBruto);
                volumesVO.set("PESOLIQ", qtdPesoLiquido);
                volumesVO.set("TIPO", tipo);

                for(int i = 0; i < listAdicionais.size(); ++i) {
                    JsonObject objAdicional = listAdicionais.get(i).getAsJsonObject();
                    String filedName = JsonUtils.getString(objAdicional, "data");
                    String value = JsonUtils.getString(objAdicional, "value");
                    String dataType = JsonUtils.getString(objAdicional, "dataType");
                    if (value != null) {
                        if ("I-F-T".indexOf(dataType) > -1) {
                            volumesVO.set(filedName, BigDecimalUtil.valueOf(value));
                        } else if ("S".equals(dataType)) {
                            volumesVO.set(filedName, value);
                        } else if ("C".equals(dataType)) {
                            volumesVO.set(filedName, value.toCharArray());
                        } else if ("H-D".indexOf(dataType) > -1) {
                            volumesVO.set(filedName, TimeUtils.buildTimeawareDate(value));
                        }
                    }
                }

                DynamicVO vo = volumesVO.save();
                idVolume = vo.asBigDecimal("ID");
                ctx.setJsonResponse(criaRetornoLoadRecord(dwfEntityFacade, jdbc, loadRecordRequest, vo));
            }

            OperacaoProducaoHelper operacaoHelper = OperacaoProducaoHelper.getInstance();
            operacaoHelper.imprimirEtiquetas(jdbc, idVolume);
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public static JsonObject criaRetornoLoadRecord(EntityFacade entityFacade, JdbcWrapper jdbc, DatasetUtils.LoadRecordRequest request, DynamicVO vo) throws Exception {
        if (request == null) {
            return null;
        } else {
            DatasetUtils.DatasetInfo datasetInfo = request.buildDsInfo(entityFacade);
            Collection<DynamicVO> vos = new ArrayList();
            vos.add(vo);
            return DatasetUtils.criaRetornoLoadRecords(jdbc, vos, datasetInfo, (DatasetCRUDListener)null, false);
        }
    }

    public void reimprimirPesagemVolume(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal idInicial = JsonUtils.getBigDecimalOrZero(requestBody, "IDINICIAL");
            BigDecimal idFinal = JsonUtils.getBigDecimalOrZero(requestBody, "IDFINAL");
            OperacaoProducaoHelper operacaoHelper = OperacaoProducaoHelper.getInstance();
            JapeWrapper apontamentoVolumesDAO = JapeFactory.dao("ApontamentoVolumes");
            StringBuffer strWhere = new StringBuffer();
            Collection<Object> params = new ArrayList();
            if (idFinal.intValue() == 0) {
                strWhere.append("this.ID = ?");
                params.add(idInicial);
            } else {
                strWhere.append("this.ID >= ? AND this.ID <= ?");
                params.add(idInicial);
                params.add(idFinal);
            }

            for(DynamicVO volumesVO : apontamentoVolumesDAO.find(strWhere.toString(), params.toArray())) {
                operacaoHelper.imprimirEtiquetas(jdbc, volumesVO.asBigDecimal("ID"));
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void removerPesagemVolume(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;

        try {
            hnd = JapeSession.open();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonArray volumesSelecionados = requestBody.getAsJsonArray("LISTVOLUMES");
            boolean isTelaOP = JsonUtils.getBoolean(requestBody, "TELAOP");
            if (volumesSelecionados != null) {
                JapeWrapper apontamentoVolumesDAO = JapeFactory.dao("ApontamentoVolumes");

                for(BigDecimal idVolume : JsonUtils.getChildrenAsBigDecimalCollection(volumesSelecionados, "ID")) {
                    if (isTelaOP) {
                        apontamentoVolumesDAO.deleteByCriteria("ID = ?", new Object[]{idVolume});
                    } else {
                        DynamicVO apontamentoVolumesVO = apontamentoVolumesDAO.findByPK(new Object[]{idVolume});
                        if (apontamentoVolumesVO != null) {
                            FluidUpdateVO volumesVO = apontamentoVolumesDAO.prepareToUpdate(apontamentoVolumesVO);
                            volumesVO.set("PESOBRUTO", (Object)null);
                            volumesVO.set("PESOLIQ", (Object)null);
                            volumesVO.set("TIPO", "N");
                            volumesVO.update();
                        }
                    }
                }
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
        }

    }

    public void confirmarPesagemVolume(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;
        boolean isConfirmacaoAuto = false;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal idIproc = JsonUtils.getBigDecimalOrZero(requestBody, "IDIPROC");
            BigDecimal idIatv = JsonUtils.getBigDecimalOrZero(requestBody, "IDIATV");
            BigDecimal idEfx = JsonUtils.getBigDecimalOrZero(requestBody, "IDEFX");
            BigDecimal codprodPA = JsonUtils.getBigDecimalOrZero(requestBody, "CODPROD");
            String controlePA = JsonUtils.getString(requestBody, "CONTROLE");
            String descrProdPA = JsonUtils.getString(requestBody, "DESCRPROD");
            BigDecimal qtdPeso = JsonUtils.getBigDecimalOrZero(requestBody, "PESO");
            BigDecimal qtdPesoPerda = JsonUtils.getBigDecimalOrZero(requestBody, "PESOPERDA");
            isConfirmacaoAuto = JsonUtils.getBoolean(requestBody, "CONFIRMACAOAUTO");
            ApontamentoHelper apontamentoHelper = new ApontamentoHelper(jdbc);
            boolean permitePerda100Porcento = apontamentoHelper.permiteApontamentoComPerdaTotal(idEfx);
            if (qtdPeso.doubleValue() == (double)0.0F && !permitePerda100Porcento) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00566", new Exception("Para Confirmar a pesagem é necessário que o Peso Total seja maior que zero."));
            }

            if (" " != ComercialUtils.trimControleEstoque(controlePA)) {
                descrProdPA = descrProdPA + " - " + controlePA;
            }

            boolean aceitarQtdMaior = requestBody.get("ACEITARQTDMAIOR").getAsBoolean();
            boolean clientEventRespotaUltimoApontamento = requestBody.get("RESPOSTA_ULTIMO_APONTAMENTO").getAsBoolean();
            boolean aceitaProporcaoInvalidaMPAlternativa = requestBody.get("ACEITA_PROPORCAO_INVALIDA_MPALTERNATIVA").getAsBoolean();
            boolean aceitaWCIndisponivel = requestBody.get("ACEITA_WC_INDISPONIVEL").getAsBoolean();
            boolean processaPerdaUltimoApontamento = requestBody.get("PROCESSA_PERDA_ULTIMO_APONTAMENTO").getAsBoolean();
            boolean isConfirmadoUltimoApontamentoMpFixo = requestBody.get("CONFIRMADO_ULTIMO_APONTAMENTO_MP_FIXO").getAsBoolean();
            boolean isMostradoPopUpUltimoApontamentoMPFixa = requestBody.get("POPUP_APONTAMENTO_MP_FIXO_MOSTRADO").getAsBoolean();
            JapeSession.putProperty("br.com.sankhya.mgeprod.confirmado.ult.apontamento.mp.fixa", isConfirmadoUltimoApontamentoMpFixo);
            JapeSession.putProperty("br.com.sankhya.mgeprod.popup.apresentado.ult.apontamento.mp.fixa", isMostradoPopUpUltimoApontamentoMPFixa);
            JapeSession.putProperty("br.com.sankhya.mgeprod.is.ultimo.apontamento", clientEventRespotaUltimoApontamento || aceitarQtdMaior);
            BigDecimal codUsu = ((AuthenticationInfo)ctx.getAutentication()).getUserID();
            ApontamentoHelper apontHelper = new ApontamentoHelper(jdbc);
            OperacaoProducaoHelper operHelper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
            StringBuffer strNuApoBuilded = new StringBuffer();
            JsonArray listApontamentoJson = new JsonArray();
            StringBuffer strMsgQtdMaior = new StringBuffer();
            StringBuffer strMsgUltimoApont = new StringBuffer();
            boolean isUltimoApontamento = false;
            JapeSession.putProperty("br.com.sankhya.mgeprod.confirmar.apontamento.producao.conjunta", true);
            if (isUltimoApontamento && !clientEventRespotaUltimoApontamento) {
                strMsgUltimoApont.append(" > OP: " + idIproc + " / " + descrProdPA + " <br>");
                this.lancarClientEventPesagemVolume(strMsgQtdMaior, strMsgUltimoApont);
            }

            JapeSession.putProperty("br.com.sankhya.mgeprod.aceita.wc.indisponivel", aceitaWCIndisponivel);
            JapeWrapper instanciaAtividadeDAO = JapeFactory.dao("InstanciaAtividade");
            DynamicVO entityInstancia = instanciaAtividadeDAO.findByPK(new Object[]{idIatv});
            if (entityInstancia != null && entityInstancia.asTimestamp("DHINICIO") == null) {
                operHelper.iniciarInstanciaAtividade(idIatv, jdbc);
            }

            BigDecimal nuapo = null;

            try {
                Element eleApontamento = apontHelper.criarApontamentosAtividadePorProduto(codUsu, idIatv, codprodPA, controlePA, qtdPeso, qtdPesoPerda, (BigDecimal)null);
                Attribute atr = eleApontamento.getAttribute("NUAPO");
                if (eleApontamento.getAttribute("NUAPO") == null || atr.getValue() == "") {
                    throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00567", new Exception("Já existe um apontamento a ser confirmado para esta OP"));
                }

                nuapo = BigDecimal.valueOf((long)atr.getIntValue());
            } catch (Exception e) {
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00530", new Exception("Erro ao apontar OP/PA: [" + idIproc + " / " + descrProdPA + "]. <br>-> " + e.getMessage()));
            }

            JsonObject objApontJson = new JsonObject();
            objApontJson.addProperty("NUAPO", nuapo);
            objApontJson.addProperty("IDIPROC", idIproc);
            objApontJson.addProperty("CODPRODPA", codprodPA);
            objApontJson.addProperty("CONTROLEPA", controlePA);
            listApontamentoJson.add(objApontJson);
            if (strNuApoBuilded.length() > 0) {
                strNuApoBuilded.append(", ").append(nuapo);
            } else {
                strNuApoBuilded.append(nuapo);
            }

            JapeWrapper cabecalhoApontamentoDAO = JapeFactory.dao("CabecalhoApontamento");
            DynamicVO cabecalhoApontamentoVO = cabecalhoApontamentoDAO.findByPK(new Object[]{nuapo});
            Collection<DynamicVO> apontamentosPA = cabecalhoApontamentoVO.asCollection("ApontamentoPA");
            boolean temQtdApontadaIgualMaiorQtdProduzir = this.validaQtdApontadaIgualMaiorQtdProduzir(jdbc, idIatv, idIproc, idEfx, apontamentosPA);
            boolean atvGeraNotaProducao = this.atividadeGeraNotaProducao(dwfEntityFacade, idIatv);
            if (atvGeraNotaProducao) {
                boolean temQtdApontadaMenorQtdProduzir = this.validaQtdApontadaMenorQtdProduzir(jdbc, idIatv, idIproc, idEfx);
                if (temQtdApontadaMenorQtdProduzir && !clientEventRespotaUltimoApontamento && !aceitarQtdMaior && !processaPerdaUltimoApontamento) {
                    if (strMsgUltimoApont.length() == 0) {
                        isUltimoApontamento = true;
                        strMsgUltimoApont.append("<b>");
                        strMsgUltimoApont.append(" > OP: " + idIproc + " / " + codprodPA + " - " + descrProdPA + " <br>");
                    }

                    this.lancarClientEventPesagemVolume(strMsgQtdMaior, strMsgUltimoApont);
                }
            }

            try {
                if (clientEventRespotaUltimoApontamento || temQtdApontadaIgualMaiorQtdProduzir || clientEventRespotaUltimoApontamento && !processaPerdaUltimoApontamento) {
                    this.processarPerdaUltimoApontamento(dwfEntityFacade, jdbc, idIatv, idIproc, nuapo, cabecalhoApontamentoVO);
                    JapeSession.putProperty("br.com.sankhya.apontamento.producao.ultimo.apontamento", true);
                }

                if (cabecalhoApontamentoVO != null) {
                    JapeSession.putProperty("br.com.sankhya.mgeprod.gera.nota.producao", atvGeraNotaProducao);
                    apontamentoHelper.validarConfirmacaoApontamento(cabecalhoApontamentoVO, true);
                }

                apontamentoHelper.confirmarApontamento(nuapo, aceitarQtdMaior, aceitaProporcaoInvalidaMPAlternativa);
                OperacoesEstoqueHelper operacoesEstoqueHelper = new OperacoesEstoqueHelper(jdbc);
                operacoesEstoqueHelper.executarOperacoesEstoqueAtividade(idIatv, nuapo, MomentoOperacaoEstoque.APONTAMENTO_PA);
                JapeWrapper apontamentoVolumesDAO = JapeFactory.dao("ApontamentoVolumes");

                for(DynamicVO volumeVO : apontamentoVolumesDAO.find("this.IDIPROC = ? AND this.IDIATV = ? AND this.CODPROD = ? AND (nullValue(this.CONTROLE, ' ' ) = ' ' OR this.CONTROLE = ?) AND this.NUAPO IS NULL AND this.PESOLIQ IS NOT NULL", new Object[]{idIproc, idIatv, codprodPA, ComercialUtils.trimControleEstoque(controlePA)})) {
                    FluidUpdateVO volumeUpdateVO = apontamentoVolumesDAO.prepareToUpdate(volumeVO);
                    volumeUpdateVO.set("NUAPO", nuapo);
                    volumeUpdateVO.update();
                }
            } catch (ApontamentoInvalidoException e) {
                if (strMsgQtdMaior.length() == 0) {
                    strMsgQtdMaior.append("<b>");
                }

                strMsgQtdMaior.append(" > OP: " + idIproc + " / " + e.getMessage() + " <br>");
                this.lancarClientEventPesagemVolume(strMsgQtdMaior, strMsgUltimoApont);
            } catch (ProporcaoApontamentoInvalidaException var54) {
                ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.operacaoproducao.mpalt.proporcao.apontamento.invalida", new Element("event"));
                throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00533", new ServiceCanceledException());
            }

            if (clientEventRespotaUltimoApontamento) {
                apontamentoHelper.finalizarProducaoProdutoAcabadosApontamento(idIproc, nuapo);
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    private void lancarClientEventPesagemVolume(StringBuffer strMsgQtdMaior, StringBuffer strMsgUltimoApont) throws Exception {
        if (strMsgQtdMaior.length() > 0) {
            strMsgQtdMaior.append("</b>");
            Element elemMsgQtdMaior = new Element("msg_qtd_maior");
            elemMsgQtdMaior.setAttribute("values", strMsgQtdMaior.toString());
            ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeprod.apontamentoconjunta.msgqtdmaior", elemMsgQtdMaior);
            throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00533", new ServiceCanceledException());
        } else if (strMsgUltimoApont.length() > 0) {
            strMsgUltimoApont.append("</b>");
            Element elemMsgUltimoApont = new Element("msg_ultimo_apont");
            elemMsgUltimoApont.setAttribute("values", strMsgUltimoApont.toString());
            ServiceContext.getCurrent().addClientEvent("br.com.sankhya.mgeProd.apontamento.ultimo", elemMsgUltimoApont);
            throw (ServiceCanceledException)SKError.registry(TSLevel.ERROR, "PROD_E00533", new ServiceCanceledException());
        }
    }

    public void getAtividadesCards(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal idIproc = JsonUtils.getBigDecimalOrZero(requestBody, "IDIPROC");
            OperacaoProducaoHelper operacaoHelper = OperacaoProducaoHelper.getInstance();
            JsonObject response = new JsonObject();
            response.add("listaAtividadesCards", operacaoHelper.getListaAtividadesCardsJson(jdbc, idIproc));
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void salvarDetalhamentoPerda(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonArray detalhamentoPerdaList = requestBody.getAsJsonArray("params");
            boolean detalhamentoPerdaMP = requestBody.getAsJsonPrimitive("detalhamentoMP").getAsBoolean();
            if (detalhamentoPerdaList != null) {
                OperacaoProducaoHelper operHelper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
                this.excluirDetalhamentosPerda(ctx);

                for(int i = 0; i < detalhamentoPerdaList.size(); ++i) {
                    JsonElement elemNuapo = detalhamentoPerdaList.get(i).getAsJsonObject().get("NUAPO");
                    BigDecimal nuapo = BigDecimalUtil.getBigDecimal(elemNuapo.getAsString());
                    JsonElement elemSeqapa = detalhamentoPerdaList.get(i).getAsJsonObject().get("SEQAPA");
                    BigDecimal seqapa = BigDecimalUtil.getBigDecimal(elemSeqapa.getAsString());
                    JsonElement elemCodmpe = detalhamentoPerdaList.get(i).getAsJsonObject().get("CODMPE");
                    BigDecimal codmpe = BigDecimalUtil.getBigDecimal(elemCodmpe.getAsString());
                    JsonElement elemQtdperda = detalhamentoPerdaList.get(i).getAsJsonObject().get("QTDPERDA");
                    BigDecimal qtdperda = BigDecimalUtil.getBigDecimal(elemQtdperda.getAsString());
                    if (!detalhamentoPerdaMP) {
                        operHelper.salvarDetalhamentoPerda(nuapo, seqapa, codmpe, qtdperda);
                    } else {
                        BigDecimal codProdMP = requestBody.getAsJsonPrimitive("CODPRODMP").getAsBigDecimal();
                        String controleMP = requestBody.getAsJsonPrimitive("CONTROLEMP").getAsString();
                        operHelper.salvarDetalhamentoPerdaMP(nuapo, seqapa, codmpe, qtdperda, codProdMP, controleMP);
                    }
                }
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void carregarDetalhamentosPerda(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            BigDecimal nuapo = JsonUtils.getBigDecimalOrZero(requestBody, "NUAPO");
            BigDecimal seqapa = JsonUtils.getBigDecimalOrZero(requestBody, "SEQAPA");
            boolean detalhamentoPerdaMP = requestBody.getAsJsonPrimitive("detalhamentoMP").getAsBoolean();
            OperacaoProducaoHelper operHelper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
            JsonObject response = new JsonObject();
            if (!detalhamentoPerdaMP) {
                response.add("listaDetalhamentoPerda", operHelper.getListaDetalhamentoPerda(nuapo, seqapa));
            } else {
                BigDecimal codProdMP = requestBody.getAsJsonPrimitive("CODPRODMP").getAsBigDecimal();
                String controleMP = requestBody.getAsJsonPrimitive("CONTROLEMP").getAsString();
                response.add("listaDetalhamentoPerda", operHelper.getListaDetalhamentoPerdaMP(nuapo, seqapa, codProdMP, controleMP));
            }

            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void excluirDetalhamentosPerda(ServiceContext ctx) throws MGEModelException {
        JapeSession.SessionHandle hnd = null;
        JdbcWrapper jdbc = null;

        try {
            hnd = JapeSession.open();
            EntityFacade dwfEntityFacade = EntityFacadeFactory.getDWFFacade();
            jdbc = dwfEntityFacade.getJdbcWrapper();
            jdbc.openSession();
            JsonObject requestBody = ctx.getJsonRequestBody();
            JsonArray detalhamentoPerdaList = requestBody.getAsJsonArray("params");
            boolean detalhamentoPerdaMP = requestBody.getAsJsonPrimitive("detalhamentoMP").getAsBoolean();
            if (detalhamentoPerdaList != null) {
                OperacaoProducaoHelper operHelper = OperacaoProducaoHelper.getInstance(dwfEntityFacade);
                if (!detalhamentoPerdaMP) {
                    operHelper.excluirDetalhamentosPerda(detalhamentoPerdaList);
                } else {
                    BigDecimal codProdMP = requestBody.getAsJsonPrimitive("CODPRODMP").getAsBigDecimal();
                    String controleMP = requestBody.getAsJsonPrimitive("CONTROLEMP").getAsString();
                    operHelper.excluirDetalhamentosPerdaMP(detalhamentoPerdaList, codProdMP, controleMP);
                }
            }
        } catch (Exception e) {
            SPBeanUtils.throwExceptionRollingBack(e, this.context);
        } finally {
            JapeSession.close(hnd);
            JdbcWrapper.closeSession(jdbc);
        }

    }

    public void getHoraDataServidor(ServiceContext ctx) throws MGEModelException {
        try {
            LocalDateTime now = LocalDateTime.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            String formattedDateTime = now.format(formatter);
            JsonObject dataHoraServidor = new JsonObject();
            dataHoraServidor.addProperty("datetime", formattedDateTime);
            JsonObject response = new JsonObject();
            response.add("dataHoraServidor", dataHoraServidor);
            ctx.setJsonResponse(response);
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        }

    }

    private String getEntityNamePorTipoApontamento(Element params) throws Exception {
        switch (XMLUtils.getContentChildAsString(params, "TIPOAPONTAMENTO")) {
            case "PA":
                return "ApontPesoProducao";
            case "MP":
                return "ApontPesoMateriaPrima";
            default:
                throw (Exception)SKError.registry(TSLevel.ERROR, "PROD_E00619", new Exception("Tipo Apontamento Inválido"));
        }
    }
}
