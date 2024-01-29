package br.com.sankhya.flow.modelos.comercial.pedidoCompra;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import org.jdom.Element;

import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.extensions.flow.ContextoTarefa;
import br.com.sankhya.extensions.flow.TarefaJava;
import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.dao.EntityDAO;
import br.com.sankhya.jape.dao.EntityPrimaryKey;
import br.com.sankhya.jape.dao.JdbcWrapper;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.jape.util.InMemoryDataSet.Query;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.PrePersistEntityState;
import br.com.sankhya.jape.vo.ValueObjectManager;
import br.com.sankhya.modelcore.MGEModelException;
import br.com.sankhya.modelcore.auth.AuthenticationInfo;
import br.com.sankhya.modelcore.comercial.BarramentoRegra;
import br.com.sankhya.modelcore.comercial.ConfirmacaoNotaHelper;
import br.com.sankhya.modelcore.comercial.centrais.CACHelper;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;
import br.com.sankhya.modelcore.util.SPBeanUtils;
import br.com.sankhya.ws.ServiceContext;

import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;
import com.sankhya.util.TimeUtils;
import com.sankhya.util.XMLUtils;

public class ServiceTaskGerarPedidos implements TarefaJava {

	private EntityFacade	dwfEntityFacade;

	@Override
	public void executar(ContextoTarefa contexto) throws Exception {

		dwfEntityFacade = EntityFacadeFactory.getDWFFacade();

		Registro[] solicitacoes = contexto.getLinhasFormulario("AD_SOLICITACAOCOMPRA");
		
		if (solicitacoes.length > 0) {
			ServiceContext sctx = new ServiceContext(null);
			sctx.setAutentication(AuthenticationInfo.getCurrent());
			sctx.makeCurrent();

			SPBeanUtils.setupContext(sctx);

			CACHelper cacHelper = new CACHelper();
			Map<BigDecimal, Collection<Produto>> produtosPorFornecedor = new HashMap<BigDecimal, Collection<Produto>>();
			Registro[] itensCotados = contexto.getLinhasFormulario("AD_COTACOESDEITENS");
			
			StringBuilder detalheNotificacao = new StringBuilder();
			String notaConfirmada = new String();

			for (Registro solicitacao : solicitacoes) {
				processaSolicitacao(produtosPorFornecedor, solicitacao, itensCotados);
			}

			for (BigDecimal codParc : produtosPorFornecedor.keySet()) {

				Collection<Produto> produtos = produtosPorFornecedor.get(codParc);

				if (produtos.isEmpty()) {
					throw new Exception("Não existe produtos para adicionar");
				}

				StringBuffer obs = new StringBuffer();

				for (Produto p : produtos) {
					if (obs.length() == 0) {
						obs.append(p.obsSolicitante);
					}

					String obsCotacao = p.obsCotacao;
					if (StringUtils.getEmptyAsNull(obsCotacao) != null) {
						obs.append("\n\nObserção cotação produto ").append(p.codprod).append(": ").append(obsCotacao);
					}
				}

				Element cabecalho = new Element("Cabecalho");
				XMLUtils.addContentElement(cabecalho, "NUNOTA", "");
				XMLUtils.addContentElement(cabecalho, "NUMNOTA", BigDecimal.ZERO);
				XMLUtils.addContentElement(cabecalho, "STATUSNOTA", "A");
				XMLUtils.addContentElement(cabecalho, "DTNEG", TimeUtils.formataDDMMYYYY(TimeUtils.getNow()));
				JdbcWrapper jdbc = dwfEntityFacade.getJdbcWrapper();
				try {
					carregaTop(jdbc, BigDecimalUtil.getBigDecimal(contexto.getCampo("CODTIPOPER")), cabecalho);
					carregaTpv(jdbc, BigDecimalUtil.getBigDecimal(contexto.getCampo("CODTIPVENDA")), cabecalho);
				} finally {
					if (jdbc != null) {
						jdbc.closeSession();
					}
				}

				XMLUtils.addContentElement(cabecalho, "CODPARC", codParc);
				XMLUtils.addContentElement(cabecalho, "CODNAT", BigDecimalUtil.getBigDecimal(contexto.getCampo("CODNAT")));
				XMLUtils.addContentElement(cabecalho, "CODCENCUS", BigDecimalUtil.getBigDecimal(contexto.getCampo("CODCENCUS")));
				XMLUtils.addContentElement(cabecalho, "TIPMOV", "O");
				XMLUtils.addContentElement(cabecalho, "CODEMP", BigDecimalUtil.getBigDecimal(contexto.getCampo("CODEMP")));
				XMLUtils.addContentElement(cabecalho, "OBSERVACAO", obs.toString());

				BarramentoRegra regra = cacHelper.incluirAlterarCabecalho(sctx, cabecalho);

				Collection<EntityPrimaryKey> pksEnvolvidas = regra.getDadosBarramento().getPksEnvolvidas();
				EntityPrimaryKey cabKey = (EntityPrimaryKey) pksEnvolvidas.iterator().next();

				BigDecimal nuNota = new BigDecimal(cabKey.getValues()[0].toString());

				Collection<PrePersistEntityState> itens = new ArrayList<PrePersistEntityState>();

				//PREPARAÇÃO UPDATE DE NUNOTA NO FORMULÁRIO
				NativeSql update = null;
				JdbcWrapper jdbc2 = null;
				try {
					jdbc2 = dwfEntityFacade.getJdbcWrapper();
					update = new NativeSql(jdbc2);
					
					update.appendSql(" UPDATE AD_SOLICITACAOCOMPRA SET NUNOTA = :NUNOTA");
					update.appendSql(" WHERE IDINSTPRN = :IDINSTPRN ");
					update.appendSql(" AND CODPROD = :CODPROD ");
					update.setReuseStatements(true);
					
					for (Produto p : produtos) {
						
						Element itemElem = new Element("item");
						XMLUtils.addContentElement(itemElem, "NUNOTA", nuNota);
						XMLUtils.addContentElement(itemElem, "CODPROD", p.codprod);
						XMLUtils.addContentElement(itemElem, "QTDNEG", p.qtd);
						XMLUtils.addContentElement(itemElem, "VLRUNIT", p.preco);
						
						EntityDAO dao = dwfEntityFacade.getDAOInstance("ItemNota");
						
						DynamicVO newVO = (DynamicVO) dao.getDefaultValueObjectInstance();
						
						ValueObjectManager.getSingleton().updateValueObject(newVO, itemElem, dao);
						
						PrePersistEntityState pse = PrePersistEntityState.build(dwfEntityFacade, dao.getEntityName(), newVO);
						pse.addProperty("source", itemElem);
						
						DynamicVO itemVO = pse.getNewVO();
						
						itemVO.setAceptTransientProperties(true);
						
						itens.add(pse);			
						
						update.cleanParameters();
						update.setNamedParameter("NUNOTA", nuNota);
						update.setNamedParameter("IDINSTPRN", contexto.getIdInstanceProcesso());
						update.setNamedParameter("CODPROD", p.codprod);
						
						//ATUALIZA NRO DO PEDIDO NO FORMULÁRIO DO PROCESSO (NUNOTA.AD_SOLICITACAOCOMPRA)
						update.executeUpdate();
						
						
					}
					
					
				} finally {
					NativeSql.releaseResources(update);
					JdbcWrapper.closeSession(jdbc2);
				}
				

				cacHelper.incluirAlterarItem(nuNota, AuthenticationInfo.getCurrent(), itens, true);
				
				//CONFIRMAÇÃO DA NOTA
				try{
					BarramentoRegra bRegras = BarramentoRegra.build(CACHelper.class, "regrasConfirmacaoCAC.xml", AuthenticationInfo.getCurrent());
					ConfirmacaoNotaHelper.confirmarNota(nuNota, bRegras);
									
					//VERIFICA STATUS DA NOTA PARA SER UTILIZADO NA NOTIFICAÇÃO
					if("L".equals(NativeSql.getString("STATUSNOTA", "TGFCAB", "NUNOTA = " + nuNota)) == true)
						notaConfirmada = "Sim";
					else{
						notaConfirmada = "Não";
					}
					
					//BUSCAR DEMAIS DADOS PARA NOTIFICAÇÃO
					NativeSql query = null;
					JdbcWrapper jdbc3 = null;
					try {
						jdbc3 = dwfEntityFacade.getJdbcWrapper();
						query = new NativeSql(jdbc3);
						
						query.appendSql(" SELECT CODPROD");
						query.appendSql(" FROM AD_SOLICITACAOCOMPRA");
						query.appendSql(" WHERE NUNOTA = :NUNOTA");
						query.appendSql(" AND IDINSTPRN = :IDINSTPRN");

						query.setNamedParameter("IDINSTPRN", contexto.getIdInstanceProcesso());
						query.setNamedParameter("NUNOTA", nuNota);
					
						ResultSet rs = query.executeQuery();
						while(rs.next()) {
							BigDecimal codProd = rs.getBigDecimal("CODPROD");
							String descrProd = NativeSql.getString("DESCRPROD", "TGFPRO", "CODPROD = " + codProd);
							
							detalheNotificacao.append("<b>Produto:</b> "+ codProd +" - "+ descrProd +" | <b>Pedido (Nro Único):</b> "+ nuNota +" | <b>Confirmado:</b> "+ notaConfirmada +"<br/>");
						}
					} finally {
						NativeSql.releaseResources(query);
						JdbcWrapper.closeSession(jdbc3);
					}
					
				} catch(Exception e){
					throw MGEModelException.prettyMsg( e.getMessage(),e);
				}
			}
			
			//ATUALIZA CAMPO 'DETALHENOTIFICACAO' UTILIZADO NA NOTIFICAÇÃO
			if (StringUtils.getEmptyAsNull(detalheNotificacao) != null) {
				contexto.setCampo("DETALHENOTIFICACAO", detalheNotificacao.toString());
			}
		}
	}

