package com.medical3d.viewer.infrastructure.storage;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

public interface StorageService {
    StoredObject upload(String objectKey, InputStream content, long contentLength, String contentType);
    URI createSignedDownloadUrl(String objectKey, Duration validity);
    void delete(String objectKey);
    boolean exists(String objectKey);
}
