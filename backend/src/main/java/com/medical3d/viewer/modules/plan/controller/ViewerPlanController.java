package com.medical3d.viewer.modules.plan.controller;

import com.medical3d.viewer.modules.plan.dto.SavePlanRequest;
import com.medical3d.viewer.modules.plan.entity.ViewerPlanEntity;
import com.medical3d.viewer.modules.plan.service.ViewerPlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shared-viewers/{token}/plans")
public class ViewerPlanController {
    private final ViewerPlanService service;

    public ViewerPlanController(ViewerPlanService service) { this.service = service; }

    @GetMapping("/{planId}")
    public ViewerPlanEntity get(@PathVariable String token, @PathVariable UUID planId) {
        return service.get(token, planId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ViewerPlanEntity create(@PathVariable String token, @Valid @RequestBody SavePlanRequest request) {
        return service.create(token, request);
    }

    @PutMapping("/{planId}")
    public ViewerPlanEntity update(@PathVariable String token, @PathVariable UUID planId,
                                   @Valid @RequestBody SavePlanRequest request) {
        return service.update(token, planId, request);
    }

    @DeleteMapping("/{planId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String token, @PathVariable UUID planId) {
        service.delete(token, planId);
    }
}
