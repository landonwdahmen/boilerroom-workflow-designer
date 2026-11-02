-- October 2026 individual portfolio modernization. Additive, explicit, repeatable migration.
\set ON_ERROR_STOP on
\getenv app_user TDS_APP_DB_USER
SELECT EXISTS (SELECT 1 FROM portfolio_schema_versions
    WHERE version=3 AND project_key='boilerroom-tds-portfolio-graphs-v3') AS already_applied \gset
\if :already_applied
    \echo 'Graph schema version 3 already applied; no changes.'
\else
BEGIN;
-- A missing prerequisite aborts the transaction rather than guessing an older schema.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM portfolio_schema_versions
        WHERE version=2 AND project_key='boilerroom-tds-portfolio-auth-v2') THEN
        RAISE EXCEPTION 'Authentication migration version 2 required';
    END IF;
END $$;
CREATE TABLE project_graphs (
    project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    schema_version integer NOT NULL CHECK (schema_version=1),
    revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
    document jsonb NOT NULL CHECK (jsonb_typeof(document)='object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (updated_at >= created_at),
    CHECK (document->'schemaVersion' = to_jsonb(schema_version)
        AND jsonb_typeof(document->'nodes')='array' AND jsonb_typeof(document->'edges')='array'
        AND document ?& ARRAY['schemaVersion','nodes','edges'])
);
-- The primary-key index serves project lookup, uniqueness and the cascading FK.
GRANT SELECT, INSERT, UPDATE, DELETE ON project_graphs TO :"app_user";
INSERT INTO portfolio_schema_versions(version,project_key,description)
VALUES (3,'boilerroom-tds-portfolio-graphs-v3','M4B one versioned design-only JSONB graph per project');
COMMIT;
\endif
