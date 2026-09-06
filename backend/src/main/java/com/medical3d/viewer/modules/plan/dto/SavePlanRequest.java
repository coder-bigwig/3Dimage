package com.medical3d.viewer.modules.plan.dto;

import com.medical3d.viewer.modules.annotation.dto.AnnotationEvent;
import com.medical3d.viewer.modules.measurement.dto.MeasurementEvent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

import java.util.List;

public record SavePlanRequest(
    @NotBlank @Size(max = 200) String name,
    @Max(Integer.MAX_VALUE) int expectedVersion,
    @NotNull JsonNode sceneState,
    @NotNull @Size(max = 200) List<@Valid MeasurementEvent> measurements,
    @NotNull @Size(max = 200) List<@Valid AnnotationEvent> annotations
) {}
