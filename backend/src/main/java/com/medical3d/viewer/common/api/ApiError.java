package com.medical3d.viewer.common.api;

public record ApiError(String code, String message, String requestId, Object details) {
}

