package com.medical3d.viewer.modules.annotation.controller;
import com.medical3d.viewer.modules.annotation.dto.AnnotationDocument;
import com.medical3d.viewer.modules.annotation.service.AnnotationDocumentService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/shared-viewers/{token}/annotations")
public class AnnotationDocumentController {
    private final AnnotationDocumentService service;
    public AnnotationDocumentController(AnnotationDocumentService service) { this.service = service; }
    @GetMapping public AnnotationDocument get(@PathVariable String token) { return service.get(token); }
    @PutMapping public AnnotationDocument save(@PathVariable String token, @RequestBody AnnotationDocument document) { return service.save(token, document); }
}