	private void carregaTop(JdbcWrapper jdbc, BigDecimal top, Element cabecalho) throws Exception {
		XMLUtils.addContentElement(cabecalho, "CODTIPOPER", top);
		Timestamp dhalter = NativeSql.getTimestamp("MAX(DHALTER)", "TGFTOP", "CODTIPOPER = ?", new Object[] { top });
		SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
		XMLUtils.addContentElement(cabecalho, "DHTIPOPER", sdf.format(dhalter));
	}

	private void carregaTpv(JdbcWrapper jdbc, BigDecimal tpv, Element cabecalho) throws Exception {
		XMLUtils.addContentElement(cabecalho, "CODTIPVENDA", tpv);
		Timestamp dhalter = NativeSql.getTimestamp("MAX(DHALTER)", "TGFTPV", "CODTIPVENDA = ?", new Object[] { tpv });
		SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
		XMLUtils.addContentElement(cabecalho, "DHTIPVENDA", sdf.format(dhalter));
	}

	private void processaSolicitacao(Map<BigDecimal, Collection<Produto>> produtosPorFornecedor, Registro solicitacao, Registro[] itensCotados) throws Exception {
		Registro melhorCotacao = null;
		for (Registro cotacao : itensCotados) {
			if (cotacaoPertenceSolicitacao(solicitacao, cotacao)) {
				BigDecimal preco = BigDecimalUtil.getBigDecimal(cotacao.getCampo("PRECO"));
				if (melhorCotacao == null) {
					melhorCotacao = cotacao;
				} else {
					BigDecimal precoAnterior = BigDecimalUtil.getBigDecimal(melhorCotacao.getCampo("PRECO"));
					if (precoAnterior.compareTo(preco) > 0) {
						melhorCotacao = cotacao;
					}
				}
			}
		}

		if (melhorCotacao != null) {
			BigDecimal codparc = BigDecimalUtil.getBigDecimal(melhorCotacao.getCampo("CODPARC"));
			Collection<Produto> produtos = produtosPorFornecedor.get(codparc);
			if (produtos == null) {
				produtos = new ArrayList<Produto>();
				produtosPorFornecedor.put(codparc, produtos);
			}
			produtos.add(new Produto(solicitacao, melhorCotacao));
		}
	}

	private boolean cotacaoPertenceSolicitacao(Registro solicitacao, Registro cotacao) throws Exception {
		return BigDecimalUtil.getBigDecimal(solicitacao.getCampo("CODREGISTRO")).compareTo(BigDecimalUtil.getBigDecimal(cotacao.getCampo("CODREGISTRO"))) == 0;
	}

	private static class Produto {

		BigDecimal	qtd;
		BigDecimal	preco;
		BigDecimal	codprod;
		String		obsSolicitante;
		String		obsCotacao;

		public Produto(Registro solicitacao, Registro cotacao) {
			qtd = BigDecimalUtil.getBigDecimal(solicitacao.getCampo("QUANTIDADE"));
			codprod = BigDecimalUtil.getBigDecimal(solicitacao.getCampo("CODPROD"));
			obsSolicitante = (String) solicitacao.getCampo("OBSERVACAO");

			obsCotacao = (String) cotacao.getCampo("OBSERVACAO");
			preco = BigDecimalUtil.getBigDecimal(cotacao.getCampo("PRECO"));
		}
	}
}
