package com.medical3d.viewer.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.medical3d.viewer.common.api.ApiError;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

    @Test
    void mapsDomainValidationToUnprocessableEntityWithRequestId() {
        MDC.put("requestId", "request-123");
        try {
            GlobalExceptionHandler handler = new GlobalExceptionHandler();
            ResponseEntity<ApiError> response = handler.handleDomainValidation(
                new DomainValidationException("MODEL_INVALID", "模型数据无效")
            );

            assertThat(response.getStatusCode().value()).isEqualTo(422);
            assertThat(response.getBody()).isEqualTo(
                new ApiError("MODEL_INVALID", "模型数据无效", "request-123", null)
            );
        } finally {
            MDC.clear();
        }
    }
}
