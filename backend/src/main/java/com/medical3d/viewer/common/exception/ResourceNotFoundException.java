package com.medical3d.viewer.common.exception;

public class ResourceNotFoundException extends DomainValidationException {
    public ResourceNotFoundException(String code, String message) {
        super(code, message);
    }
}

