-- Execute como proprietário depois da migração.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='medper_app') THEN
    CREATE ROLE medper_app LOGIN PASSWORD 'replace-me';
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO medper_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medper_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medper_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_log FROM medper_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO medper_app;
