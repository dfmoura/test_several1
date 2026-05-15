package com.mitralab.datasource;

import com.mitralab.entity.ExternalConnectionEntity;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.*;

@Service
public class ExternalJdbcQueryService {

    private final CredentialResolver credentialResolver;

    public ExternalJdbcQueryService(CredentialResolver credentialResolver) {
        this.credentialResolver = credentialResolver;
    }

    public List<Map<String, Object>> execute(ExternalConnectionEntity conn, String sql, int maxRows) {
        SqlSafety.assertSelectOnly(sql);
        String url = JdbcUrlFactory.build(conn);
        String password = credentialResolver.resolvePassword(conn);
        String driver = JdbcUrlFactory.driverClass(conn.getType());
        try {
            Class.forName(driver);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("JDBC driver not on classpath: " + driver, e);
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        try (Connection jdbc = DriverManager.getConnection(url, conn.getUsername(), password);
                Statement st = jdbc.createStatement()) {
            st.setMaxRows(maxRows);
            try (ResultSet rs = st.executeQuery(sql)) {
                ResultSetMetaData md = rs.getMetaData();
                int cols = md.getColumnCount();
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int i = 1; i <= cols; i++) {
                        String label = md.getColumnLabel(i);
                        row.put(label, rs.getObject(i));
                    }
                    rows.add(row);
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Query failed: " + e.getMessage(), e);
        }
        return rows;
    }
}
