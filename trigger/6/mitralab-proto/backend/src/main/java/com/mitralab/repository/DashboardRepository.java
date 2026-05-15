package com.mitralab.repository;

import com.mitralab.entity.DashboardEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DashboardRepository extends JpaRepository<DashboardEntity, Long> {

    @EntityGraph(attributePaths = {"widgets"})
    @Override
    Optional<DashboardEntity> findById(Long id);

    @EntityGraph(attributePaths = {"widgets"})
    @Override
    List<DashboardEntity> findAll();
}
