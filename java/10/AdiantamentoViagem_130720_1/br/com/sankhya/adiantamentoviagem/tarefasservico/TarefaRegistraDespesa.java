package br.com.sankhya.adiantamentoviagem.tarefasservico;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.Collection;

import com.sankhya.util.BigDecimalUtil;

import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.extensions.flow.ContextoTarefa;
import br.com.sankhya.extensions.flow.TarefaJava;
import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.bmp.PersistentLocalEntity;
import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.util.FinderWrapper;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.EntityVO;
import br.com.sankhya.modelcore.labs.bia.engines.dashboard.model.Variable;
import br.com.sankhya.modelcore.util.AsyncAction;
import br.com.sankhya.modelcore.util.AsyncAction.AsyncTask;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

public class TarefaRegistraDespesa implements TarefaJava {

	@Override
	public void executar(final ContextoTarefa contexto) throws Exception {
		JapeSession.getCurrentSession().execWithAutonomousTX(new JapeSession.NewTXBody() {
			public Object run() throws Exception {
				executarInterno(contexto);
				return null;
			}
		});
	}

	private void executarInterno(ContextoTarefa contexto) throws Exception {
		MathContext mathContext = new MathContext(32);
		EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
		
		BigDecimal vlrDesdob = BigDecimal.ZERO;
		Registro[] despesas = contexto.getLinhasFormulario("AD_DESPADIANTAMENTO");

		if (despesas.length > 0) {

			for (Registro r : despesas) {
				vlrDesdob = vlrDesdob.add((BigDecimal) r.getCampo("CAMVALORDESPESA"));
			}

			Registro[] formulario = contexto.getLinhasFormulario("AD_SOLICITACAOADIANTAMENTO");


			DynamicVO financeiro = (DynamicVO) dwfFacade.getDefaultValueObjectInstance("Financeiro"); 
			financeiro.setProperty("NUMNOTA", BigDecimal.ZERO);
			financeiro.setProperty("RECDESP", BigDecimal.ONE.negate());
			financeiro.setProperty("HISTORICO", "### ADIANTAMENTO DE VIAGEM (ID:" + contexto.getIdInstanceProcesso() + " ###)");
			financeiro.setProperty("CODBCO", new BigDecimal((long) contexto.getCampo("CODBCO")));
			financeiro.setProperty("CODCTABCOINT", new BigDecimal((long) contexto.getCampo("CODCTABCOINT")));
			financeiro.setProperty("CODEMP", new BigDecimal((long) contexto.getCampo("CODEMP")));
			financeiro.setProperty("CODNAT", new BigDecimal((long) contexto.getCampo("CODNAT")));
			financeiro.setProperty("CODCENCUS", new BigDecimal((long) contexto.getCampo("CODCENCUS")));
			financeiro.setProperty("CODTIPTIT", new BigDecimal((long) contexto.getCampo("CODTIPTIT")));
			financeiro.setProperty("CODTIPOPER", new BigDecimal((long) contexto.getCampo("CODTIPOPERDES")));
			financeiro.setProperty("DTNEG", contexto.getCampo("DTNEG"));
			financeiro.setProperty("DTVENC", contexto.getCampo("DTVENC"));
			financeiro.setProperty("CODPARC", new BigDecimal((long) contexto.getCampo("CODPARC")));
			financeiro.setProperty("OBSERVACAOAC", formulario[0].getCampo("OBSERVACOES"));
			financeiro.setProperty("VLRDESDOB", vlrDesdob);
			dwfFacade.createEntity("Financeiro", (EntityVO) financeiro);

			BigDecimal nufin = financeiro.asBigDecimal("NUFIN");		

			PersistentLocalEntity plEntity = dwfFacade.findEntityByPrimaryKey("AD_SOLICITACAOADIANTAMENTO", new Object [] {contexto.getIdInstanceProcesso(), new BigDecimal(0), new BigDecimal(1)});
			DynamicVO voAlteracao = (DynamicVO) plEntity.getValueObject();
			voAlteracao.setProperty("NUFIN_AC_D", nufin);
			plEntity.setValueObject((EntityVO) voAlteracao);
			

			for (Registro r : despesas) {

				BigDecimal vlrDespesa = (BigDecimal) r.getCampo("CAMVALORDESPESA");
				BigDecimal percRateio = BigDecimalUtil.getRounded(vlrDespesa.divide(vlrDesdob, mathContext).multiply(new BigDecimal(100), mathContext), 2);

				BigDecimal natureza = (BigDecimal) r.getCampo("CODNAT");

				DynamicVO rateio = (DynamicVO) dwfFacade.getDefaultValueObjectInstance("RateioRecDesp"); 
				rateio.setProperty("NUFIN", nufin);
				rateio.setProperty("CODNAT", natureza);
				rateio.setProperty("PERCRATEIO", percRateio);
				rateio.setProperty("ORIGEM", "F");
				dwfFacade.createEntity("RateioRecDesp", (EntityVO) rateio);

			}

		}

	}

}