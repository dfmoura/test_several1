package org.example;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

public class ConexaoBD {
    public static void main(String[] args) {
        // Configuração da conexão
        String url = "jdbc:postgresql://db.jdmgcvhcaulyllydvcob.supabase.co:5432/postgres";
        String usuario = "postgres";
        String senha = "Buc110t@2025"; // Substitua pela senha correta

        // Propriedades da conexão
        Properties props = new Properties();
        props.setProperty("user", usuario);
        props.setProperty("password", senha);
        props.setProperty("loginTimeout", "30"); // Define timeout de 30 segundos

        try {
            // Tenta estabelecer a conexão
            Connection conexao = DriverManager.getConnection(url, props);
            System.out.println("Conexão estabelecida com sucesso!");
            conexao.close();
        } catch (SQLException e) {
            System.err.println("Erro ao conectar ao banco de dados: " + e.getMessage());
            e.printStackTrace(); // Mostra detalhes do erro para debug
        }
    }
}
