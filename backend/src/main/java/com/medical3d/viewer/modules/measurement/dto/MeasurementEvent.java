package com.medical3d.viewer.modules.measurement.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.UUID;

public record MeasurementEvent(@NotNull UUID id, UUID layerId, @NotBlank String type,
                               @NotEmpty @Size(max = 128) List<@Valid Point> points,
                               @NotNull JsonNode style) {
    public record Point(double x, double y, double z) {
        public boolean finite() { return Double.isFinite(x) && Double.isFinite(y) && Double.isFinite(z); }
    }
}
