package com.mitralab.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitralab.MitralabProperties;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

public class OpenAiProvider implements AIProvider {

    private final RestClient restClient;
    private final MitralabProperties properties;
    private final ObjectMapper objectMapper;

    public OpenAiProvider(
            RestClient.Builder restClientBuilder, MitralabProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        String base = properties.getAi().getOpenai().getBaseUrl().replaceAll("/$", "");
        this.restClient = restClientBuilder.baseUrl(base).build();
    }

    @Override
    public String generate(String prompt) {
        String key = properties.getAi().getOpenai().getApiKey();
        if (!StringUtils.hasText(key)) {
            throw new IllegalStateException("OPENAI_API_KEY / mitralab.ai.openai.api-key is not set");
        }
        String model = properties.getAi().getOpenai().getModel();
        Map<String, Object> body =
                Map.of(
                        "model",
                        model,
                        "messages",
                        List.of(
                                Map.of(
                                        "role",
                                        "system",
                                        "content",
                                        "You output ONLY valid JSON, no markdown fences."),
                                Map.of("role", "user", "content", prompt)),
                        "temperature",
                        0.2);

        String raw =
                restClient
                        .post()
                        .uri("/v1/chat/completions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + key)
                        .body(body)
                        .retrieve()
                        .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(raw);
            return root.path("choices").path(0).path("message").path("content").asText();
        } catch (Exception e) {
            throw new IllegalStateException("OpenAI response parse failed: " + raw, e);
        }
    }
}
