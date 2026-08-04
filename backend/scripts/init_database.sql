DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'medper_app') THEN
    CREATE ROLE medper_app LOGIN PASSWORD 'dev-app-password';
  END IF;
END $$;

GRANT CONNECT ON DATABASE medper TO medper_app;
GRANT USAGE ON SCHEMA public TO medper_app;
