-- Execute como proprietário após as migrações.
-- A API define app.organization_id e app.user_id no início da transação autenticada.

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE stored_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE cases FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE observations FORCE ROW LEVEL SECURITY;
ALTER TABLE findings FORCE ROW LEVEL SECURITY;
ALTER TABLE conclusions FORCE ROW LEVEL SECURITY;
ALTER TABLE refresh_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE stored_files FORCE ROW LEVEL SECURITY;
ALTER TABLE imported_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_cases ON cases;
CREATE POLICY tenant_cases ON cases
USING (organization_id = current_setting('app.organization_id', true))
WITH CHECK (organization_id = current_setting('app.organization_id', true));

DROP POLICY IF EXISTS tenant_evidence ON evidence;
CREATE POLICY tenant_evidence ON evidence
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = evidence.case_id AND c.organization_id = current_setting('app.organization_id', true)))
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = evidence.case_id AND c.organization_id = current_setting('app.organization_id', true)));

DROP POLICY IF EXISTS tenant_observations ON observations;
CREATE POLICY tenant_observations ON observations
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = observations.case_id AND c.organization_id = current_setting('app.organization_id', true)))
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = observations.case_id AND c.organization_id = current_setting('app.organization_id', true)));

DROP POLICY IF EXISTS tenant_findings ON findings;
CREATE POLICY tenant_findings ON findings
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = findings.case_id AND c.organization_id = current_setting('app.organization_id', true)))
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = findings.case_id AND c.organization_id = current_setting('app.organization_id', true)));

DROP POLICY IF EXISTS tenant_conclusions ON conclusions;
CREATE POLICY tenant_conclusions ON conclusions
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = conclusions.case_id AND c.organization_id = current_setting('app.organization_id', true)))
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = conclusions.case_id AND c.organization_id = current_setting('app.organization_id', true)));

DROP POLICY IF EXISTS tenant_sessions ON refresh_sessions;
CREATE POLICY tenant_sessions ON refresh_sessions
USING (organization_id = current_setting('app.organization_id', true))
WITH CHECK (organization_id = current_setting('app.organization_id', true));

DROP POLICY IF EXISTS tenant_reset_tokens ON password_reset_tokens;
CREATE POLICY tenant_reset_tokens ON password_reset_tokens
USING (organization_id = current_setting('app.organization_id', true))
WITH CHECK (organization_id = current_setting('app.organization_id', true));

DROP POLICY IF EXISTS tenant_files ON stored_files;
CREATE POLICY tenant_files ON stored_files
USING (organization_id = current_setting('app.organization_id', true))
WITH CHECK (organization_id = current_setting('app.organization_id', true));

DROP POLICY IF EXISTS tenant_snapshots ON imported_snapshots;
CREATE POLICY tenant_snapshots ON imported_snapshots
USING (organization_id = current_setting('app.organization_id', true))
WITH CHECK (organization_id = current_setting('app.organization_id', true));

DROP POLICY IF EXISTS tenant_audit ON audit_log;
CREATE POLICY tenant_audit ON audit_log
FOR SELECT USING (organization_id = current_setting('app.organization_id', true));
CREATE POLICY tenant_audit_insert ON audit_log
FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', true)
  AND user_id = current_setting('app.user_id', true)
);
