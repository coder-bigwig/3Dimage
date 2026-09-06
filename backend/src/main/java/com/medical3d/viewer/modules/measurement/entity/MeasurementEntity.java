package com.medical3d.viewer.modules.measurement.entity;

import java.time.Instant;
import java.util.UUID;

public record MeasurementEntity(UUID id, UUID planId, UUID layerId, String type, String geometry,
                                String style, int version, Instant createdAt, Instant updatedAt) {}
