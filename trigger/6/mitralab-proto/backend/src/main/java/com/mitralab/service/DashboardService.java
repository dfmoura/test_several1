package com.mitralab.service;

import com.mitralab.entity.*;
import com.mitralab.repository.DashboardRepository;
import com.mitralab.repository.DataSourceDefinitionRepository;
import com.mitralab.repository.ExternalConnectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final DataSourceDefinitionRepository dataSourceRepository;
    private final ExternalConnectionRepository connectionRepository;

    public DashboardService(
            DashboardRepository dashboardRepository,
            DataSourceDefinitionRepository dataSourceRepository,
            ExternalConnectionRepository connectionRepository) {
        this.dashboardRepository = dashboardRepository;
        this.dataSourceRepository = dataSourceRepository;
        this.connectionRepository = connectionRepository;
    }

    public List<DashboardEntity> list() {
        return dashboardRepository.findAll();
    }

    public DashboardEntity get(Long id) {
        return dashboardRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Dashboard not found"));
    }

    @Transactional
    public DashboardEntity createWithWidgets(
            String name,
            String description,
            List<WidgetDraft> widgets) {
        DashboardEntity d = new DashboardEntity();
        d.setName(name);
        d.setDescription(description);
        for (WidgetDraft w : widgets) {
            DashboardWidgetEntity dw = new DashboardWidgetEntity();
            dw.setDashboard(d);
            dw.setTitle(w.title());
            dw.setChartType(w.chartType());
            dw.setSqlText(w.sqlText());
            dw.setChartConfig(w.chartConfig() != null ? w.chartConfig() : Map.of());
            if (w.dataSourceId() != null) {
                dw.setDataSource(
                        dataSourceRepository
                                .findById(w.dataSourceId())
                                .orElseThrow(() -> new IllegalArgumentException("dataSource")));
            }
            if (w.externalConnectionId() != null) {
                dw.setExternalConnection(
                        connectionRepository
                                .findById(w.externalConnectionId())
                                .orElseThrow(() -> new IllegalArgumentException("connection")));
            }
            d.getWidgets().add(dw);
        }
        return dashboardRepository.save(d);
    }

    @Transactional
    public void delete(Long id) {
        dashboardRepository.deleteById(id);
    }

    public record WidgetDraft(
            String title,
            String chartType,
            String sqlText,
            Long dataSourceId,
            Long externalConnectionId,
            Map<String, Object> chartConfig) {}
}
