package com.medical3d.viewer.modules.annotation.dto;

import com.medical3d.viewer.modules.measurement.dto.MeasurementEvent.Point;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

import java.util.UUID;

public record AnnotationEvent(@NotNull UUID id, UUID layerId,
                              @NotBlank @Size(max = 1000) String text,
                              @NotNull @Valid Point point, @NotNull JsonNode style) {}
