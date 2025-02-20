package test_conex_db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.SQLException;

public class ConexaoBD {
    public static void main(String[] args) {
        // Dados de conexão fornecidos
        String url = "jdbc:postgresql://db.jdmgcvhcaulyllydvcob.supabase.co:5432/postgres"; // URL do banco
        String usuario = "postgres"; // Usuário
        String senha = "buc110t@2025"; // Senha (substitua por sua senha)

        try {
            // Estabelece a conexão com o banco de dados
            Connection conexao = DriverManager.getConnection(url, usuario, senha);
            System.out.println("Conexão estabelecida com sucesso!");

            // Cria uma consulta SQL (exemplo simples)
            String query = "SELECT * FROM DATA_TEST"; // Altere para o nome da sua tabela
            Statement stmt = conexao.createStatement();

            // Executa a consulta e armazena o resultado
            ResultSet rs = stmt.executeQuery(query);

            // Processa o resultado
            while (rs.next()) {
                System.out.println("ID: " + rs.getInt("id") + ", Nome: " + rs.getString("nome"));
            }

            // Fecha a conexão e os recursos
            rs.close();
            stmt.close();
            conexao.close();

        } catch (SQLException e) {
            System.out.println("Erro ao conectar ao banco de dados: " + e.getMessage());
        }
    }
}
