package com.medical3d.viewer.modules.plan.entity;

import java.time.Instant;
import java.util.UUID;

public record ViewerPlanEntity(UUID id, UUID resultId, String name, String sceneState, int version,
                               Instant createdAt, Instant updatedAt) {}
