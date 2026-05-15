package com.mitralab.controller;

import com.mitralab.datasource.AppPostgresQueryService;
import com.mitralab.datasource.ExternalJdbcQueryService;
import com.mitralab.entity.ExternalConnectionEntity;
import com.mitralab.service.ExternalConnectionService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/query")
public class QueryExplorerController {

    private final AppPostgresQueryService appPostgresQueryService;
    private final ExternalJdbcQueryService externalJdbcQueryService;
    private final ExternalConnectionService connectionService;

    public QueryExplorerController(
            AppPostgresQueryService appPostgresQueryService,
            ExternalJdbcQueryService externalJdbcQueryService,
            ExternalConnectionService connectionService) {
        this.appPostgresQueryService = appPostgresQueryService;
        this.externalJdbcQueryService = externalJdbcQueryService;
        this.connectionService = connectionService;
    }

    public record ExploreRequest(Long connectionId, @NotBlank String sql, Integer maxRows) {}

    @PostMapping("/explore")
    public List<Map<String, Object>> explore(@RequestBody ExploreRequest req) {
        int max = req.maxRows() != null ? req.maxRows() : 500;
        if (req.connectionId() == null) {
            return appPostgresQueryService.query(req.sql(), max);
        }
        ExternalConnectionEntity c = connectionService.get(req.connectionId());
        return externalJdbcQueryService.execute(c, req.sql(), max);
    }
}
