package com.mitralab.service;

import com.mitralab.entity.ExternalConnectionEntity;
import com.mitralab.repository.ExternalConnectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ExternalConnectionService {

    private final ExternalConnectionRepository repository;

    public ExternalConnectionService(ExternalConnectionRepository repository) {
        this.repository = repository;
    }

    public List<ExternalConnectionEntity> list() {
        return repository.findAll();
    }

    public ExternalConnectionEntity get(Long id) {
        return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Connection not found"));
    }

    @Transactional
    public ExternalConnectionEntity create(ExternalConnectionEntity e) {
        return repository.save(e);
    }

    @Transactional
    public ExternalConnectionEntity update(Long id, ExternalConnectionEntity patch) {
        ExternalConnectionEntity e = get(id);
        e.setName(patch.getName());
        e.setType(patch.getType());
        e.setHost(patch.getHost());
        e.setPort(patch.getPort());
        e.setDatabaseName(patch.getDatabaseName());
        e.setUsername(patch.getUsername());
        e.setPasswordEnvKey(patch.getPasswordEnvKey());
        e.setDevPassword(patch.getDevPassword());
        return repository.save(e);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
