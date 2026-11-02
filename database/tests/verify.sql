-- New synthetic integration checks, not original academic tests.
-- Run only via Test-LocalDatabase.ps1 after resource/schema identity checks.
-- All rows below, including a non-login password sentinel, are rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $checks$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM portfolio_schema_versions
                   WHERE version = 1 AND project_key = 'boilerroom-tds-portfolio-local-v1') THEN
        RAISE EXCEPTION 'Wrong database schema';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user
               AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication)) THEN
        RAISE EXCEPTION 'Application role has unexpected elevated privileges';
    END IF;
    IF has_schema_privilege(current_user, 'public', 'CREATE') THEN
        RAISE EXCEPTION 'Application role can create schema objects';
    END IF;

    INSERT INTO companycodes VALUES ('_m2_sql_a', '_m2_sql_code_a'), ('_m2_sql_b', '_m2_sql_code_b');
    INSERT INTO users (id, name, email, password, role, organizationid)
    VALUES ('_m2_sql_user', 'Synthetic rollback account', 'm2-sql@example.test',
            'NOT-A-LOGIN-HASH-TRANSACTION-ONLY', 'developer', '_m2_sql_a');

    BEGIN
        INSERT INTO users SELECT '_m2_sql_duplicate', name, upper(email), password, role, organizationid, organizationname
                          FROM users WHERE id = '_m2_sql_user';
        RAISE EXCEPTION 'Case-insensitive email uniqueness was not enforced';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO users VALUES ('_m2_sql_orphan', 'Synthetic', 'm2-orphan@example.test',
                                 'NOT-A-LOGIN-HASH-TRANSACTION-ONLY', 'developer', '_missing_m2_org', NULL);
        RAISE EXCEPTION 'Organization FK was not enforced';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO projects (id, name, assignedto, organizationid)
        VALUES (gen_random_uuid(), 'Synthetic invalid assignment', '_m2_sql_user', '_m2_sql_b');
        RAISE EXCEPTION 'Same-organization assignment was not enforced';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO projects (id, name, assignedto, organizationid)
        VALUES (gen_random_uuid(), 'Synthetic empty assignment', '', '_m2_sql_a');
        RAISE EXCEPTION 'Empty assignment unexpectedly identified a user';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO projects (id, name, status, organizationid)
        VALUES (gen_random_uuid(), 'Synthetic null status', NULL, '_m2_sql_a');
        RAISE EXCEPTION 'Explicit NULL status was not rejected';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO projects (id, name, organizationid) VALUES (gen_random_uuid(), ' ', '_m2_sql_a');
        RAISE EXCEPTION 'Blank project name was not rejected';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    INSERT INTO projects (id, name, assignedto, organizationid)
    VALUES (gen_random_uuid(), 'Synthetic valid assignment', '_m2_sql_user', '_m2_sql_a');
    INSERT INTO projects (id, name, organizationid)
    VALUES (gen_random_uuid(), 'Synthetic unassigned project', '_m2_sql_a');
    IF (SELECT count(*) FROM projects WHERE organizationid = '_m2_sql_a' AND status = 'active') <> 2 THEN
        RAISE EXCEPTION 'Status default / valid assignments failed';
    END IF;

    INSERT INTO test VALUES ('_m2_sql_legacy');
    UPDATE test SET text = '_m2_sql_legacy_updated' WHERE text = '_m2_sql_legacy';
    IF (SELECT count(*) FROM test WHERE text = '_m2_sql_legacy_updated') <> 1 THEN
        RAISE EXCEPTION 'Legacy text update/read failed';
    END IF;
    DELETE FROM test WHERE text = '_m2_sql_legacy_updated';
    IF EXISTS (SELECT 1 FROM test WHERE text = '_m2_sql_legacy_updated') THEN
        RAISE EXCEPTION 'Legacy text delete failed';
    END IF;
END
$checks$;
ROLLBACK;
SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM companycodes WHERE organizationid = '_m2_sql_a')
            THEN 'sql-integrity-and-rollback-ok' ELSE 'rollback-failed' END;
