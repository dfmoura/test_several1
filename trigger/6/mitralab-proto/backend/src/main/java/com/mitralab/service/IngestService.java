package com.mitralab.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mitralab.datasource.ExternalJdbcQueryService;
import com.mitralab.entity.*;
import com.mitralab.repository.DataSourceDefinitionRepository;
import com.mitralab.repository.DatasetSnapshotRepository;
import com.mitralab.repository.ExternalConnectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Pulls data from an external connection and stores a JSON snapshot in PostgreSQL.
 */
@Service
public class IngestService {

    private final ExternalConnectionRepository connectionRepository;
    private final DatasetSnapshotRepository snapshotRepository;
    private final DataSourceDefinitionRepository definitionRepository;
    private final ExternalJdbcQueryService externalJdbcQueryService;
    private final ObjectMapper objectMapper;

    public IngestService(
            ExternalConnectionRepository connectionRepository,
            DatasetSnapshotRepository snapshotRepository,
            DataSourceDefinitionRepository definitionRepository,
            ExternalJdbcQueryService externalJdbcQueryService,
            ObjectMapper objectMapper) {
        this.connectionRepository = connectionRepository;
        this.snapshotRepository = snapshotRepository;
        this.definitionRepository = definitionRepository;
        this.externalJdbcQueryService = externalJdbcQueryService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public DataSourceDefinitionEntity ingestFromExternal(
            Long connectionId, String sql, String logicalName, int maxRows) throws Exception {
        ExternalConnectionEntity conn =
                connectionRepository.findById(connectionId).orElseThrow(() -> new IllegalArgumentException("Bad conn"));
        List<Map<String, Object>> rows = externalJdbcQueryService.execute(conn, sql, maxRows);
        String json = objectMapper.writeValueAsString(rows);

        DatasetSnapshotEntity snap = new DatasetSnapshotEntity();
        snap.setName(logicalName);
        snap.setPayloadJson(json);
        snap = snapshotRepository.save(snap);

        DataSourceDefinitionEntity def = new DataSourceDefinitionEntity();
        def.setName(logicalName);
        def.setDescription("Ingested snapshot from connection " + connectionId);
        def.setMode(DataSourceMode.SNAPSHOT);
        def.setSnapshot(snap);
        return definitionRepository.save(def);
    }
}
