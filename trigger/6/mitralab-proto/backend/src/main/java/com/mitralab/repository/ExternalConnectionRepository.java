package com.mitralab.repository;

import com.mitralab.entity.ExternalConnectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalConnectionRepository extends JpaRepository<ExternalConnectionEntity, Long> {
}
