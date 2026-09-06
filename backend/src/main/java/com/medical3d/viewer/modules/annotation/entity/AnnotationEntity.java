package com.medical3d.viewer.modules.annotation.entity;

import java.time.Instant;
import java.util.UUID;

public record AnnotationEntity(UUID id, UUID planId, UUID layerId, String text, String geometry,
                               String style, int version, Instant createdAt, Instant updatedAt) {}
