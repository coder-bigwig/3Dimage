CREATE TABLE case_result (
    id UUID PRIMARY KEY,
    case_code VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    unit VARCHAR(16) NOT NULL,
    coordinate_system VARCHAR(16) NOT NULL,
    manifest_version INTEGER NOT NULL CHECK (manifest_version > 0),
    status VARCHAR(24) NOT NULL CHECK (status IN ('DRAFT', 'PROCESSING', 'PUBLISHED', 'FAILED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uk_case_result_case_code ON case_result(case_code);
CREATE INDEX idx_case_result_status ON case_result(status);

CREATE TABLE model_layer (
    id UUID PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES case_result(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES model_layer(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    default_color VARCHAR(9) NOT NULL,
    default_opacity NUMERIC(4,3) NOT NULL CHECK (default_opacity BETWEEN 0 AND 1),
    default_visible BOOLEAN NOT NULL,
    volume_ml NUMERIC(14,3) CHECK (volume_ml IS NULL OR volume_ml >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    base_transform JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(result_id, code)
);
CREATE INDEX idx_model_layer_result ON model_layer(result_id);
CREATE INDEX idx_model_layer_parent ON model_layer(parent_id);

CREATE TABLE model_asset (
    id UUID PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES case_result(id) ON DELETE CASCADE,
    layer_id UUID REFERENCES model_layer(id) ON DELETE CASCADE,
    variant VARCHAR(16) NOT NULL CHECK (variant IN ('ORIGINAL', 'CANONICAL', 'HIGH', 'MEDIUM', 'LOW')),
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('MINIO', 'OSS')),
    bucket VARCHAR(100) NOT NULL,
    object_key VARCHAR(1024) NOT NULL,
    format VARCHAR(16) NOT NULL,
    compression VARCHAR(32),
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    triangle_count BIGINT CHECK (triangle_count IS NULL OR triangle_count >= 0),
    checksum VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, bucket, object_key)
);
CREATE INDEX idx_model_asset_result ON model_asset(result_id);
CREATE INDEX idx_model_asset_layer ON model_asset(layer_id);
CREATE INDEX idx_model_asset_status ON model_asset(status);

CREATE TABLE viewer_share (
    id UUID PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES case_result(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_viewer_share_result ON viewer_share(result_id);
CREATE INDEX idx_viewer_share_expires ON viewer_share(expires_at);

CREATE TABLE viewer_plan (
    id UUID PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES case_result(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    scene_state JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_viewer_plan_result ON viewer_plan(result_id);

CREATE TABLE measurement (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES viewer_plan(id) ON DELETE CASCADE,
    layer_id UUID REFERENCES model_layer(id) ON DELETE SET NULL,
    type VARCHAR(24) NOT NULL,
    geometry JSONB NOT NULL,
    style JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_measurement_plan ON measurement(plan_id);
CREATE INDEX idx_measurement_layer ON measurement(layer_id);

CREATE TABLE annotation (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES viewer_plan(id) ON DELETE CASCADE,
    layer_id UUID REFERENCES model_layer(id) ON DELETE SET NULL,
    text VARCHAR(1000) NOT NULL,
    geometry JSONB NOT NULL,
    style JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_annotation_plan ON annotation(plan_id);
CREATE INDEX idx_annotation_layer ON annotation(layer_id);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    result_id UUID REFERENCES case_result(id) ON DELETE SET NULL,
    share_id UUID REFERENCES viewer_share(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    actor_hash VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_log_result ON audit_log(result_id);
CREATE INDEX idx_audit_log_share ON audit_log(share_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);

