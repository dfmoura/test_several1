package com.mitralab.datasource;

import org.springframework.util.StringUtils;

/**
 * Minimal guard for ad-hoc SQL in a prototype: read-only single statement.
 */
public final class SqlSafety {

    private SqlSafety() {}

    public static void assertSelectOnly(String sql) {
        if (!StringUtils.hasText(sql)) {
            throw new IllegalArgumentException("SQL is empty");
        }
        String trimmed = sql.trim();
        if (trimmed.endsWith(";")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1).trim();
        }
        // Block obvious multi-statement attempts
        if (trimmed.contains(";")) {
            throw new IllegalArgumentException("Multiple statements are not allowed");
        }
        String upper = trimmed.toUpperCase();
        if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
            throw new IllegalArgumentException("Only SELECT / WITH queries are allowed");
        }
    }
}
