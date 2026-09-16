package com.medical3d.viewer.modules.annotation.service;

import com.medical3d.viewer.modules.annotation.dto.AnnotationDocument;
import com.medical3d.viewer.modules.annotation.mapper.AnnotationDocumentMapper;
import com.medical3d.viewer.modules.asset.mapper.ModelLayerMapper;
import com.medical3d.viewer.modules.share.mapper.ViewerShareMapper;
import com.medical3d.viewer.modules.share.security.ShareTokenHasher;
import com.medical3d.viewer.common.exception.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AnnotationDocumentService {
    private final AnnotationDocumentMapper documents;
    private final ModelLayerMapper layers;
    private final ViewerShareMapper shares;
    private final ShareTokenHasher hasher;
    private final ObjectMapper json;
    public AnnotationDocumentService(AnnotationDocumentMapper documents, ModelLayerMapper layers, ViewerShareMapper shares, ShareTokenHasher hasher, ObjectMapper json) {
        this.documents = documents; this.layers = layers; this.shares = shares; this.hasher = hasher; this.json = json;
    }
    @Transactional(readOnly = true)
    public AnnotationDocument get(String token) {
        String content = documents.find(authorize(token, false));
        return content == null ? new AnnotationDocument(0, List.of(), List.of()) : json.readValue(content, AnnotationDocument.class);
    }
    @Transactional
    public AnnotationDocument save(String token, AnnotationDocument input) {
        UUID result = authorize(token, true);
        input.validate(layers.findByResultId(result).stream().map(layer -> layer.id()).collect(Collectors.toSet()));
        AnnotationDocument saved = input.withVersion(input.version() + 1);
        String content = json.writeValueAsString(saved);
        if (content.length() > 1_000_000) throw new DomainValidationException("INVALID_ANNOTATIONS", "标注数据过大");
        if (documents.save(result, content, input.version()) != 1)
            throw new VersionConflictException("ANNOTATION_VERSION_CONFLICT", "标注已在其他页面更新，请重新加载后再编辑");
        return saved;
    }
    private UUID authorize(String token, boolean write) {
        var share = shares.findByTokenHash(hasher.hash(token)).orElseThrow(() -> new ResourceNotFoundException("SHARE_NOT_FOUND", "分享链接不存在"));
        if (share.revokedAt() != null || share.expiresAt() != null && !share.expiresAt().isAfter(Instant.now())) throw new ShareExpiredException();
        var permissions = json.readTree(share.permissions());
        if (!permissions.path("view").asBoolean(false) || write && !permissions.path("annotate").asBoolean(false))
            throw new AccessDeniedDomainException("SHARE_PERMISSION_DENIED", "当前分享链接没有标注权限");
        return share.resultId();
    }
}
