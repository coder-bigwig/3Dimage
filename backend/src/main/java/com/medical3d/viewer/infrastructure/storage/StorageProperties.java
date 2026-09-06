package com.medical3d.viewer.infrastructure.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("storage")
public record StorageProperties(String provider, String endpoint, String accessKey, String secretKey,
                                String bucket, long signedUrlTtlSeconds) {
    public StorageProperties {
        if (provider == null || endpoint == null || accessKey == null || secretKey == null || bucket == null) {
            throw new IllegalArgumentException("Storage configuration is incomplete");
        }
        if (signedUrlTtlSeconds < 1 || signedUrlTtlSeconds > 604800) {
            throw new IllegalArgumentException("Signed URL TTL must be between 1 and 604800 seconds");
        }
    }
}
