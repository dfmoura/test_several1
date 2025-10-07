package br.com.exemplo.nfsesvc.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.ws.client.core.WebServiceTemplate;
import org.springframework.ws.transport.http.HttpComponents5MessageSender;
import org.springframework.xml.transform.StringResult;
import org.springframework.xml.transform.StringSource;

/**
 * Cliente SOAP minimalista baseado em WebServiceTemplate.
 * Ajuste o envelope, namespaces e cabeçalhos conforme a documentação
 * oficial do provedor (ABRASF/município).
 */
@Component
public class NfseSoapClient {
    private static final Logger log = LoggerFactory.getLogger(NfseSoapClient.class);

    private final WebServiceTemplate webServiceTemplate;

    public NfseSoapClient(
            HttpComponents5MessageSender messageSender,
            @Value("${nfsesvc.soap.endpoint}") String endpoint
    ) {
        this.webServiceTemplate = new WebServiceTemplate();
        this.webServiceTemplate.setDefaultUri(endpoint);
        this.webServiceTemplate.setMessageSender(messageSender);
    }

    /**
     * Envia o envelope SOAP como texto e retorna o corpo de resposta como XML string.
     */
    public String enviar(String action, String xmlEnvelope) {
        log.info("Enviando acao={} ao endpoint={} (tamanhoEnvelope={}B)", action, webServiceTemplate.getDefaultUri(), xmlEnvelope.length());
        var requestPayload = new StringSource(xmlEnvelope);
        var resultHolder = new StringResult();
        // Se o provedor exigir SOAPAction, configurar interceptor/transport conforme manual
        webServiceTemplate.sendSourceAndReceiveToResult(requestPayload, message -> {}, resultHolder);
        return resultHolder.toString();
    }
}


