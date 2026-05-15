package com.mitralab.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Core AI layer: builds structured prompts, calls {@link AIProvider}, parses dashboard plans.
 */
@Service
public class AiEngineService {

    private static final String PLAN_INSTRUCTION =
            """
            You are an analytics copilot. The user describes what they want to see.
            Respond with a single JSON object ONLY (no markdown) with keys:
            intent: one of DASHBOARD, QUERY, SUMMARY
            sql: a single SELECT (or WITH) query appropriate for PostgreSQL unless schema says otherwise
            chartType: bar | line | area | pie (use bar for comparisons over categories)
            xKey: column name for X axis / category
            yKey: numeric column name for Y axis (or first measure)
            explanation: one short sentence in Portuguese or English matching the user language

            Rules: read-only SQL only; use clear column aliases matching xKey and yKey.
            """;

    private final AIProvider aiProvider;
    private final ObjectMapper objectMapper;

    public AiEngineService(AIProvider aiProvider, ObjectMapper objectMapper) {
        this.aiProvider = aiProvider;
        this.objectMapper = objectMapper;
    }

    public DashboardPlan planDashboardFromPrompt(String userPrompt, String schemaHint) {
        StringBuilder sb = new StringBuilder();
        sb.append(PLAN_INSTRUCTION.trim()).append("\n\n");
        if (StringUtils.hasText(schemaHint)) {
            sb.append("Database / schema hint:\n").append(schemaHint).append("\n\n");
        }
        sb.append("User request:\n").append(userPrompt);

        String raw = aiProvider.generate(sb.toString());
        String json = stripMarkdownFence(raw);
        try {
            return objectMapper.readValue(json, DashboardPlan.class);
        } catch (Exception e) {
            throw new IllegalStateException("AI did not return valid JSON plan: " + raw, e);
        }
    }

    private static String stripMarkdownFence(String raw) {
        if (raw == null) {
            return "";
        }
        String t = raw.trim();
        if (t.startsWith("```")) {
            int start = t.indexOf('\n');
            int end = t.lastIndexOf("```");
            if (start > 0 && end > start) {
                return t.substring(start + 1, end).trim();
            }
        }
        return t;
    }
}
