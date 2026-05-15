package com.mitralab.repository;

import com.mitralab.entity.DatasetSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatasetSnapshotRepository extends JpaRepository<DatasetSnapshotEntity, Long> {
}
