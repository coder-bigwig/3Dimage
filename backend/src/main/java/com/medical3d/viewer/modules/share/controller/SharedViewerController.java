package com.medical3d.viewer.modules.share.controller;

import com.medical3d.viewer.modules.share.dto.ViewerManifestResponse;
import com.medical3d.viewer.modules.share.service.SharedViewerService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/shared-viewers")
public class SharedViewerController {
    private final SharedViewerService service;

    public SharedViewerController(SharedViewerService service) {
        this.service = service;
    }

    @GetMapping("/{token}/manifest")
    public ViewerManifestResponse getManifest(@PathVariable String token) {
        return service.getManifest(token);
    }
}
