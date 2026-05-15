package com.mitralab.controller;

import com.mitralab.entity.ExternalConnectionEntity;
import com.mitralab.service.ExternalConnectionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/connections")
public class ExternalConnectionController {

    private final ExternalConnectionService service;

    public ExternalConnectionController(ExternalConnectionService service) {
        this.service = service;
    }

    @GetMapping
    public List<ExternalConnectionEntity> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public ExternalConnectionEntity get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ExternalConnectionEntity create(@Valid @RequestBody ExternalConnectionEntity body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    public ExternalConnectionEntity update(@PathVariable Long id, @Valid @RequestBody ExternalConnectionEntity body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
