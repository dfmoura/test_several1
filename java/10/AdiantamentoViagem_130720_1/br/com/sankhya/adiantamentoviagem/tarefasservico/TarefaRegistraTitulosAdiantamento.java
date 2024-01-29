package br.com.sankhya.adiantamentoviagem.tarefasservico;

import java.math.BigDecimal;

import br.com.sankhya.extensions.actionbutton.Registro;
import br.com.sankhya.extensions.flow.ContextoTarefa;
import br.com.sankhya.extensions.flow.TarefaJava;
import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.bmp.PersistentLocalEntity;
import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.EntityVO;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

public class TarefaRegistraTitulosAdiantamento implements TarefaJava {

	@Override
	/*public void executar(final ContextoTarefa contexto) throws Exception {
		JapeSession.getCurrentSession().execWithAutonomousTX(new JapeSession.NewTXBody() {
			public Object run() throws Exception {
				executarInterno(contexto);
				return null;
			}
		});
	}*/

	public void executar(ContextoTarefa contexto) throws Exception {
	
		EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
		BigDecimal usuarioInclusao = NativeSql.getBigDecimal("CODUSUINC", "TWFIPRN", "IDINSTPRN = " + contexto.getIdInstanceProcesso());
		Registro[] formulario = contexto.getLinhasFormulario("AD_SOLICITACAOADIANTAMENTO"); 
		String observacoes = (String) formulario[0].getCampo("OBSERVACOES");
  
		DynamicVO receita = (DynamicVO) dwfFacade.getDefaultValueObjectInstance("Financeiro"); 
		receita.setProperty("VLRDESDOB",formulario[0].getCampo("VALORADIANTAMENTO"));   
		receita.setProperty("CODBCO",new  BigDecimal((long)contexto.getCampo("CODBCO")));  
		receita.setProperty("CODCTABCOINT",new  BigDecimal((long) contexto.getCampo("CODCTABCOINT")));  
		receita.setProperty("CODEMP",new  BigDecimal((long)contexto. getCampo("CODEMP")));   
		receita.setProperty("CODNAT",new  BigDecimal((long)contexto.getCampo("CODNAT")));   
		receita.setProperty("CODCENCUS",new  BigDecimal((long)contexto.getCampo("CODCENCUS")));   
		receita.setProperty("CODTIPTIT",new  BigDecimal((long)contexto.getCampo("CODTIPTIT")));  
		receita.setProperty("CODTIPOPER",new  BigDecimal((long)contexto.getCampo("CODTIPOPERREC")));   
		receita.setProperty("DTNEG",contexto.getCampo("DTNEG"));   
		receita.setProperty("DTVENC",contexto.getCampo("DTVENC"));   
		receita.setProperty("CODPARC",new  BigDecimal((long)contexto.getCampo("CODPARC")));   
		receita.setProperty("RECDESP",new BigDecimal(1));   
		receita.setProperty("NUMNOTA",new BigDecimal(0));  
		receita.setProperty("HISTORICO","### ADIANTAMENTO DE VIAGEM ### \n \nID solicitação: " + contexto.getIdInstanceProcesso() + " \nSolicitante: " + usuarioInclusao + " - " + contexto.getCampo("NOMEUSUARIO") + "\nObservação: " + observacoes);
		dwfFacade.createEntity("Financeiro", (EntityVO) receita);
		
		BigDecimal nufinRec = receita.asBigDecimal("NUFIN");
	   

		DynamicVO despesa = (DynamicVO) dwfFacade.getDefaultValueObjectInstance("Financeiro");  
		despesa.setProperty("VLRDESDOB",formulario[0].getCampo("VALORADIANTAMENTO"));   
		despesa.setProperty("CODBCO",new  BigDecimal((long)contexto.getCampo("CODBCO")));  
		despesa.setProperty("CODCTABCOINT",new  BigDecimal((long)contexto.getCampo("CODCTABCOINT")));  
		despesa.setProperty("CODEMP",new  BigDecimal((long)contexto. getCampo("CODEMP")));   
		despesa.setProperty("CODNAT",new  BigDecimal((long)contexto.getCampo("CODNAT")));   
		despesa.setProperty("CODCENCUS",new  BigDecimal((long)contexto.getCampo("CODCENCUS")));   
		despesa.setProperty("CODTIPTIT",new  BigDecimal((long)contexto.getCampo("CODTIPTIT")));  
		despesa.setProperty("CODTIPOPER",new  BigDecimal((long)contexto.getCampo("CODTIPOPERDES")));   
		despesa.setProperty("DTNEG",contexto.getCampo("DTNEG"));   
		despesa.setProperty("DTVENC",contexto.getCampo("DTVENC"));   
		despesa.setProperty("CODPARC",new  BigDecimal((long)contexto.getCampo("CODPARC")));   
		despesa.setProperty("RECDESP",new BigDecimal(-1));   
		despesa.setProperty("NUMNOTA",new BigDecimal(0));  
		despesa.setProperty("HISTORICO","### ADIANTAMENTO DE VIAGEM ### \n \nID solicitação: " + contexto.getIdInstanceProcesso() + " \nSolicitante: " + usuarioInclusao + " - " + contexto.getCampo("NOMEUSUARIO") + "\nObservação: " + observacoes);
		dwfFacade.createEntity("Financeiro", (EntityVO) despesa);
		
		BigDecimal nufinDes = despesa.asBigDecimal("NUFIN");


		PersistentLocalEntity plEntity = dwfFacade.findEntityByPrimaryKey("AD_SOLICITACAOADIANTAMENTO", new Object [] {contexto.getIdInstanceProcesso(), new BigDecimal(0), new BigDecimal(1)});
		DynamicVO voAlteracao = (DynamicVO) plEntity.getValueObject();
		voAlteracao.setProperty("NUFIN_AD_R", nufinRec);
		voAlteracao.setProperty("NUFIN_AD_D", nufinDes);
		plEntity.setValueObject((EntityVO) voAlteracao);  


	}

}
