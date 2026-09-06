package com.medical3d.viewer.modules.plan.mapper;

import java.util.UUID;

public record UpdatePlanStateCommand(UUID id, UUID resultId, String name, String sceneState,
                                     int expectedVersion) {}
