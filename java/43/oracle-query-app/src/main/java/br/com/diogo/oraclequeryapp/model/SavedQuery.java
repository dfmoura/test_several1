package br.com.diogo.oraclequeryapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "saved_query")
@Getter
@Setter
@NoArgsConstructor
public class SavedQuery {

    // Comentário (PT-BR): Identificador da query salva
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Comentário (PT-BR): Nome amigável para identificar a query
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    // Comentário (PT-BR): Descrição opcional da query
    @Size(max = 500)
    @Column(length = 500)
    private String description;

    // Comentário (PT-BR): SQL da query
    @NotBlank
    @Column(nullable = false, columnDefinition = "CLOB")
    private String sql;

    // Comentário (PT-BR): Data de criação do cadastro
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
