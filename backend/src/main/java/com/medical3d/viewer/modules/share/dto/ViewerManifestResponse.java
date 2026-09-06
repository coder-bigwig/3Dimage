package com.medical3d.viewer.modules.share.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ViewerManifestResponse(UUID resultId, String title, String unit, String coordinateSystem,
                                     int manifestVersion, Permissions permissions, List<Layer> layers) {
    public record Permissions(boolean view, boolean measure, boolean annotate,
                              boolean savePlan, boolean download) {}

    public record Layer(UUID id, UUID parentId, String code, String name, String color,
                        double opacity, boolean visible, Double volumeMl, int sortOrder,
                        Map<String, String> assets) {}
}
