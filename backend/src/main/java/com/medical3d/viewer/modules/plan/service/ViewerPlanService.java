package com.medical3d.viewer.modules.plan.service;

import com.medical3d.viewer.modules.plan.dto.SavePlanRequest;
import com.medical3d.viewer.modules.plan.entity.ViewerPlanEntity;

import java.util.UUID;

public interface ViewerPlanService {
    ViewerPlanEntity get(String token, UUID planId);
    ViewerPlanEntity create(String token, SavePlanRequest request);
    ViewerPlanEntity update(String token, UUID planId, SavePlanRequest request);
    void delete(String token, UUID planId);
}
