package com.mitralab.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitralab.MitralabProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Selects exactly one {@link AIProvider} from configuration (pluggable providers).
 */
@Configuration
public class AiConfiguration {

    @Bean
    @ConditionalOnProperty(name = "mitralab.ai.provider", havingValue = "mock", matchIfMissing = true)
    public AIProvider mockAiProvider(ObjectMapper objectMapper) {
        return new MockAiProvider(objectMapper);
    }

    @Bean
    @ConditionalOnProperty(name = "mitralab.ai.provider", havingValue = "openai")
    public AIProvider openAiProvider(
            RestClient.Builder restClientBuilder, MitralabProperties properties, ObjectMapper objectMapper) {
        return new OpenAiProvider(restClientBuilder, properties, objectMapper);
    }

    @Bean
    @ConditionalOnProperty(name = "mitralab.ai.provider", havingValue = "ollama")
    public AIProvider ollamaProvider(
            RestClient.Builder restClientBuilder, MitralabProperties properties, ObjectMapper objectMapper) {
        return new OllamaProvider(restClientBuilder, properties, objectMapper);
    }
}
