package com.mitralab.controller;

import com.mitralab.ai.DashboardPlan;
import com.mitralab.entity.ExternalConnectionEntity;
import com.mitralab.service.DashboardPromptOrchestrator;
import com.mitralab.service.DashboardService;
import com.mitralab.service.ExternalConnectionService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final DashboardPromptOrchestrator orchestrator;
    private final ExternalConnectionService connectionService;
    private final DashboardService dashboardService;

    public AiController(
            DashboardPromptOrchestrator orchestrator,
            ExternalConnectionService connectionService,
            DashboardService dashboardService) {
        this.orchestrator = orchestrator;
        this.connectionService = connectionService;
        this.dashboardService = dashboardService;
    }

    public record DashboardPromptRequest(
            @NotBlank String prompt, Long connectionId, String schemaHint) {}

    public record SaveFromPromptRequest(
            @NotBlank String name,
            String description,
            @NotBlank String prompt,
            Long connectionId,
            String schemaHint) {}

    @PostMapping("/dashboard-prompt")
    public Map<String, Object> dashboardPrompt(@RequestBody DashboardPromptRequest req) {
        ExternalConnectionEntity ext = null;
        if (req.connectionId() != null) {
            ext = connectionService.get(req.connectionId());
        }
        return orchestrator.run(req.prompt(), ext, req.schemaHint());
    }

    @PostMapping("/save-dashboard-from-prompt")
    public com.mitralab.entity.DashboardEntity saveFromPrompt(@RequestBody SaveFromPromptRequest req) {
        ExternalConnectionEntity ext = null;
        if (req.connectionId() != null) {
            ext = connectionService.get(req.connectionId());
        }
        Map<String, Object> run = orchestrator.run(req.prompt(), ext, req.schemaHint());
        DashboardPlan plan = (DashboardPlan) run.get("plan");
        @SuppressWarnings("unchecked")
        Map<String, Object> chartConfig = (Map<String, Object>) run.get("chartConfig");

        DashboardService.WidgetDraft w =
                new DashboardService.WidgetDraft(
                        plan.explanation() != null ? plan.explanation() : "AI widget",
                        plan.chartType(),
                        plan.sql(),
                        null,
                        req.connectionId(),
                        chartConfig);
        return dashboardService.createWithWidgets(req.name(), req.description(), List.of(w));
    }
}
