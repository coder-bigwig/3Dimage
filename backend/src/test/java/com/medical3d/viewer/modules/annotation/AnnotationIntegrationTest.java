package com.medical3d.viewer.modules.annotation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AnnotationIntegrationTest {
    @Container static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.1-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.medical3d.viewer.infrastructure.storage.StorageService storage;
    String url = "/api/v1/shared-viewers/demo-valid-token-00000000000000000000/annotations";
    @Test void persistsEditsAndClearsWithRealDatabaseAndRejectsStaleWrites() throws Exception {
        String content = new AnnotationDocumentTest().payload;
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(0));
        mvc.perform(put(url).contentType("application/json").content(content))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get(url)).andExpect(jsonPath("$.models[0].text").value("右上叶"))
            .andExpect(jsonPath("$.models[0].offset[0]").value(60)).andExpect(jsonPath("$.drawings[0].kind").value("arrow"));
        assertThat(jdbc.queryForObject("select count(*) from viewer_annotation_document where result_id = '10000000-0000-0000-0000-000000000001'", Integer.class)).isEqualTo(1);
        mvc.perform(put(url).contentType("application/json").content(content)).andExpect(status().isConflict());
        mvc.perform(put(url).contentType("application/json").content(content.replace("\"version\":0", "\"version\":1").replace("右上叶", "修改标注").replace("60,-40", "90,-70")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        mvc.perform(get(url)).andExpect(jsonPath("$.models[0].text").value("修改标注")).andExpect(jsonPath("$.models[0].offset[0]").value(90));
        mvc.perform(put(url).contentType("application/json").content("{\"version\":2,\"drawings\":[],\"models\":[]}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(3));
        mvc.perform(get(url)).andExpect(jsonPath("$.models").isEmpty()).andExpect(jsonPath("$.drawings").isEmpty());
        jdbc.update("update viewer_share set permissions = '{\"view\":true,\"annotate\":false}'::jsonb where result_id = '10000000-0000-0000-0000-000000000001'");
        mvc.perform(put(url).contentType("application/json").content("{\"version\":3,\"drawings\":[],\"models\":[]}"))
            .andExpect(status().isForbidden());
        mvc.perform(get(url)).andExpect(status().isOk());
    }
    @Test void rejectsExpiredShare() throws Exception {
        mvc.perform(get("/api/v1/shared-viewers/demo-expired-token-000000000000000000/annotations")).andExpect(status().isGone());
    }
    @Test void refinedPreviewHasMatchingServerLayersAndPersistentAnnotations() throws Exception {
        org.mockito.BDDMockito.given(storage.createSignedDownloadUrl(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any()))
            .willReturn(java.net.URI.create("http://assets.test/model.glb"));
        String base = "/api/v1/shared-viewers/demo-blender-token-000000000000000000";
        mvc.perform(get(base + "/manifest")).andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("公开肺部 CT · Blender 精修模型"))
            .andExpect(jsonPath("$.renderStyle").value("clinical"))
            .andExpect(jsonPath("$.volume.descriptorUrl").value("/public-data/blender-trial/viewer/ct-volume.json"))
            .andExpect(jsonPath("$.layers.length()").value(8))
            .andExpect(jsonPath("$.layers[0].id").value("20000000-0000-0000-0000-000000000101"))
            .andExpect(jsonPath("$.permissions.annotate").value(true));
        String content = new AnnotationDocumentTest().payload.replace("20000000-0000-0000-0000-000000000001", "20000000-0000-0000-0000-000000000101");
        mvc.perform(put(base + "/annotations").contentType("application/json").content(content))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get(base + "/annotations")).andExpect(jsonPath("$.models[0].layerId").value("20000000-0000-0000-0000-000000000101"));
    }
}
