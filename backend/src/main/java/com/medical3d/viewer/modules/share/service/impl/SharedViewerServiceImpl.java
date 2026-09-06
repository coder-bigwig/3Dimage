package com.medical3d.viewer.modules.share.service.impl;

import com.medical3d.viewer.common.exception.ResourceNotFoundException;
import com.medical3d.viewer.common.exception.ShareExpiredException;
import com.medical3d.viewer.infrastructure.storage.StorageService;
import com.medical3d.viewer.modules.asset.entity.ModelAssetEntity;
import com.medical3d.viewer.modules.asset.entity.ModelLayerEntity;
import com.medical3d.viewer.modules.asset.mapper.ModelAssetMapper;
import com.medical3d.viewer.modules.asset.mapper.ModelLayerMapper;
import com.medical3d.viewer.modules.audit.entity.AuditLogEntity;
import com.medical3d.viewer.modules.audit.mapper.AuditLogMapper;
import com.medical3d.viewer.modules.result.entity.CaseResultEntity;
import com.medical3d.viewer.modules.result.mapper.CaseResultMapper;
import com.medical3d.viewer.modules.share.dto.ViewerManifestResponse;
import com.medical3d.viewer.modules.share.entity.ViewerShareEntity;
import com.medical3d.viewer.modules.share.mapper.ViewerShareMapper;
import com.medical3d.viewer.modules.share.security.ShareTokenHasher;
import com.medical3d.viewer.modules.share.service.SharedViewerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class SharedViewerServiceImpl implements SharedViewerService {
    private static final Duration ASSET_URL_VALIDITY = Duration.ofMinutes(15);
    private final ViewerShareMapper shareMapper;
    private final CaseResultMapper resultMapper;
    private final ModelLayerMapper layerMapper;
    private final ModelAssetMapper assetMapper;
    private final AuditLogMapper auditMapper;
    private final StorageService storageService;
    private final ShareTokenHasher tokenHasher;
    private final ObjectMapper objectMapper;

    public SharedViewerServiceImpl(ViewerShareMapper shareMapper, CaseResultMapper resultMapper,
                                   ModelLayerMapper layerMapper, ModelAssetMapper assetMapper,
                                   AuditLogMapper auditMapper, StorageService storageService,
                                   ShareTokenHasher tokenHasher, ObjectMapper objectMapper) {
        this.shareMapper = shareMapper;
        this.resultMapper = resultMapper;
        this.layerMapper = layerMapper;
        this.assetMapper = assetMapper;
        this.auditMapper = auditMapper;
        this.storageService = storageService;
        this.tokenHasher = tokenHasher;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public ViewerManifestResponse getManifest(String token) {
        ViewerShareEntity share = shareMapper.findByTokenHash(tokenHasher.hash(token))
            .orElseThrow(() -> new ResourceNotFoundException("SHARE_NOT_FOUND", "分享链接不存在"));
        Instant now = Instant.now();
        if (share.revokedAt() != null || share.expiresAt() != null && !share.expiresAt().isAfter(now)) {
            throw new ShareExpiredException();
        }
        CaseResultEntity result = resultMapper.findPublishedById(share.resultId())
            .orElseThrow(() -> new ResourceNotFoundException("RESULT_NOT_FOUND", "三维结果不存在"));
        ViewerManifestResponse.Permissions permissions = permissions(share.permissions());
        if (!permissions.view()) {
            throw new ResourceNotFoundException("SHARE_NOT_FOUND", "分享链接不存在");
        }

        List<ModelLayerEntity> layerEntities = layerMapper.findByResultId(result.id());
        Map<UUID, Map<String, String>> urls = signedAssetUrls(assetMapper.findReadyByResultId(result.id()));
        List<ViewerManifestResponse.Layer> layers = new ArrayList<>(layerEntities.size());
        for (ModelLayerEntity layer : layerEntities) {
            layers.add(new ViewerManifestResponse.Layer(layer.id(), layer.parentId(), layer.code(), layer.name(),
                layer.defaultColor(), layer.defaultOpacity().doubleValue(), layer.defaultVisible(),
                decimal(layer.volumeMl()), layer.sortOrder(), urls.getOrDefault(layer.id(), Map.of())));
        }
        auditMapper.insert(new AuditLogEntity(UUID.randomUUID(), result.id(), share.id(), "VIEW_MANIFEST",
            null, "{}", now));
        return new ViewerManifestResponse(result.id(), result.title(), result.unit(), result.coordinateSystem(),
            result.manifestVersion(), permissions, List.copyOf(layers));
    }

    private Map<UUID, Map<String, String>> signedAssetUrls(List<ModelAssetEntity> assets) {
        Map<UUID, Map<String, String>> urls = new LinkedHashMap<>();
        for (ModelAssetEntity asset : assets) {
            if (asset.layerId() == null || "ORIGINAL".equals(asset.variant())) continue;
            urls.computeIfAbsent(asset.layerId(), ignored -> new LinkedHashMap<>())
                .putIfAbsent(asset.variant().toLowerCase(Locale.ROOT),
                    storageService.createSignedDownloadUrl(asset.objectKey(), ASSET_URL_VALIDITY).toString());
        }
        return urls;
    }

    private ViewerManifestResponse.Permissions permissions(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            return new ViewerManifestResponse.Permissions(value(node, "view"), value(node, "measure"),
                value(node, "annotate"), value(node, "savePlan"), value(node, "download"));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Stored share permissions are invalid", exception);
        }
    }

    private static boolean value(JsonNode node, String field) {
        return node.path(field).asBoolean(false);
    }

    private static Double decimal(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }
}
