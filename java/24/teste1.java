package BotaoAcao;

import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
import br.com.sankhya.extensions.actionbutton.Registro;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.StringUtils;
import com.sankhya.util.TimeUtils;

import java.math.BigDecimal;


public class ImpProdMovInterna implements AcaoRotinaJava {
    @Override
    public void doAction(ContextoAcao contexto) throws Exception {
        System.out.println("Importar BT INICIO");

        Registro cabecalho = contexto.getLinhaPai();
        BigDecimal nunota =  (BigDecimal) cabecalho.getCampo("NUNOTA");
        System.out.println("Nunota: "+nunota);
        contexto.setMensagemRetorno("NUNOTA: "+nunota);


        System.out.println("Importar BT FIM");

    }
}
