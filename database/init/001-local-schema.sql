-- New 2026 portfolio reconstruction; see database/SCHEMA_INVENTORY.md.
-- Official image runs this once, only on a NEW empty named volume.
\set ON_ERROR_STOP on
\set VERBOSITY terse
\getenv app_user TDS_APP_DB_USER
\getenv app_password TDS_APP_DB_PASSWORD

BEGIN;

-- Identifiers and password are quoted by PostgreSQL, never shell-interpolated.
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
              :'app_user', :'app_password') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";

CREATE TABLE portfolio_schema_versions (
    version integer PRIMARY KEY,
    project_key text NOT NULL,
    description text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companycodes (
    organizationid text PRIMARY KEY CHECK (btrim(organizationid) <> ''),
    code text NOT NULL UNIQUE CHECK (btrim(code) <> '')
);

CREATE TABLE users (
    id text PRIMARY KEY CHECK (btrim(id) <> ''),
    name text NOT NULL CHECK (btrim(name) <> ''),
    email text NOT NULL CHECK (btrim(email) <> ''),
    password text NOT NULL,
    role text NOT NULL CHECK (btrim(role) <> ''),
    organizationid text REFERENCES companycodes (organizationid),
    organizationname text,
    CONSTRAINT users_id_organization_key UNIQUE (id, organizationid)
);
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
CREATE INDEX users_organization_idx ON users (organizationid);

CREATE TABLE projects (
    id uuid PRIMARY KEY,
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text,
    status text NOT NULL DEFAULT 'active' CHECK (btrim(status) <> ''),
    assignedto text,
    organizationid text NOT NULL REFERENCES companycodes (organizationid),
    CONSTRAINT projects_assignee_organization_fk
        FOREIGN KEY (assignedto, organizationid) REFERENCES users (id, organizationid)
);
CREATE INDEX projects_organization_idx ON projects (organizationid);
CREATE INDEX projects_assigned_organization_idx ON projects (assignedto, organizationid);

CREATE TABLE test (text text NOT NULL);

INSERT INTO portfolio_schema_versions (version, project_key, description)
VALUES (1, 'boilerroom-tds-portfolio-local-v1', '2026 reconstruction of active recovered Npgsql contracts');

GRANT SELECT, INSERT, UPDATE, DELETE ON companycodes, users, projects, test TO :"app_user";
GRANT SELECT ON portfolio_schema_versions TO :"app_user";

COMMIT;
