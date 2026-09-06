package com.medical3d.viewer.modules.plan.service.impl;

import com.medical3d.viewer.common.exception.AccessDeniedDomainException;
import com.medical3d.viewer.common.exception.DomainValidationException;
import com.medical3d.viewer.common.exception.ResourceNotFoundException;
import com.medical3d.viewer.common.exception.ShareExpiredException;
import com.medical3d.viewer.common.exception.VersionConflictException;
import com.medical3d.viewer.modules.annotation.dto.AnnotationEvent;
import com.medical3d.viewer.modules.annotation.entity.AnnotationEntity;
import com.medical3d.viewer.modules.annotation.mapper.AnnotationMapper;
import com.medical3d.viewer.modules.asset.entity.ModelLayerEntity;
import com.medical3d.viewer.modules.asset.mapper.ModelLayerMapper;
import com.medical3d.viewer.modules.audit.entity.AuditLogEntity;
import com.medical3d.viewer.modules.audit.mapper.AuditLogMapper;
import com.medical3d.viewer.modules.measurement.dto.MeasurementEvent;
import com.medical3d.viewer.modules.measurement.entity.MeasurementEntity;
import com.medical3d.viewer.modules.measurement.mapper.MeasurementMapper;
import com.medical3d.viewer.modules.plan.dto.SavePlanRequest;
import com.medical3d.viewer.modules.plan.entity.ViewerPlanEntity;
import com.medical3d.viewer.modules.plan.mapper.UpdatePlanStateCommand;
import com.medical3d.viewer.modules.plan.mapper.ViewerPlanMapper;
import com.medical3d.viewer.modules.plan.service.ViewerPlanService;
import com.medical3d.viewer.modules.share.entity.ViewerShareEntity;
import com.medical3d.viewer.modules.share.mapper.ViewerShareMapper;
import com.medical3d.viewer.modules.share.security.ShareTokenHasher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
public class ViewerPlanServiceImpl implements ViewerPlanService {
    private static final int MAX_SCENE_STATE_CHARS = 1_000_000;
    private final ViewerPlanMapper planMapper;
    private final ViewerShareMapper shareMapper;
    private final ModelLayerMapper layerMapper;
    private final MeasurementMapper measurementMapper;
    private final AnnotationMapper annotationMapper;
    private final AuditLogMapper auditMapper;
    private final ShareTokenHasher tokenHasher;
    private final ObjectMapper objectMapper;

    public ViewerPlanServiceImpl(ViewerPlanMapper planMapper, ViewerShareMapper shareMapper,
                                 ModelLayerMapper layerMapper, MeasurementMapper measurementMapper,
                                 AnnotationMapper annotationMapper, AuditLogMapper auditMapper,
                                 ShareTokenHasher tokenHasher, ObjectMapper objectMapper) {
        this.planMapper = planMapper;
        this.shareMapper = shareMapper;
        this.layerMapper = layerMapper;
        this.measurementMapper = measurementMapper;
        this.annotationMapper = annotationMapper;
        this.auditMapper = auditMapper;
        this.tokenHasher = tokenHasher;
        this.objectMapper = objectMapper;
    }

    @Override @Transactional(readOnly = true)
    public ViewerPlanEntity get(String token, UUID planId) {
        ViewerShareEntity share = authorized(token, false);
        ViewerPlanEntity plan = planMapper.findById(planId)
            .filter(value -> value.resultId().equals(share.resultId()))
            .orElseThrow(() -> notFound());
        return plan;
    }

    @Override @Transactional
    public ViewerPlanEntity create(String token, SavePlanRequest request) {
        ViewerShareEntity share = authorized(token, true);
        validate(request, share.resultId());
        Instant now = now();
        ViewerPlanEntity plan = new ViewerPlanEntity(UUID.randomUUID(), share.resultId(), request.name().trim(),
            sceneState(request.sceneState()), 1, now, now);
        planMapper.insert(plan);
        replaceEvents(plan.id(), request, now);
        audit(share, "CREATE_PLAN", plan.id(), now);
        return plan;
    }

    @Override @Transactional
    public ViewerPlanEntity update(String token, UUID planId, SavePlanRequest request) {
        ViewerShareEntity share = authorized(token, true);
        if (!planMapper.belongsToResult(planId, share.resultId())) throw notFound();
        validate(request, share.resultId());
        String state = sceneState(request.sceneState());
        int changed = planMapper.updateState(new UpdatePlanStateCommand(planId, share.resultId(),
            request.name().trim(), state, request.expectedVersion()));
        if (changed == 0) {
            throw new VersionConflictException("PLAN_VERSION_CONFLICT", "方案已被其他操作更新，请刷新后重试");
        }
        Instant now = now();
        replaceEvents(planId, request, now);
        audit(share, "UPDATE_PLAN", planId, now);
        return new ViewerPlanEntity(planId, share.resultId(), request.name().trim(), state,
            request.expectedVersion() + 1, now, now);
    }

