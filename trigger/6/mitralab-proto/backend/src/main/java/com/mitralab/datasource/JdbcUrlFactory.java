package com.mitralab.datasource;

import com.mitralab.entity.DatabaseType;
import com.mitralab.entity.ExternalConnectionEntity;

/**
 * Builds JDBC URLs per vendor. Oracle uses service name style {@code //host:port/service}.
 */
public final class JdbcUrlFactory {

    private JdbcUrlFactory() {}

    public static String build(ExternalConnectionEntity c) {
        return switch (c.getType()) {
            case POSTGRESQL -> String.format(
                    "jdbc:postgresql://%s:%d/%s", c.getHost(), c.getPort(), c.getDatabaseName());
            case ORACLE -> String.format(
                    "jdbc:oracle:thin:@//%s:%d/%s", c.getHost(), c.getPort(), c.getDatabaseName());
            case SQLSERVER -> String.format(
                    "jdbc:sqlserver://%s:%d;databaseName=%s;encrypt=false;trustServerCertificate=true",
                    c.getHost(), c.getPort(), c.getDatabaseName());
        };
    }

    public static String driverClass(DatabaseType type) {
        return switch (type) {
            case POSTGRESQL -> "org.postgresql.Driver";
            case ORACLE -> "oracle.jdbc.OracleDriver";
            case SQLSERVER -> "com.microsoft.sqlserver.jdbc.SQLServerDriver";
        };
    }
}
