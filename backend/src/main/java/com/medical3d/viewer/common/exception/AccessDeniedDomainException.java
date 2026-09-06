package com.medical3d.viewer.common.exception;

public class AccessDeniedDomainException extends DomainValidationException {
    public AccessDeniedDomainException(String code, String message) {
        super(code, message);
    }
}

