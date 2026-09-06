package com.medical3d.viewer.infrastructure.storage;

public record StoredObject(String provider, String bucket, String objectKey, long contentLength,
                           String contentType) {}
