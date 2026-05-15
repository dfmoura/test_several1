package com.mitralab.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Logical "Data Source" — either a query (app or external DB) or a materialized snapshot.
 */
@Entity
@Table(name = "data_source_definition")
public class DataSourceDefinitionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @Column(length = 2000)
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    private DataSourceMode mode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "external_connection_id")
    private ExternalConnectionEntity externalConnection;

    @Column(name = "sql_text", columnDefinition = "TEXT")
    private String sqlText;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_id")
    private DatasetSnapshotEntity snapshot;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public DataSourceMode getMode() {
        return mode;
    }

    public void setMode(DataSourceMode mode) {
        this.mode = mode;
    }

    public ExternalConnectionEntity getExternalConnection() {
        return externalConnection;
    }

    public void setExternalConnection(ExternalConnectionEntity externalConnection) {
        this.externalConnection = externalConnection;
    }

    public String getSqlText() {
        return sqlText;
    }

    public void setSqlText(String sqlText) {
        this.sqlText = sqlText;
    }

    public DatasetSnapshotEntity getSnapshot() {
        return snapshot;
    }

    public void setSnapshot(DatasetSnapshotEntity snapshot) {
        this.snapshot = snapshot;
    }
}
