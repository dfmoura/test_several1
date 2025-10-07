package br.com.exemplo.nfsesvc.service;

import br.com.exemplo.nfsesvc.client.NfseSoapClient;
import br.com.exemplo.nfsesvc.dto.NfseRequests.GerarRequest;
import br.com.exemplo.nfsesvc.dto.NfseResponses.OperacaoResponse;
import br.com.exemplo.nfsesvc.dto.NfseResponses.ConsultaResponse;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Implementacao simples do fluxo utilizando templates XML do classpath.
 */
@Service
public class NfseServiceImpl implements NfseService {
	private final NfseSoapClient client;

	public NfseServiceImpl(NfseSoapClient client) {
		this.client = client;
	}

	@Override
	public OperacaoResponse gerar(GerarRequest request) {
		String xml = TemplateLoader.load("templates/SOAP-env-gerar.xml", Map.of(
			"cnpjPrestador", request.cnpjPrestador(),
			"inscricaoMunicipal", request.inscricaoMunicipal(),
			"tomadorCpfCnpj", request.tomadorCpfCnpj(),
			"descricaoServico", request.descricaoServico(),
			"valorServicos", request.valorServicos().toPlainString(),
			"competencia", request.competencia() != null ? request.competencia() : "",
			"numeroRps", request.numeroRps() != null ? request.numeroRps() : ""
		));
		String resp = client.enviar("gerarNfse", xml);
		// TODO: parsear XML de resposta de acordo com o provedor
		return new OperacaoResponse(true, "Gerado com sucesso", "PROTOCOLO-MOCK", "NUMERO-MOCK");
	}

	@Override
	public ConsultaResponse consultar(String numeroNfse) {
		String xml = TemplateLoader.load("templates/SOAP-env-consultar.xml", Map.of(
			"numeroNfse", numeroNfse
		));
		String resp = client.enviar("consultarNfse", xml);
		return new ConsultaResponse(true, "Consulta realizada", resp != null ? resp : "");
	}

	@Override
	public OperacaoResponse cancelar(String numeroNfse, String motivo) {
		String xml = TemplateLoader.load("templates/SOAP-env-cancelar.xml", Map.of(
			"numeroNfse", numeroNfse,
			"motivo", motivo != null ? motivo : ""
		));
		String resp = client.enviar("cancelarNfse", xml);
		return new OperacaoResponse(true, "Cancelado com sucesso", null, numeroNfse);
	}

	static class TemplateLoader {
		static String load(String path, Map<String, String> vars) {
			try {
				var res = new ClassPathResource(path);
				var bytes = res.getContentAsByteArray();
				String content = new String(bytes, StandardCharsets.UTF_8);
				for (var e : vars.entrySet()) {
					content = content.replace("${" + e.getKey() + "}", e.getValue() == null ? "" : e.getValue());
				}
				return content;
			} catch (Exception ex) {
				throw new RuntimeException("Falha ao carregar template: " + path, ex);
			}
		}
	}
}
