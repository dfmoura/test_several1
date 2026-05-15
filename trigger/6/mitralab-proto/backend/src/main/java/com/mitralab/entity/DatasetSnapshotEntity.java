package com.mitralab.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

/**
 * Stores ingested query results as JSON (prototype-friendly; swap for columnar tables later).
 */
@Entity
@Table(name = "dataset_snapshot")
public class DatasetSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @NotBlank
    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }
}
