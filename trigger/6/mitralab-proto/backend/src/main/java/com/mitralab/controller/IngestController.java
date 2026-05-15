package com.mitralab.controller;

import com.mitralab.entity.DataSourceDefinitionEntity;
import com.mitralab.service.IngestService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ingest")
public class IngestController {

    private final IngestService ingestService;

    public IngestController(IngestService ingestService) {
        this.ingestService = ingestService;
    }

    public record IngestRequest(
            @NotNull Long connectionId, @NotBlank String sql, @NotBlank String name, Integer maxRows) {}

    @PostMapping("/snapshot")
    public DataSourceDefinitionEntity snapshot(@RequestBody IngestRequest req) throws Exception {
        int max = req.maxRows() != null ? req.maxRows() : 5000;
        return ingestService.ingestFromExternal(req.connectionId(), req.sql(), req.name(), max);
    }
}
