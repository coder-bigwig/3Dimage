package com.medical3d.viewer.modules.share.entity;

import java.time.Instant;
import java.util.UUID;

public record ViewerShareEntity(UUID id, UUID resultId, String tokenHash, String permissions,
                                Instant expiresAt, Instant revokedAt, Instant createdAt) {}
