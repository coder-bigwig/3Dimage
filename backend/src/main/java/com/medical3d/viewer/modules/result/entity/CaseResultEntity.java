package com.medical3d.viewer.modules.result.entity;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public record CaseResultEntity(UUID id, String caseCode, String title, String unit,
                               String coordinateSystem, int manifestVersion, String status,
                               Instant createdAt, Instant updatedAt) {
    public static CaseResultEntity published(UUID id, String caseCode, String title, String unit,
                                             String coordinateSystem, int manifestVersion) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        return new CaseResultEntity(id, caseCode, title, unit, coordinateSystem,
            manifestVersion, "PUBLISHED", now, now);
    }
}
