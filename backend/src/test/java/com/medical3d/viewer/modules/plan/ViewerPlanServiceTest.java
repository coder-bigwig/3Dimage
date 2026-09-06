package com.medical3d.viewer.modules.plan;

import com.medical3d.viewer.common.exception.VersionConflictException;
import com.medical3d.viewer.common.exception.AccessDeniedDomainException;
import com.medical3d.viewer.common.exception.DomainValidationException;
import com.medical3d.viewer.modules.asset.entity.ModelLayerEntity;
import com.medical3d.viewer.modules.measurement.dto.MeasurementEvent;
import com.medical3d.viewer.modules.annotation.mapper.AnnotationMapper;
import com.medical3d.viewer.modules.asset.mapper.ModelLayerMapper;
import com.medical3d.viewer.modules.audit.mapper.AuditLogMapper;
import com.medical3d.viewer.modules.measurement.mapper.MeasurementMapper;
import com.medical3d.viewer.modules.plan.dto.SavePlanRequest;
import com.medical3d.viewer.modules.plan.mapper.ViewerPlanMapper;
import com.medical3d.viewer.modules.plan.service.impl.ViewerPlanServiceImpl;
import com.medical3d.viewer.modules.share.entity.ViewerShareEntity;
import com.medical3d.viewer.modules.share.mapper.ViewerShareMapper;
import com.medical3d.viewer.modules.share.security.ShareTokenHasher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ViewerPlanServiceTest {
    @Mock ViewerPlanMapper planMapper;
    @Mock ViewerShareMapper shareMapper;
    @Mock ModelLayerMapper layerMapper;
    @Mock MeasurementMapper measurementMapper;
    @Mock AnnotationMapper annotationMapper;
    @Mock AuditLogMapper auditMapper;
    @Mock ShareTokenHasher tokenHasher;
    ViewerPlanServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ViewerPlanServiceImpl(planMapper, shareMapper, layerMapper, measurementMapper,
            annotationMapper, auditMapper, tokenHasher, new ObjectMapper());
    }

    @Test
    void rejectsUpdateWhenPlanVersionChanged() {
        UUID resultId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        ViewerShareEntity share = new ViewerShareEntity(UUID.randomUUID(), resultId, "hash",
            "{\"view\":true,\"savePlan\":true}", Instant.now().plusSeconds(3600), null, Instant.now());
        given(tokenHasher.hash("valid-token-000000000000000000000")).willReturn("hash");
        given(shareMapper.findByTokenHash("hash")).willReturn(Optional.of(share));
        given(planMapper.belongsToResult(planId, resultId)).willReturn(true);
        given(layerMapper.findByResultId(resultId)).willReturn(List.of());
        given(planMapper.updateState(any())).willReturn(0);
        SavePlanRequest request = new SavePlanRequest("术前方案", 3,
            new ObjectMapper().readTree("{\"background\":\"#d9d9d9\",\"layers\":[]}"),
            List.of(), List.of());

        assertThatThrownBy(() -> service.update("valid-token-000000000000000000000", planId, request))
            .isInstanceOf(VersionConflictException.class);
    }

    @Test
    void rejectsWriteWithoutSavePermission() {
        ViewerShareEntity share = share("{\"view\":true,\"savePlan\":false}");
        given(tokenHasher.hash("valid-token-000000000000000000000")).willReturn("hash");
        given(shareMapper.findByTokenHash("hash")).willReturn(Optional.of(share));

        assertThatThrownBy(() -> service.create("valid-token-000000000000000000000", request(List.of())))
            .isInstanceOf(AccessDeniedDomainException.class);
    }

    @Test
    void rejectsMeasurementForUnknownLayer() {
        ViewerShareEntity share = share("{\"view\":true,\"savePlan\":true}");
        UUID knownLayer = UUID.randomUUID();
        given(tokenHasher.hash("valid-token-000000000000000000000")).willReturn("hash");
        given(shareMapper.findByTokenHash("hash")).willReturn(Optional.of(share));
        given(layerMapper.findByResultId(share.resultId())).willReturn(List.of(layer(knownLayer, share.resultId())));
        MeasurementEvent event = new MeasurementEvent(UUID.randomUUID(), UUID.randomUUID(), "LENGTH",
            List.of(new MeasurementEvent.Point(0, 0, 0)), new ObjectMapper().createObjectNode());

        assertThatThrownBy(() -> service.create("valid-token-000000000000000000000", request(List.of(event))))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("不存在的模型图层");
    }

    @Test
    void rejectsNonFiniteMeasurementCoordinate() {
        ViewerShareEntity share = share("{\"view\":true,\"savePlan\":true}");
        UUID layerId = UUID.randomUUID();
        given(tokenHasher.hash("valid-token-000000000000000000000")).willReturn("hash");
        given(shareMapper.findByTokenHash("hash")).willReturn(Optional.of(share));
        given(layerMapper.findByResultId(share.resultId())).willReturn(List.of(layer(layerId, share.resultId())));
        MeasurementEvent event = new MeasurementEvent(UUID.randomUUID(), layerId, "LENGTH",
            List.of(new MeasurementEvent.Point(Double.NaN, 0, 0)), new ObjectMapper().createObjectNode());

        assertThatThrownBy(() -> service.create("valid-token-000000000000000000000", request(List.of(event))))
            .isInstanceOf(DomainValidationException.class)
            .hasMessageContaining("有限数值");
    }

    private static ViewerShareEntity share(String permissions) {
        return new ViewerShareEntity(UUID.randomUUID(), UUID.randomUUID(), "hash", permissions,
            Instant.now().plusSeconds(3600), null, Instant.now());
    }

    private static SavePlanRequest request(List<MeasurementEvent> measurements) {
        return new SavePlanRequest("术前方案", 0, new ObjectMapper().createObjectNode(), measurements, List.of());
    }

    private static ModelLayerEntity layer(UUID id, UUID resultId) {
        return new ModelLayerEntity(id, resultId, null, "layer", "图层", "#ffffff",
            BigDecimal.ONE, true, null, 0, "{}", Instant.now(), Instant.now());
    }
}
