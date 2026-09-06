package com.medical3d.viewer.common.exception;

public class VersionConflictException extends DomainValidationException {
    public VersionConflictException(String code, String message) {
        super(code, message);
    }
}

