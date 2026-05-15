package com.mitralab.datasource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitralab.entity.DataSourceDefinitionEntity;
import com.mitralab.entity.DataSourceMode;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Executes a persisted {@link DataSourceDefinitionEntity} against the right runtime target.
 */
@Service
public class LogicalDataSourceRunner {

    private static final int DEFAULT_MAX = 5000;

    private final AppPostgresQueryService appPostgresQueryService;
    private final ExternalJdbcQueryService externalJdbcQueryService;
    private final ObjectMapper objectMapper;

    public LogicalDataSourceRunner(
            AppPostgresQueryService appPostgresQueryService,
            ExternalJdbcQueryService externalJdbcQueryService,
            ObjectMapper objectMapper) {
        this.appPostgresQueryService = appPostgresQueryService;
        this.externalJdbcQueryService = externalJdbcQueryService;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> run(DataSourceDefinitionEntity def) {
        return run(def, DEFAULT_MAX);
    }

    public List<Map<String, Object>> run(DataSourceDefinitionEntity def, int maxRows) {
        return switch (def.getMode()) {
            case POSTGRES_QUERY -> appPostgresQueryService.query(def.getSqlText(), maxRows);
            case EXTERNAL_QUERY -> externalJdbcQueryService.execute(
                    def.getExternalConnection(), def.getSqlText(), maxRows);
            case SNAPSHOT -> {
                if (def.getSnapshot() == null) {
                    throw new IllegalStateException("Snapshot mode requires snapshot entity");
                }
                yield parseSnapshot(def.getSnapshot().getPayloadJson());
            }
        };
    }

    private List<Map<String, Object>> parseSnapshot(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid snapshot JSON", e);
        }
    }
}
