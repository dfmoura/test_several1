package org.example;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class SupabaseConnection {
    public static void main(String[] args) {
        // Substitua pelas suas credenciais do Supabase
        String url = "jdbc:postgresql://jdmgcvhcaulyllydvcob.supabase.co:5432/postgres?sslmode=require";
        String user = "postgres";
        String password = "";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM DATA_TEST")) {

            // Obtendo os metadados para saber os nomes das colunas
            int columnCount = rs.getMetaData().getColumnCount();

            // Itera pelos resultados
            while (rs.next()) {
                for (int i = 1; i <= columnCount; i++) {
                    System.out.print(rs.getMetaData().getColumnName(i) + ": " + rs.getString(i) + " | ");
                }
                System.out.println();
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
