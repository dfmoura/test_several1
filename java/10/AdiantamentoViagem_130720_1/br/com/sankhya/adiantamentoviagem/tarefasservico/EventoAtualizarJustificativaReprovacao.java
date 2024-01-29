package br.com.sankhya.adiantamentoviagem.tarefasservico;

import java.math.BigDecimal;

import br.com.sankhya.extensions.flow.ContextoEvento;
import br.com.sankhya.extensions.flow.EventoProcessoJava;
import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.sql.NativeSql;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.EntityVO;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

public class EventoAtualizarJustificativaReprovacao implements EventoProcessoJava {

	@Override
	public void executar(ContextoEvento contexto) throws Exception {
		
		EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
		DynamicVO registro = (DynamicVO) dwfFacade.getDefaultValueObjectInstance("InstanciaVariavel"); 
		registro.setProperty("IDINSTPRN", contexto.getIdInstanceProcesso());
		registro.setProperty("IDINSTTAR", BigDecimal.ZERO);
		registro.setProperty("NOME", "JUTIFICATIVAAPROVACAO");
		registro.setProperty("TIPO", "C");
		registro.setProperty("TEXTOLONGO", NativeSql.getString("JUTIFICATIVAAPROVACAO", "AD_SOLICITACAOADIANTAMENTO", "IDINSTPRN = " + contexto.getIdInstanceProcesso()));
		dwfFacade.createEntity("InstanciaVariavel", (EntityVO) registro);

	}

}
