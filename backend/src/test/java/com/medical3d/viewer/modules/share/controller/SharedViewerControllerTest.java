package com.medical3d.viewer.modules.share.controller;

import com.medical3d.viewer.common.exception.ResourceNotFoundException;
import com.medical3d.viewer.common.exception.ShareExpiredException;
import com.medical3d.viewer.modules.share.dto.ViewerManifestResponse;
import com.medical3d.viewer.modules.share.service.SharedViewerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SharedViewerController.class)
@AutoConfigureMockMvc(addFilters = false)
class SharedViewerControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean SharedViewerService service;

    @Test
    void returnsManifestForValidShare() throws Exception {
        ViewerManifestResponse manifest = new ViewerManifestResponse(
            UUID.randomUUID(), "肺部演示", "mm", "LPS", 1,
            new ViewerManifestResponse.Permissions(true, true, true, false, false),
            List.of(new ViewerManifestResponse.Layer(
                UUID.randomUUID(), null, "right-upper", "右上叶", "#d946ef", 0.65, true,
                115.26, 1, Map.of("medium", "https://objects.example/model.glb")
            ))
        );
        given(service.getManifest("valid-token")).willReturn(manifest);

        mvc.perform(get("/api/v1/shared-viewers/valid-token/manifest"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.unit").value("mm"))
            .andExpect(jsonPath("$.coordinateSystem").value("LPS"))
            .andExpect(jsonPath("$.layers[0].assets.medium").isString());
    }

    @Test
    void returnsGoneForExpiredShare() throws Exception {
        given(service.getManifest("expired-token")).willThrow(new ShareExpiredException());
        mvc.perform(get("/api/v1/shared-viewers/expired-token/manifest"))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.code").value("SHARE_EXPIRED"));
    }

    @Test
    void returnsNotFoundForUnknownShare() throws Exception {
        given(service.getManifest("unknown-token")).willThrow(new ResourceNotFoundException("SHARE_NOT_FOUND", "分享链接不存在"));
        mvc.perform(get("/api/v1/shared-viewers/unknown-token/manifest"))
            .andExpect(status().isNotFound());
    }
}
