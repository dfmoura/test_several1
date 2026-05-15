package com.mitralab.datasource;

import com.mitralab.MitralabProperties;
import com.mitralab.entity.ExternalConnectionEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Resolves DB passwords from env keys (preferred) or optional dev inline field.
 */
@Component
public class CredentialResolver {

    private final MitralabProperties properties;

    public CredentialResolver(MitralabProperties properties) {
        this.properties = properties;
    }

    public String resolvePassword(ExternalConnectionEntity conn) {
        if (StringUtils.hasText(conn.getPasswordEnvKey())) {
            String v = System.getenv(conn.getPasswordEnvKey());
            if (!StringUtils.hasText(v)) {
                throw new IllegalStateException(
                        "Environment variable '" + conn.getPasswordEnvKey() + "' is not set");
            }
            return v;
        }
        if (properties.isAllowInlineConnectionPassword() && StringUtils.hasText(conn.getDevPassword())) {
            return conn.getDevPassword();
        }
        throw new IllegalStateException(
                "No password: set passwordEnvKey on the connection (recommended) or enable "
                        + "mitralab.allow-inline-connection-password for local dev only.");
    }
}
