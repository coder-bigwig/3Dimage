package com.medical3d.viewer.infrastructure.storage.minio;

import com.medical3d.viewer.common.exception.StorageUnavailableException;
import com.medical3d.viewer.infrastructure.storage.StorageProperties;
import com.medical3d.viewer.infrastructure.storage.StorageService;
import com.medical3d.viewer.infrastructure.storage.StorageValidation;
import com.medical3d.viewer.infrastructure.storage.StoredObject;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.errors.ErrorResponseException;
import io.minio.http.Method;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

public final class MinioStorageService implements StorageService {
    private final MinioClient client;
    private final StorageProperties properties;

    public MinioStorageService(MinioClient client, StorageProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override public StoredObject upload(String key, InputStream content, long length, String type) {
        key = StorageValidation.objectKey(key);
        if (content == null || length < 0) throw new IllegalArgumentException("Invalid upload content");
        try {
            client.putObject(PutObjectArgs.builder().bucket(properties.bucket()).object(key)
                .stream(content, length, -1).contentType(type).build());
            return new StoredObject("MINIO", properties.bucket(), key, length, type);
        } catch (Exception exception) { throw unavailable(exception); }
    }

    @Override public URI createSignedDownloadUrl(String key, Duration validity) {
        key = StorageValidation.objectKey(key);
        int seconds = StorageValidation.validitySeconds(validity, properties.signedUrlTtlSeconds());
        try {
            return URI.create(client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET).bucket(properties.bucket()).object(key).expiry(seconds).build()));
        } catch (Exception exception) { throw unavailable(exception); }
    }

    @Override public void delete(String key) {
        key = StorageValidation.objectKey(key);
        try { client.removeObject(RemoveObjectArgs.builder().bucket(properties.bucket()).object(key).build()); }
        catch (Exception exception) { throw unavailable(exception); }
    }

    @Override public boolean exists(String key) {
        key = StorageValidation.objectKey(key);
        try {
            client.statObject(StatObjectArgs.builder().bucket(properties.bucket()).object(key).build());
            return true;
        } catch (ErrorResponseException exception) {
            if ("NoSuchKey".equals(exception.errorResponse().code())) return false;
            throw unavailable(exception);
        } catch (Exception exception) { throw unavailable(exception); }
    }

    private StorageUnavailableException unavailable(Exception cause) {
        return new StorageUnavailableException("Object storage operation failed", cause);
    }
}
