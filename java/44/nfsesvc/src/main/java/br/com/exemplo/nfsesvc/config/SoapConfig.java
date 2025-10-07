package br.com.exemplo.nfsesvc.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.ws.transport.http.HttpComponents5MessageSender;
import java.time.Duration;

/**
 * Configura o cliente SOAP com timeouts via propriedades.
 */
@Configuration
public class SoapConfig {
	@Value("${nfsesvc.soap.timeoutMs}")
	private int timeoutMs;

	@Bean
    public HttpComponents5MessageSender messageSender() {
        HttpComponents5MessageSender sender = new HttpComponents5MessageSender();
        sender.setConnectionTimeout(Duration.ofMillis(timeoutMs));
        sender.setReadTimeout(Duration.ofMillis(timeoutMs));
        return sender;
	}
}
