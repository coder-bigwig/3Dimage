package com.medical3d.viewer.modules.audit.entity;

import java.time.Instant;
import java.util.UUID;

public record AuditLogEntity(UUID id, UUID resultId, UUID shareId, String action, String actorHash,
                             String metadata, Instant createdAt) {}
