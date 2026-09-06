package com.medical3d.viewer.modules.share.service;

import com.medical3d.viewer.modules.share.dto.ViewerManifestResponse;

public interface SharedViewerService {
    ViewerManifestResponse getManifest(String token);
}
