package com.mitralab.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitralab.MitralabProperties;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

public class OllamaProvider implements AIProvider {

    private final RestClient restClient;
    private final MitralabProperties properties;
    private final ObjectMapper objectMapper;

    public OllamaProvider(
            RestClient.Builder restClientBuilder, MitralabProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        String base = properties.getAi().getOllama().getBaseUrl().replaceAll("/$", "");
        this.restClient = restClientBuilder.baseUrl(base).build();
    }

    @Override
    public String generate(String prompt) {
        String model = properties.getAi().getOllama().getModel();
        Map<String, Object> body =
                Map.of(
                        "model",
                        model,
                        "stream",
                        false,
                        "messages",
                        List.of(
                                Map.of(
                                        "role",
                                        "system",
                                        "content",
                                        "You are a data assistant. Reply with ONLY valid JSON, no markdown."),
                                Map.of("role", "user", "content", prompt)));

        String raw =
                restClient
                        .post()
                        .uri("/api/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(raw);
            return root.path("message").path("content").asText();
        } catch (Exception e) {
            throw new IllegalStateException("Ollama response parse failed: " + raw, e);
        }
    }
}