    @Override @Transactional
    public void delete(String token, UUID planId) {
        ViewerShareEntity share = authorized(token, true);
        if (planMapper.deleteByIdAndResultId(planId, share.resultId()) == 0) throw notFound();
        audit(share, "DELETE_PLAN", planId, now());
    }

    private ViewerShareEntity authorized(String token, boolean requireSave) {
        ViewerShareEntity share = shareMapper.findByTokenHash(tokenHasher.hash(token))
            .orElseThrow(() -> new ResourceNotFoundException("SHARE_NOT_FOUND", "分享链接不存在"));
        Instant now = Instant.now();
        if (share.revokedAt() != null || share.expiresAt() != null && !share.expiresAt().isAfter(now)) {
            throw new ShareExpiredException();
        }
        JsonNode permissions = objectMapper.readTree(share.permissions());
        if (!permissions.path("view").asBoolean(false)
            || requireSave && !permissions.path("savePlan").asBoolean(false)) {
            throw new AccessDeniedDomainException("SHARE_PERMISSION_DENIED", "当前分享链接没有保存方案权限");
        }
        return share;
    }

    private void validate(SavePlanRequest request, UUID resultId) {
        if (request.expectedVersion() < 0 || request.name() == null || request.name().isBlank()
            || request.name().length() > 200 || request.measurements().size() > 200
            || request.annotations().size() > 200) {
            throw invalid("方案内容超出限制");
        }
        Set<UUID> layerIds = new HashSet<>();
        for (ModelLayerEntity layer : layerMapper.findByResultId(resultId)) layerIds.add(layer.id());
        for (MeasurementEvent event : request.measurements()) {
            validLayer(event.layerId(), layerIds);
            if (event.points().isEmpty() || event.points().stream().anyMatch(point -> !point.finite())) {
                throw invalid("测量坐标必须是有限数值");
            }
        }
        for (AnnotationEvent event : request.annotations()) {
            validLayer(event.layerId(), layerIds);
            if (event.text() == null || event.text().isBlank() || event.text().length() > 1000
                || !event.point().finite()) throw invalid("标注内容无效");
        }
        sceneState(request.sceneState());
    }

    private void validLayer(UUID layerId, Set<UUID> validIds) {
        if (layerId != null && !validIds.contains(layerId)) throw invalid("方案引用了不存在的模型图层");
    }

    private String sceneState(JsonNode state) {
        if (state == null || !state.isObject()) throw invalid("场景状态必须是 JSON 对象");
        String value = state.toString();
        if (value.length() > MAX_SCENE_STATE_CHARS || containsNonFiniteText(value)) {
            throw invalid("场景状态包含无效数值或体积过大");
        }
        return value;
    }

    private static boolean containsNonFiniteText(String value) {
        return value.contains("NaN") || value.contains("Infinity");
    }

    private void replaceEvents(UUID planId, SavePlanRequest request, Instant now) {
        measurementMapper.deleteByPlanId(planId);
        annotationMapper.deleteByPlanId(planId);
        for (MeasurementEvent event : request.measurements()) {
            measurementMapper.insert(new MeasurementEntity(event.id(), planId, event.layerId(), event.type(),
                objectMapper.valueToTree(event.points()).toString(), event.style().toString(), 1, now, now));
        }
        for (AnnotationEvent event : request.annotations()) {
            annotationMapper.insert(new AnnotationEntity(event.id(), planId, event.layerId(), event.text(),
                objectMapper.valueToTree(event.point()).toString(), event.style().toString(), 1, now, now));
        }
    }

    private void audit(ViewerShareEntity share, String action, UUID planId, Instant now) {
        auditMapper.insert(new AuditLogEntity(UUID.randomUUID(), share.resultId(), share.id(), action,
            null, "{\"planId\":\"" + planId + "\"}", now));
    }

    private static Instant now() { return Instant.now().truncatedTo(ChronoUnit.MICROS); }
    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("PLAN_NOT_FOUND", "方案不存在");
    }
    private static DomainValidationException invalid(String message) {
        return new DomainValidationException("INVALID_PLAN_STATE", message);
    }
}
