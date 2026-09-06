package com.medical3d.viewer.modules.asset.entity;

import java.time.Instant;
import java.util.UUID;

public record ModelAssetEntity(UUID id, UUID resultId, UUID layerId, String variant, String provider,
                               String bucket, String objectKey, String format, String compression,
                               long sizeBytes, Long triangleCount, String checksum, int version,
                               String status, Instant createdAt, Instant updatedAt) {}
