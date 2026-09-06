package com.medical3d.viewer.modules.share.security;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
public final class ShareTokenHasher {
    public String hash(String token) {
        if (token == null || token.length() < 32 || token.length() > 256
            || !token.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Invalid share token");
        }
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
