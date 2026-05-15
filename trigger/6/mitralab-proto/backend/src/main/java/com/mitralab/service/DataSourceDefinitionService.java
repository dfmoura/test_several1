package com.mitralab.service;

import com.mitralab.datasource.LogicalDataSourceRunner;
import com.mitralab.entity.DataSourceDefinitionEntity;
import com.mitralab.entity.DataSourceMode;
import com.mitralab.entity.ExternalConnectionEntity;
import com.mitralab.repository.DataSourceDefinitionRepository;
import com.mitralab.repository.ExternalConnectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class DataSourceDefinitionService {

    private final DataSourceDefinitionRepository repository;
    private final ExternalConnectionRepository connectionRepository;
    private final LogicalDataSourceRunner runner;

    public DataSourceDefinitionService(
            DataSourceDefinitionRepository repository,
            ExternalConnectionRepository connectionRepository,
            LogicalDataSourceRunner runner) {
        this.repository = repository;
        this.connectionRepository = connectionRepository;
        this.runner = runner;
    }

    public List<DataSourceDefinitionEntity> list() {
        return repository.findAll();
    }

    public DataSourceDefinitionEntity get(Long id) {
        return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Data source not found"));
    }

    @Transactional
    public DataSourceDefinitionEntity createPostgresQuery(String name, String description, String sql) {
        DataSourceDefinitionEntity e = new DataSourceDefinitionEntity();
        e.setName(name);
        e.setDescription(description);
        e.setMode(DataSourceMode.POSTGRES_QUERY);
        e.setSqlText(sql);
        return repository.save(e);
    }

    @Transactional
    public DataSourceDefinitionEntity createExternalQuery(
            String name, String description, Long connectionId, String sql) {
        ExternalConnectionEntity c =
                connectionRepository.findById(connectionId).orElseThrow(() -> new IllegalArgumentException("Bad conn"));
        DataSourceDefinitionEntity e = new DataSourceDefinitionEntity();
        e.setName(name);
        e.setDescription(description);
        e.setMode(DataSourceMode.EXTERNAL_QUERY);
        e.setExternalConnection(c);
        e.setSqlText(sql);
        return repository.save(e);
    }

    public List<Map<String, Object>> preview(Long id, int maxRows) {
        return runner.run(get(id), maxRows);
    }
}
