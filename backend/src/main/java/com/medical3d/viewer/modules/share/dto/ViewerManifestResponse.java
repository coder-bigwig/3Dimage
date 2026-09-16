package com.medical3d.viewer.modules.share.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ViewerManifestResponse(UUID resultId, String title, String unit, String coordinateSystem,
                                     int manifestVersion, Permissions permissions, List<Layer> layers, String renderStyle,
                                     Volume volume) {
    public ViewerManifestResponse(UUID resultId, String title, String unit, String coordinateSystem,
                                  int manifestVersion, Permissions permissions, List<Layer> layers) {
        this(resultId, title, unit, coordinateSystem, manifestVersion, permissions, layers, null, null);
    }
    public ViewerManifestResponse(UUID resultId, String title, String unit, String coordinateSystem,
                                  int manifestVersion, Permissions permissions, List<Layer> layers,
                                  String renderStyle) {
        this(resultId, title, unit, coordinateSystem, manifestVersion, permissions, layers, renderStyle, null);
    }
    public record Permissions(boolean view, boolean measure, boolean annotate,
                              boolean savePlan, boolean download) {}

    public record Volume(String descriptorUrl) {}

    public record Layer(UUID id, UUID parentId, String code, String name, String color,
                        double opacity, boolean visible, Double volumeMl, int sortOrder,
                        Map<String, String> assets) {}
}
