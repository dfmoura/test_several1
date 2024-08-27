package botaoAcao;
import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URL;
import java.util.Scanner;


public class DolarBT implements AcaoRotinaJava{

	@Override
	public void doAction(ContextoAcao contexto) throws Exception {
		try {
			// URL da API do Banco Central do Brasil para obter o valor do dólar
			URL url = new URL("https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados/ultimos/1?formato=json");

			// Conectar à URL e obter o JSON como String
			Scanner scanner = new Scanner(url.openStream());
			StringBuilder jsonBuilder = new StringBuilder();
			while (scanner.hasNextLine()) {
				jsonBuilder.append(scanner.nextLine());
			}
			scanner.close();

			// Converter a String JSON em um objeto JsonNode usando o ObjectMapper
			ObjectMapper objectMapper = new ObjectMapper();
			JsonNode jsonNode = objectMapper.readTree(jsonBuilder.toString());

			// Obter o valor do dólar do JsonNode
			double valorDolar = jsonNode.get(0).get("valor").asDouble();

			// Definir a mensagem de retorno com o valor do dólar
			contexto.setMensagemRetorno("O valor ultima PTAX do dólar é: R$ " + valorDolar);
		} catch (IOException e) {
			e.printStackTrace();
			contexto.setMensagemRetorno("Erro ao obter o valor do dólar.");
		}
	}
}
