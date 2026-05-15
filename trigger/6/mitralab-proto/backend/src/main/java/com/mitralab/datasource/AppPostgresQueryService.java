package com.mitralab.datasource;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Runs read-only SQL against the application's primary PostgreSQL.
 */
@Service
public class AppPostgresQueryService {

    private final JdbcTemplate jdbcTemplate;

    public AppPostgresQueryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> query(String sql, int maxRows) {
        SqlSafety.assertSelectOnly(sql);
        List<Map<String, Object>> rows = new ArrayList<>();
        jdbcTemplate.setMaxRows(maxRows);
        jdbcTemplate.query(
                sql,
                (RowCallbackHandler)
                        rs -> {
                            rows.add(rowMap(rs));
                        });
        return rows;
    }

    private static Map<String, Object> rowMap(ResultSet rs) throws java.sql.SQLException {
        ResultSetMetaData md = rs.getMetaData();
        int cols = md.getColumnCount();
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 1; i <= cols; i++) {
            row.put(md.getColumnLabel(i), rs.getObject(i));
        }
        return row;
    }
}
