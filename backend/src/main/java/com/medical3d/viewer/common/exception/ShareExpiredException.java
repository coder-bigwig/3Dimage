package com.medical3d.viewer.common.exception;

public class ShareExpiredException extends DomainValidationException {
    public ShareExpiredException() {
        super("SHARE_EXPIRED", "分享链接已失效");
    }
}

