package com.b3.investidor;

import com.b3.investidor.client.B3ApiClient;
import com.b3.investidor.exception.B3ApiException;
import com.b3.investidor.model.ProvisionedEvents;
import com.b3.investidor.model.ProvisionedEventsResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Scanner;

/**
 * Classe principal da aplicação para demonstrar o uso da API da B3
 */
public class Application {
    
    private static final Logger logger = LoggerFactory.getLogger(Application.class);
    
    public static void main(String[] args) {
        try {
            // Configuração do cliente
            System.out.println("=== Cliente API B3 - Eventos Provisionados ===");
            System.out.println();
            
            String documentNumber;
            String dateInput;
            String apiKey = "";
            Scanner scanner = new Scanner(System.in);
            
            // Verifica se os argumentos foram fornecidos via linha de comando
            if (args.length >= 1) {
                documentNumber = args[0].trim();
                dateInput = args.length >= 2 ? args[1].trim() : "";
                apiKey = args.length >= 3 ? args[2].trim() : "";
            } else {
                // Modo interativo
                System.out.print("Digite o CPF/CNPJ do investidor: ");
                documentNumber = scanner.nextLine().trim();
                
                System.out.print("Digite a data de referência (AAAA-MM-DD) ou pressione Enter para usar hoje: ");
                dateInput = scanner.nextLine().trim();
            }
            
            Date referenceDate;
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
            
            if (dateInput.isEmpty()) {
                // D-1 conforme documentação
                Calendar cal = Calendar.getInstance();
                cal.add(Calendar.DAY_OF_MONTH, -1);
                referenceDate = cal.getTime();
            } else {
                try {
                    referenceDate = dateFormat.parse(dateInput);
                } catch (ParseException e) {
                    System.err.println("Formato de data inválido. Usando D-1 como padrão.");
                    Calendar cal = Calendar.getInstance();
                    cal.add(Calendar.DAY_OF_MONTH, -1);
                    referenceDate = cal.getTime();
                }
            }
            
            // Solicita chave da API apenas no modo interativo
            if (args.length == 0) {
                System.out.print("Digite sua chave da API (ou pressione Enter para pular): ");
                apiKey = scanner.nextLine().trim();
            }
            
            // Cria o cliente da API
            B3ApiClient client = new B3ApiClient(B3ApiClient.CERTIFICATION_URL, apiKey.isEmpty() ? null : apiKey);
            
            // Faz a consulta
            System.out.println();
            System.out.println("Consultando eventos provisionados...");
            System.out.println("CPF/CNPJ: " + documentNumber);
            System.out.println("Data de referência: " + dateFormat.format(referenceDate));
            System.out.println();
            
            ProvisionedEventsResponse response = client.getProvisionedEvents(documentNumber, referenceDate);
            
            // Exibe os resultados
            displayResults(response);
            
            // Pergunta se quer consultar outras páginas
            if (response.getLinks() != null && response.getLinks().getNext() != null) {
                System.out.println();
                System.out.print("Existem mais páginas. Deseja consultar a próxima página? (s/n): ");
                String nextPage = scanner.nextLine().trim().toLowerCase();
                
                if ("s".equals(nextPage) || "sim".equals(nextPage)) {
                    // Aqui você poderia implementar a lógica para buscar a próxima página
                    System.out.println("Funcionalidade de paginação pode ser implementada conforme necessário.");
                }
            }
            
        } catch (B3ApiException e) {
            System.err.println("Erro na API da B3:");
            System.err.println("Status: " + e.getStatusCode());
            System.err.println("Mensagem: " + e.getMessage());
            
            if (e.isAuthenticationError()) {
                System.err.println("Verifique suas credenciais de acesso.");
            } else if (e.isRateLimitError()) {
                System.err.println("Muitas requisições. Tente novamente em alguns minutos.");
            }
            
        } catch (Exception e) {
            logger.error("Erro inesperado", e);
            System.err.println("Erro inesperado: " + e.getMessage());
        }
    }
    
    /**
     * Exibe os resultados da consulta de forma formatada
     */
    private static void displayResults(ProvisionedEventsResponse response) {
        if (response == null || response.getData() == null || 
            response.getData().getProvisionedEvents() == null || 
            response.getData().getProvisionedEvents().isEmpty()) {
            
            System.out.println("Nenhum evento provisionado encontrado para os parâmetros informados.");
            return;
        }
        
        List<ProvisionedEvents> events = response.getData().getProvisionedEvents();
        
        System.out.println("=== EVENTOS PROVISIONADOS ENCONTRADOS ===");
        System.out.println("Total de eventos: " + events.size());
        System.out.println();
        
        for (int i = 0; i < events.size(); i++) {
            ProvisionedEvents event = events.get(i);
            
            System.out.println("--- Evento " + (i + 1) + " ---");
            System.out.println("Tipo: " + event.getCorporateActionTypeDescription());
            System.out.println("Empresa: " + event.getCorporationName());
            System.out.println("Ticker: " + event.getTickerSymbol());
            System.out.println("Data de Pagamento: " + 
                (event.getPaymentDate() != null ? new SimpleDateFormat("yyyy-MM-dd").format(event.getPaymentDate()) : "N/A"));
            System.out.println("Valor do Evento: R$ " + formatCurrency(event.getEventValue()));
            System.out.println("Valor Líquido: R$ " + formatCurrency(event.getNetValue()));
            System.out.println("Quantidade: " + formatNumber(event.getEventQuantity()));
            System.out.println("Participante: " + event.getParticipantName());
            
            if (event.getReasons() != null && !event.getReasons().isEmpty()) {
                System.out.println("Motivos de Indisponibilidade:");
                event.getReasons().forEach(reason -> 
                    System.out.println("  - " + reason.getReasonName() + 
                        (reason.getCollateralQuantity() != null ? 
                            " (Qtd: " + formatNumber(reason.getCollateralQuantity()) + ")" : "")));
            }
            
            System.out.println();
        }
        
        // Exibe informações de paginação
        if (response.getLinks() != null) {
            System.out.println("=== INFORMAÇÕES DE PAGINAÇÃO ===");
            System.out.println("Página atual: " + response.getLinks().getSelf());
            if (response.getLinks().getNext() != null) {
                System.out.println("Próxima página disponível: " + response.getLinks().getNext());
            }
            if (response.getLinks().getLast() != null) {
                System.out.println("Última página: " + response.getLinks().getLast());
            }
        }
    }
    
    /**
     * Formata valores monetários
     */
    private static String formatCurrency(Double value) {
        if (value == null) {
            return "0,00";
        }
        return String.format("%.2f", value).replace(".", ",");
    }
    
    /**
     * Formata números
     */
    private static String formatNumber(Double value) {
        if (value == null) {
            return "0";
        }
        if (value == value.longValue()) {
            return String.valueOf(value.longValue());
        }
        return String.format("%.2f", value).replace(".", ",");
    }
}
