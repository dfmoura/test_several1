import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;

public class DolarBT  implements AcaoRotinaJava{
    
    @Override
	public void doAction(ContextoAcao contexto) throws Exception {

		contexto.setMensagemRetorno("Teste!");

	}
}
