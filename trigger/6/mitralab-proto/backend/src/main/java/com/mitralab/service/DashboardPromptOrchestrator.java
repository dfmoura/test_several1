package com.mitralab.service;

import com.mitralab.ai.AiEngineService;
import com.mitralab.ai.DashboardPlan;
import com.mitralab.datasource.AppPostgresQueryService;
import com.mitralab.datasource.ExternalJdbcQueryService;
import com.mitralab.entity.ExternalConnectionEntity;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * End-to-end flow: prompt → AI plan → execute SQL → chart config for the UI.
 */
@Service
public class DashboardPromptOrchestrator {

    private static final String DEFAULT_SCHEMA_HINT =
            """
            PostgreSQL. Sample table: demo_sales(month_ord int, month_label text, amount numeric).
            """;

    private final AiEngineService aiEngineService;
    private final AppPostgresQueryService appPostgresQueryService;
    private final ExternalJdbcQueryService externalJdbcQueryService;

    public DashboardPromptOrchestrator(
            AiEngineService aiEngineService,
            AppPostgresQueryService appPostgresQueryService,
            ExternalJdbcQueryService externalJdbcQueryService) {
        this.aiEngineService = aiEngineService;
        this.appPostgresQueryService = appPostgresQueryService;
        this.externalJdbcQueryService = externalJdbcQueryService;
    }

    public Map<String, Object> run(String userPrompt, ExternalConnectionEntity externalOrNull, String schemaHint) {
        String hint = schemaHint != null && !schemaHint.isBlank() ? schemaHint : DEFAULT_SCHEMA_HINT;
        DashboardPlan plan = aiEngineService.planDashboardFromPrompt(userPrompt, hint);

        List<Map<String, Object>> rows;
        if (externalOrNull != null) {
            rows = externalJdbcQueryService.execute(externalOrNull, plan.sql(), 2000);
        } else {
            rows = appPostgresQueryService.query(plan.sql(), 2000);
        }

        Map<String, Object> chartConfig = new HashMap<>();
        chartConfig.put("xKey", plan.xKey());
        chartConfig.put("yKey", plan.yKey());

        Map<String, Object> out = new HashMap<>();
        out.put("plan", plan);
        out.put("rows", rows);
        out.put("chartConfig", chartConfig);
        return out;
    }
}
