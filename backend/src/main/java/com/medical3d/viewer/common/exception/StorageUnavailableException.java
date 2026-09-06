package com.medical3d.viewer.common.exception;

public class StorageUnavailableException extends DomainValidationException {
    public StorageUnavailableException(String message, Throwable cause) {
        super("STORAGE_UNAVAILABLE", message);
        initCause(cause);
    }
}

