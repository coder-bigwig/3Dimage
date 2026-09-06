package com.medical3d.viewer.modules.asset.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ModelLayerEntity(UUID id, UUID resultId, UUID parentId, String code, String name,
                               String defaultColor, BigDecimal defaultOpacity, boolean defaultVisible,
                               BigDecimal volumeMl, int sortOrder, String baseTransform,
                               Instant createdAt, Instant updatedAt) {}
