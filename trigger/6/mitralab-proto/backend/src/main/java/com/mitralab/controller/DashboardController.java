package com.mitralab.controller;

import com.mitralab.datasource.AppPostgresQueryService;
import com.mitralab.datasource.ExternalJdbcQueryService;
import com.mitralab.datasource.LogicalDataSourceRunner;
import com.mitralab.entity.DashboardEntity;
import com.mitralab.entity.DashboardWidgetEntity;
import com.mitralab.entity.DataSourceDefinitionEntity;
import com.mitralab.entity.ExternalConnectionEntity;
import com.mitralab.repository.DataSourceDefinitionRepository;
import com.mitralab.service.DashboardService;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboards")
public class DashboardController {

    private final DashboardService dashboardService;
    private final LogicalDataSourceRunner logicalDataSourceRunner;
    private final AppPostgresQueryService appPostgresQueryService;
    private final ExternalJdbcQueryService externalJdbcQueryService;
    private final DataSourceDefinitionRepository dataSourceRepository;

    public DashboardController(
            DashboardService dashboardService,
            LogicalDataSourceRunner logicalDataSourceRunner,
            AppPostgresQueryService appPostgresQueryService,
            ExternalJdbcQueryService externalJdbcQueryService,
            DataSourceDefinitionRepository dataSourceRepository) {
        this.dashboardService = dashboardService;
        this.logicalDataSourceRunner = logicalDataSourceRunner;
        this.appPostgresQueryService = appPostgresQueryService;
        this.externalJdbcQueryService = externalJdbcQueryService;
        this.dataSourceRepository = dataSourceRepository;
    }

    @GetMapping
    public List<DashboardEntity> list() {
        return dashboardService.list();
    }

    @GetMapping("/{id}")
    public DashboardEntity get(@PathVariable Long id) {
        return dashboardService.get(id);
    }

    /**
     * Resolves each widget to rows for rendering (prototype: server-side materialization).
     */
    @GetMapping("/{id}/data")
    public Map<String, Object> data(@PathVariable Long id) {
        DashboardEntity d = dashboardService.get(id);
        List<Map<String, Object>> blocks = new ArrayList<>();
        for (DashboardWidgetEntity w : d.getWidgets()) {
            Map<String, Object> block = new HashMap<>();
            block.put("widgetId", w.getId());
            block.put("title", w.getTitle());
            block.put("chartType", w.getChartType());
            block.put("chartConfig", w.getChartConfig());
            block.put("rows", resolveWidgetRows(w));
            blocks.add(block);
        }
        return Map.of("dashboardId", d.getId(), "widgets", blocks);
    }

    private List<Map<String, Object>> resolveWidgetRows(DashboardWidgetEntity w) {
        if (w.getDataSource() != null) {
            DataSourceDefinitionEntity def =
                    dataSourceRepository.findById(w.getDataSource().getId()).orElseThrow();
            return logicalDataSourceRunner.run(def, 2000);
        }
        if (w.getSqlText() != null && !w.getSqlText().isBlank()) {
            ExternalConnectionEntity ext = w.getExternalConnection();
            if (ext != null) {
                return externalJdbcQueryService.execute(ext, w.getSqlText(), 2000);
            }
            return appPostgresQueryService.query(w.getSqlText(), 2000);
        }
        return List.of();
    }

    public record CreateDashboardRequest(
            String name, String description, List<DashboardService.WidgetDraft> widgets) {}

    @PostMapping
    public DashboardEntity create(@RequestBody CreateDashboardRequest req) {
        List<DashboardService.WidgetDraft> w = req.widgets() != null ? req.widgets() : List.of();
        return dashboardService.createWithWidgets(req.name(), req.description(), w);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        dashboardService.delete(id);
    }
}
