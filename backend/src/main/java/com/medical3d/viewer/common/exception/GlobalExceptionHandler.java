package com.medical3d.viewer.common.exception;

import com.medical3d.viewer.common.api.ApiError;
import java.util.List;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedDomainException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedDomainException exception) {
        return response(HttpStatus.FORBIDDEN, exception.code(), exception.getMessage(), null);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException exception) {
        return response(HttpStatus.NOT_FOUND, exception.code(), exception.getMessage(), null);
    }

    @ExceptionHandler(VersionConflictException.class)
    public ResponseEntity<ApiError> handleConflict(VersionConflictException exception) {
        return response(HttpStatus.CONFLICT, exception.code(), exception.getMessage(), null);
    }

    @ExceptionHandler(ShareExpiredException.class)
    public ResponseEntity<ApiError> handleExpired(ShareExpiredException exception) {
        return response(HttpStatus.GONE, exception.code(), exception.getMessage(), null);
    }

    @ExceptionHandler(StorageUnavailableException.class)
    public ResponseEntity<ApiError> handleStorage(StorageUnavailableException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, exception.code(), exception.getMessage(), null);
    }

    @ExceptionHandler(DomainValidationException.class)
    public ResponseEntity<ApiError> handleDomainValidation(DomainValidationException exception) {
        return response(HttpStatus.UNPROCESSABLE_ENTITY, exception.code(), exception.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        List<String> details = exception.getBindingResult().getFieldErrors().stream()
            .map(this::formatFieldError)
            .toList();
        return response(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "请求参数无效", details);
    }

    private String formatFieldError(FieldError error) {
        return error.getField() + ": " + error.getDefaultMessage();
    }

    private ResponseEntity<ApiError> response(HttpStatus status, String code, String message, Object details) {
        return ResponseEntity.status(status)
            .body(new ApiError(code, message, MDC.get("requestId"), details));
    }
}

