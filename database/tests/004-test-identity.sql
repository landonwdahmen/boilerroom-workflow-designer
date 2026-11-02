-- Test Compose ONLY. Never mount/apply this file to the development database.
\set ON_ERROR_STOP on
\getenv app_user TDS_APP_DB_USER
CREATE TABLE m6a_test_identity(scope text PRIMARY KEY CHECK(scope='isolated-synthetic-tests'));
INSERT INTO m6a_test_identity VALUES('isolated-synthetic-tests');
GRANT SELECT ON m6a_test_identity TO :"app_user";
