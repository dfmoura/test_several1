package br.com.diogo.oraclequeryapp.repository;

import br.com.diogo.oraclequeryapp.model.DbConnection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DbConnectionRepository extends JpaRepository<DbConnection, Long> {
}


