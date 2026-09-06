package com.medical3d.viewer.modules.result.mapper;

import com.medical3d.viewer.modules.result.entity.CaseResultEntity;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@MybatisTest
@Testcontainers
class CaseResultMapperTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:17-alpine");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.enabled", () -> true);
    }

    @Autowired
    CaseResultMapper mapper;

    @Test
    void findsPublishedResultById() {
        CaseResultEntity saved = CaseResultEntity.published(
            UUID.randomUUID(), "case-001", "肺部演示", "mm", "LPS", 1
        );

        mapper.insert(saved);

        assertThat(mapper.findPublishedById(saved.id())).contains(saved);
    }
}
