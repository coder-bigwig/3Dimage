package com.medical3d.viewer.infrastructure.storage;

import java.time.Duration;

public final class StorageValidation {
    private StorageValidation() {}

    public static String objectKey(String value) {
        if (value == null || value.isBlank() || value.length() > 1024 || value.startsWith("/")
            || value.contains("\\") || value.contains("../") || value.contains("/..")
            || value.indexOf('\0') >= 0) {
            throw new IllegalArgumentException("Invalid object key");
        }
        return value;
    }

    public static int validitySeconds(Duration requested, long maximum) {
        if (requested == null || requested.isZero() || requested.isNegative()
            || requested.getSeconds() > maximum) {
            throw new IllegalArgumentException("Signed URL validity is outside the configured limit");
        }
        return Math.toIntExact(requested.getSeconds());
    }
}
