package com.medical3d.viewer;

import com.medical3d.viewer.modules.asset.mapper.ModelAssetMapper;
import com.medical3d.viewer.modules.asset.mapper.ModelLayerMapper;
import com.medical3d.viewer.modules.audit.mapper.AuditLogMapper;
import com.medical3d.viewer.modules.annotation.mapper.AnnotationMapper;
import com.medical3d.viewer.modules.measurement.mapper.MeasurementMapper;
import com.medical3d.viewer.modules.plan.mapper.ViewerPlanMapper;
import com.medical3d.viewer.modules.result.mapper.CaseResultMapper;
import com.medical3d.viewer.modules.share.mapper.ViewerShareMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration"
})
class ApplicationSmokeTest {
    @MockitoBean ViewerShareMapper viewerShareMapper;
    @MockitoBean CaseResultMapper caseResultMapper;
    @MockitoBean ModelLayerMapper modelLayerMapper;
    @MockitoBean ModelAssetMapper modelAssetMapper;
    @MockitoBean AuditLogMapper auditLogMapper;
    @MockitoBean ViewerPlanMapper viewerPlanMapper;
    @MockitoBean MeasurementMapper measurementMapper;
    @MockitoBean AnnotationMapper annotationMapper;

    @Test
    void contextLoads() {
    }
}
