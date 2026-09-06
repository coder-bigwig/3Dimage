package com.medical3d.viewer.infrastructure.storage.oss;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.ObjectMetadata;
import com.medical3d.viewer.common.exception.StorageUnavailableException;
import com.medical3d.viewer.infrastructure.storage.StorageProperties;
import com.medical3d.viewer.infrastructure.storage.StorageService;
import com.medical3d.viewer.infrastructure.storage.StorageValidation;
import com.medical3d.viewer.infrastructure.storage.StoredObject;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

public final class OssStorageService implements StorageService {
    private final OSS client;
    private final StorageProperties properties;

    public OssStorageService(OSS client, StorageProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override public StoredObject upload(String key, InputStream content, long length, String type) {
        key = StorageValidation.objectKey(key);
        if (content == null || length < 0) throw new IllegalArgumentException("Invalid upload content");
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(length);
        metadata.setContentType(type);
        try {
            client.putObject(properties.bucket(), key, content, metadata);
            return new StoredObject("OSS", properties.bucket(), key, length, type);
        } catch (RuntimeException exception) { throw unavailable(exception); }
    }

    @Override public URI createSignedDownloadUrl(String key, Duration validity) {
        key = StorageValidation.objectKey(key);
        int seconds = StorageValidation.validitySeconds(validity, properties.signedUrlTtlSeconds());
        try {
            Date expires = Date.from(Instant.now().plusSeconds(seconds));
            return client.generatePresignedUrl(properties.bucket(), key, expires).toURI();
        } catch (Exception exception) { throw unavailable(exception); }
    }

    @Override public void delete(String key) {
        key = StorageValidation.objectKey(key);
        try { client.deleteObject(properties.bucket(), key); }
        catch (RuntimeException exception) { throw unavailable(exception); }
    }

    @Override public boolean exists(String key) {
        key = StorageValidation.objectKey(key);
        try { return client.doesObjectExist(properties.bucket(), key); }
        catch (RuntimeException exception) { throw unavailable(exception); }
    }

    private StorageUnavailableException unavailable(Exception cause) {
        return new StorageUnavailableException("Object storage operation failed", cause);
    }
}
