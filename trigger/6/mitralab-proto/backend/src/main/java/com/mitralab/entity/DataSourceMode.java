package com.mitralab.entity;

/**
 * How logical data is resolved at runtime.
 */
public enum DataSourceMode {
    /** Run SQL on the app's PostgreSQL (primary datasource). */
    POSTGRES_QUERY,
    /** Run SQL on a registered external connection (Oracle / SQL Server / remote PG). */
    EXTERNAL_QUERY,
    /** Result of a prior ingest: JSON snapshot stored in PostgreSQL. */
    SNAPSHOT
}
