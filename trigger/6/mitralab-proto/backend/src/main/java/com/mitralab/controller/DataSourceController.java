package com.mitralab.controller;

import com.mitralab.entity.DataSourceDefinitionEntity;
import com.mitralab.service.DataSourceDefinitionService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/data-sources")
public class DataSourceController {

    private final DataSourceDefinitionService service;

    public DataSourceController(DataSourceDefinitionService service) {
        this.service = service;
    }

    public record PgQueryRequest(
            @NotBlank String name, String description, @NotBlank String sql) {}

    public record ExtQueryRequest(
            @NotBlank String name, String description, Long connectionId, @NotBlank String sql) {}

    @GetMapping
    public List<DataSourceDefinitionEntity> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public DataSourceDefinitionEntity get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/postgres-query")
    public DataSourceDefinitionEntity createPg(@RequestBody PgQueryRequest req) {
        return service.createPostgresQuery(req.name(), req.description(), req.sql());
    }

    @PostMapping("/external-query")
    public DataSourceDefinitionEntity createExt(@RequestBody ExtQueryRequest req) {
        return service.createExternalQuery(req.name(), req.description(), req.connectionId(), req.sql());
    }

    @PostMapping("/{id}/preview")
    public List<Map<String, Object>> preview(@PathVariable Long id, @RequestParam(defaultValue = "500") int maxRows) {
        return service.preview(id, maxRows);
    }
}
