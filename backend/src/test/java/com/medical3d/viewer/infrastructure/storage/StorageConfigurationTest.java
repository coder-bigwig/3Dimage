package com.medical3d.viewer.infrastructure.storage;

import com.medical3d.viewer.infrastructure.storage.minio.MinioStorageService;
import com.medical3d.viewer.infrastructure.storage.oss.OssStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class StorageConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withUserConfiguration(StorageConfiguration.class)
        .withPropertyValues(
            "storage.endpoint=http://localhost:9000",
            "storage.access-key=test-access",
            "storage.secret-key=test-secret",
            "storage.bucket=medical3d",
            "storage.signed-url-ttl-seconds=900"
        );

    @Test
    void selectsMinio() {
        runner.withPropertyValues("storage.provider=minio")
            .run(context -> {
                assertThat(context).hasSingleBean(StorageService.class);
                assertThat(context).hasSingleBean(MinioStorageService.class);
                assertThat(context).doesNotHaveBean(OssStorageService.class);
            });
    }

    @Test
    void selectsOss() {
        runner.withPropertyValues("storage.provider=oss")
            .run(context -> {
                assertThat(context).hasSingleBean(StorageService.class);
                assertThat(context).hasSingleBean(OssStorageService.class);
                assertThat(context).doesNotHaveBean(MinioStorageService.class);
            });
    }

    @Test
    void rejectsUnknownProvider() {
        runner.withPropertyValues("storage.provider=unknown")
            .run(context -> assertThat(context).hasFailed());
    }
}
