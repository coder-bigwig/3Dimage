package com.medical3d.viewer.modules.annotation.dto;

import com.medical3d.viewer.common.exception.DomainValidationException;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;

/** Coordinates match the browser contract: normalized 2D; layer-local 3D; CSS pixel label offsets. */
public record AnnotationDocument(int version, List<Drawing> drawings, List<Model> models) {
    public record Point(Double x, Double y) {}
    public record Drawing(UUID id, String kind, String color, List<Point> points, String text) {}
    public record Model(UUID id, UUID layerId, List<Double> position, String text, List<Double> offset) {}
    public AnnotationDocument withVersion(int value) { return new AnnotationDocument(value, drawings, models); }
    public void validate(Set<UUID> layers) {
        require(version >= 0 && version < Integer.MAX_VALUE && drawings != null && models != null);
        require(drawings.size() <= 200 && models.size() <= 200);
        Set<UUID> ids = new HashSet<>();
        int total = 0;
        for (Drawing d : drawings) {
            require(d != null && d.id() != null && ids.add(d.id()));
            require(d.kind() != null && Set.of("pen", "line", "arrow", "ellipse", "rectangle", "text").contains(d.kind()));
            require(d.color() != null && d.color().matches("#[0-9a-fA-F]{6}"));
            require(d.points() != null && !d.points().isEmpty() && d.points().size() <= 2000);
            require(d.kind().equals("pen") || d.points().size() == (d.kind().equals("text") ? 1 : 2));
            require(d.text() != null && d.text().length() <= 200 && (!d.kind().equals("text") || !d.text().isBlank()));
            for (Point p : d.points()) require(p != null && finite(p.x(), 0, 1) && finite(p.y(), 0, 1));
            total += d.points().size();
        }
        require(total <= 20000);
        for (Model m : models) {
            require(m != null && m.id() != null && ids.add(m.id()) && layers.contains(m.layerId()));
            require(m.text() != null && !m.text().isBlank() && m.text().length() <= 200);
            require(m.position() != null && m.position().size() == 3 && m.position().stream().allMatch(v -> finite(v, -1e9, 1e9)));
            require(m.offset() != null && m.offset().size() == 2 && m.offset().stream().allMatch(v -> finite(v, -2000, 2000)));
        }
    }
    private static boolean finite(Double value, double min, double max) { return value != null && Double.isFinite(value) && value >= min && value <= max; }
    private static void require(boolean valid) { if (!valid) throw new DomainValidationException("INVALID_ANNOTATIONS", "标注内容或坐标无效，请检查图层、文字及数量限制"); }
}
