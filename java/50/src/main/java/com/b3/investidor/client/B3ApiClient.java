package com.b3.investidor.client;

import com.b3.investidor.exception.B3ApiException;
import com.b3.investidor.model.ProvisionedEventsResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.HttpStatus;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URLEncoder;
import java.io.UnsupportedEncodingException;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Cliente para consumir a API de Eventos Provisionados da B3
 */
public class B3ApiClient {
    
    private static final Logger logger = LoggerFactory.getLogger(B3ApiClient.class);
    
    private final String baseUrl;
    private final String apiKey;
    private final ObjectMapper objectMapper;
    private final CloseableHttpClient httpClient;
    
    // URLs dos ambientes
    public static final String CERTIFICATION_URL = "https://apib3i-cert.b3.com.br:2443";
    public static final String PRODUCTION_URL = "https://investidor.b3.com.br:2443";
    
    /**
     * Construtor do cliente
     * @param baseUrl URL base da API (certificação ou produção)
     * @param apiKey Chave da API para autenticação
     */
    public B3ApiClient(String baseUrl, String apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClients.createDefault();
    }
    
    /**
     * Busca eventos provisionados para um investidor
     * @param documentNumber CPF/CNPJ do investidor
     * @param referenceDate Data de referência no formato AAAA-MM-DD
     * @param page Número da página (opcional, padrão é 1)
     * @return Resposta com os eventos provisionados
     * @throws B3ApiException Em caso de erro na API
     */
    public ProvisionedEventsResponse getProvisionedEvents(String documentNumber, 
                                                         Date referenceDate, 
                                                         Integer page) throws B3ApiException {
        
        try {
            // Validação dos parâmetros obrigatórios
            if (documentNumber == null || documentNumber.trim().isEmpty()) {
                throw new IllegalArgumentException("Número do documento é obrigatório");
            }
            
            if (referenceDate == null) {
                throw new IllegalArgumentException("Data de referência é obrigatória");
            }
            
            // Construção da URL
            String url = buildUrl(documentNumber, referenceDate, page);
            logger.info("Fazendo requisição para: {}", url);
            
            // Criação da requisição HTTP
            HttpGet request = new HttpGet(url);
            request.setHeader("Accept", "application/json");
            request.setHeader("Content-Type", "application/json");
            
            // Adiciona header de autenticação se a chave foi fornecida
            if (apiKey != null && !apiKey.trim().isEmpty()) {
                request.setHeader("Authorization", "Bearer " + apiKey);
            }
            
            // Execução da requisição
            try (CloseableHttpResponse response = httpClient.execute(request)) {
                String responseBody = EntityUtils.toString(response.getEntity(), "UTF-8");
                
                int statusCode = response.getStatusLine().getStatusCode();
                logger.info("Resposta recebida com status: {}", statusCode);
                
                if (statusCode == HttpStatus.SC_OK) {
                    return objectMapper.readValue(responseBody, ProvisionedEventsResponse.class);
                } else {
                    handleErrorResponse(statusCode, responseBody);
                    return null; // Nunca será executado devido ao throw na handleErrorResponse
                }
            }
            
        } catch (IOException e) {
            logger.error("Erro ao fazer requisição para a API da B3", e);
            throw new B3ApiException("Erro de comunicação com a API da B3", e);
        }
    }
    
    /**
     * Busca eventos provisionados para um investidor (versão simplificada)
     * @param documentNumber CPF/CNPJ do investidor
     * @param referenceDate Data de referência no formato AAAA-MM-DD
     * @return Resposta com os eventos provisionados
     * @throws B3ApiException Em caso de erro na API
     */
    public ProvisionedEventsResponse getProvisionedEvents(String documentNumber, 
                                                         Date referenceDate) throws B3ApiException {
        return getProvisionedEvents(documentNumber, referenceDate, 1);
    }
    
    /**
     * Constrói a URL da requisição
     */
    private String buildUrl(String documentNumber, Date referenceDate, Integer page) throws B3ApiException {
        StringBuilder url = new StringBuilder();
        url.append(baseUrl);
        url.append("/api/provisioned-events/v2/investors/");
        
        try {
            url.append(URLEncoder.encode(documentNumber, "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            throw new B3ApiException("Erro ao codificar URL", e);
        }
        
        url.append("?referenceDate=");
        
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        url.append(dateFormat.format(referenceDate));
        
        if (page != null && page > 1) {
            url.append("&page=").append(page);
        }
        
        return url.toString();
    }
    
    /**
     * Trata respostas de erro da API
     */
    private void handleErrorResponse(int statusCode, String responseBody) throws B3ApiException {
        String errorMessage;
        
        switch (statusCode) {
            case HttpStatus.SC_BAD_REQUEST:
                errorMessage = "Requisição inválida (400): " + responseBody;
                break;
            case HttpStatus.SC_UNAUTHORIZED:
                errorMessage = "Não autorizado (401): Verifique suas credenciais";
                break;
            case HttpStatus.SC_FORBIDDEN:
                errorMessage = "Acesso negado (403): Você não tem permissão para acessar este recurso";
                break;
            case HttpStatus.SC_NOT_FOUND:
                errorMessage = "Recurso não encontrado (404): CPF/CNPJ ou data não encontrados";
                break;
            case HttpStatus.SC_UNPROCESSABLE_ENTITY:
                errorMessage = "Entidade não processável (422): " + responseBody;
                break;
            case 429: // Too Many Requests
                errorMessage = "Muitas requisições (429): Tente novamente mais tarde";
                break;
            case HttpStatus.SC_INTERNAL_SERVER_ERROR:
                errorMessage = "Erro interno do servidor (500): Tente novamente mais tarde";
                break;
            case HttpStatus.SC_SERVICE_UNAVAILABLE:
                errorMessage = "Serviço indisponível (503): Tente novamente mais tarde";
                break;
            default:
                errorMessage = "Erro inesperado (" + statusCode + "): " + responseBody;
        }
        
        logger.error("Erro na API da B3: {}", errorMessage);
        throw new B3ApiException(errorMessage, statusCode);
    }
    
    /**
     * Fecha o cliente HTTP
     */
    public void close() throws IOException {
        if (httpClient != null) {
            httpClient.close();
        }
    }
}
