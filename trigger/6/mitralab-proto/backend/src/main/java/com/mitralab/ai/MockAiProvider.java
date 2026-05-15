package com.mitralab.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Offline-friendly provider: returns a canned dashboard plan so the stack runs without API keys.
 */
public class MockAiProvider implements AIProvider {

    private final ObjectMapper objectMapper;

    public MockAiProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String generate(String prompt) {
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("intent", "DASHBOARD");
        plan.put(
                "sql",
                "SELECT month_label AS month, amount AS total FROM demo_sales ORDER BY month_ord");
        plan.put("chartType", "bar");
        plan.put("xKey", "month");
        plan.put("yKey", "total");
        plan.put(
                "explanation",
                "Mock AI: usando dados de exemplo (tabela demo_sales). "
                        + "Configure OPENAI_API_KEY ou Ollama para SQL real a partir do prompt.");
        try {
            return objectMapper.writeValueAsString(plan);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}
