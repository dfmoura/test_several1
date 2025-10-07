package br.com.diogo.oraclequeryapp.repository;

import br.com.diogo.oraclequeryapp.model.SavedQuery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedQueryRepository extends JpaRepository<SavedQuery, Long> {
}
