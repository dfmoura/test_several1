package br.com.diogo.oraclequeryapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "db_connection")
@Getter
@Setter
@NoArgsConstructor
public class DbConnection {

    // Comentário (PT-BR): Identificador da conexão salva
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Comentário (PT-BR): Nome amigável para identificar a conexão
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    // Comentário (PT-BR): Host do Oracle (IP ou DNS)
    @NotBlank
    @Size(max = 255)
    @Column(nullable = false, length = 255)
    private String host;

    // Comentário (PT-BR): Porta do Oracle (padrão 1521)
    @NotNull
    private Integer port = 1521;

    // Comentário (PT-BR): Tipo de conexão: SERVICE_NAME ou SID
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OracleConnectionType type = OracleConnectionType.SERVICE_NAME;

    // Comentário (PT-BR): Service Name (ou SID) do banco de dados
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String serviceOrSid;

    // Comentário (PT-BR): Usuário do banco
    @NotBlank
    @Size(max = 60)
    @Column(nullable = false, length = 60)
    private String username;

    // Comentário (PT-BR): Senha do banco (armazenada simples por enquanto)
    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String password;

    // Comentário (PT-BR): Data de criação do cadastro
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum OracleConnectionType {
        SERVICE_NAME,
        SID
    }
}


