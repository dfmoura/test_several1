package com.mitralab.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "dashboard_widget")
public class DashboardWidgetEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dashboard_id", nullable = false)
    private DashboardEntity dashboard;

    @NotBlank
    private String title;

    /**
     * bar | line | area | pie (Recharts-friendly).
     */
    @NotBlank
    @Column(name = "chart_type")
    private String chartType;

    /**
     * Optional: reuse a logical data source. If null, {@code sqlText} + optional connection apply.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_source_id")
    private DataSourceDefinitionEntity dataSource;

    @Column(name = "sql_text", columnDefinition = "TEXT")
    private String sqlText;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "external_connection_id")
    private ExternalConnectionEntity externalConnection;

    @NotNull
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "chart_config", columnDefinition = "jsonb")
    private Map<String, Object> chartConfig = new HashMap<>();

    public Long getId() {
        return id;
    }

    public DashboardEntity getDashboard() {
        return dashboard;
    }

    public void setDashboard(DashboardEntity dashboard) {
        this.dashboard = dashboard;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getChartType() {
        return chartType;
    }

    public void setChartType(String chartType) {
        this.chartType = chartType;
    }

    public DataSourceDefinitionEntity getDataSource() {
        return dataSource;
    }

    public void setDataSource(DataSourceDefinitionEntity dataSource) {
        this.dataSource = dataSource;
    }

    public String getSqlText() {
        return sqlText;
    }

    public void setSqlText(String sqlText) {
        this.sqlText = sqlText;
    }

    public ExternalConnectionEntity getExternalConnection() {
        return externalConnection;
    }

    public void setExternalConnection(ExternalConnectionEntity externalConnection) {
        this.externalConnection = externalConnection;
    }

    public Map<String, Object> getChartConfig() {
        return chartConfig;
    }

    public void setChartConfig(Map<String, Object> chartConfig) {
        this.chartConfig = chartConfig;
    }
}
