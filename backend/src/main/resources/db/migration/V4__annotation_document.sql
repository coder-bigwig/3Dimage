CREATE TABLE viewer_annotation_document (
    result_id UUID PRIMARY KEY REFERENCES case_result(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
