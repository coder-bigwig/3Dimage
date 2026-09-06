package com.medical3d.viewer.infrastructure.storage;

import com.aliyun.oss.OSSClientBuilder;
import com.medical3d.viewer.infrastructure.storage.minio.MinioStorageService;
import com.medical3d.viewer.infrastructure.storage.oss.OssStorageService;
import io.minio.MinioClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Locale;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfiguration {
    @Bean
    StorageService storageService(StorageProperties properties) {
        return switch (properties.provider().toLowerCase(Locale.ROOT)) {
            case "minio" -> new MinioStorageService(
                MinioClient.builder().endpoint(properties.endpoint())
                    .credentials(properties.accessKey(), properties.secretKey()).build(), properties);
            case "oss" -> new OssStorageService(
                new OSSClientBuilder().build(properties.endpoint(), properties.accessKey(), properties.secretKey()),
                properties);
            default -> throw new IllegalArgumentException("Unsupported storage provider: " + properties.provider());
        };
    }
}
