package com.mitralab.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Registered external database. Password is never stored in plain text in DB:
 * use {@code passwordEnvKey} pointing to an environment variable (Docker secrets / k8s).
 */
@Entity
@Table(name = "external_connection")
public class ExternalConnectionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    private DatabaseType type;

    @NotBlank
    private String host;

    private int port;

    @NotBlank
    @Column(name = "database_name")
    private String databaseName;

    @NotBlank
    private String username;

    /**
     * Name of env var holding the password, e.g. ORACLE_FINANCE_PASSWORD.
     */
    @Column(name = "password_env_key")
    private String passwordEnvKey;

    /**
     * Dev-only escape hatch when {@link com.mitralab.MitralabProperties#allowInlineConnectionPassword} is true.
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "dev_password")
    private String devPassword;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public DatabaseType getType() {
        return type;
    }

    public void setType(DatabaseType type) {
        this.type = type;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getDatabaseName() {
        return databaseName;
    }

    public void setDatabaseName(String databaseName) {
        this.databaseName = databaseName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordEnvKey() {
        return passwordEnvKey;
    }

    public void setPasswordEnvKey(String passwordEnvKey) {
        this.passwordEnvKey = passwordEnvKey;
    }

    public String getDevPassword() {
        return devPassword;
    }

    public void setDevPassword(String devPassword) {
        this.devPassword = devPassword;
    }
}
