package br.com.diogo.oraclequeryapp.service;

import br.com.diogo.oraclequeryapp.model.DbConnection;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.*;

@Service
public class OracleQueryService {

    // Comentário (PT-BR): Executa uma query SQL no Oracle e retorna os resultados
    public QueryResult executeQuery(DbConnection connection, String sql) throws SQLException {
        String jdbcUrl = buildJdbcUrl(connection);
        
        try (Connection conn = DriverManager.getConnection(jdbcUrl, connection.getUsername(), connection.getPassword());
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            
            ResultSetMetaData metaData = rs.getMetaData();
            int columnCount = metaData.getColumnCount();
            
            // Comentário (PT-BR): Coleta os nomes das colunas
            List<String> columns = new ArrayList<>();
            for (int i = 1; i <= columnCount; i++) {
                columns.add(metaData.getColumnName(i));
            }
            
            // Comentário (PT-BR): Coleta os dados das linhas
            List<Map<String, Object>> rows = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= columnCount; i++) {
                    String columnName = metaData.getColumnName(i);
                    Object value = rs.getObject(i);
                    // Comentário (PT-BR): Converte null para string vazia para evitar problemas na exibição
                    row.put(columnName, value != null ? value.toString() : "");
                }
                rows.add(row);
            }
            
            // Comentário (PT-BR): Log para debug
            System.out.println("Query executada: " + sql);
            System.out.println("Colunas encontradas: " + columns.size());
            System.out.println("Linhas encontradas: " + rows.size());
            
            return new QueryResult(columns, rows);
        }
    }

    // Comentário (PT-BR): Testa se a conexão Oracle está funcionando
    public boolean testConnection(DbConnection connection) {
        try {
            String jdbcUrl = buildJdbcUrl(connection);
            try (Connection conn = DriverManager.getConnection(jdbcUrl, connection.getUsername(), connection.getPassword())) {
                return conn.isValid(5); // Testa em 5 segundos
            }
        } catch (SQLException e) {
            return false;
        }
    }

    // Comentário (PT-BR): Constrói a URL JDBC do Oracle baseada na configuração
    private String buildJdbcUrl(DbConnection connection) {
        String host = connection.getHost();
        int port = connection.getPort();
        String serviceOrSid = connection.getServiceOrSid();
        
        if (connection.getType() == DbConnection.OracleConnectionType.SERVICE_NAME) {
            return String.format("jdbc:oracle:thin:@//%s:%d/%s", host, port, serviceOrSid);
        } else {
            return String.format("jdbc:oracle:thin:@%s:%d:%s", host, port, serviceOrSid);
        }
    }

    // Comentário (PT-BR): Classe para encapsular o resultado da query
    public static class QueryResult {
        private final List<String> columns;
        private final List<Map<String, Object>> rows;

        public QueryResult(List<String> columns, List<Map<String, Object>> rows) {
            this.columns = columns;
            this.rows = rows;
        }

        public List<String> getColumns() {
            return columns;
        }

        public List<Map<String, Object>> getRows() {
            return rows;
        }
    }
}
