-- October 2026 additive authentication migration, also used on fresh empty-volume initialization.
-- Existing business rows and the original schema are preserved. Apply explicitly to an existing DB.
\set ON_ERROR_STOP on
\getenv app_user TDS_APP_DB_USER
SELECT EXISTS (SELECT 1 FROM portfolio_schema_versions
               WHERE version=2 AND project_key='boilerroom-tds-portfolio-auth-v2') AS already_applied \gset
\if :already_applied
    \echo 'Authentication schema version 2 already applied; no changes.'
\else
BEGIN;
CREATE TABLE invitations (
    id uuid PRIMARY KEY,
    token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[A-F0-9]{64}$'),
    organizationid text NOT NULL REFERENCES companycodes (organizationid),
    email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    CONSTRAINT invitations_issuer_organization_fk
        FOREIGN KEY (created_by, organizationid) REFERENCES users (id, organizationid),
    CHECK (expires_at > created_at),
    CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);
CREATE INDEX invitations_organization_email_idx ON invitations (organizationid, email);
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO :"app_user";
INSERT INTO portfolio_schema_versions (version, project_key, description)
VALUES (2, 'boilerroom-tds-portfolio-auth-v2', 'M3A email-bound single-use expiring developer invitations');
COMMIT;
\endif
