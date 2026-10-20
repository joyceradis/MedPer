-- Execute como proprietário após as migrações.
-- A API define app.organization_id e app.user_id no início de cada transação autenticada.
-- Tabelas de bootstrap/autenticação (organizations, users, refresh_sessions e
-- password_reset_tokens) não recebem RLS porque login, refresh e recuperação
-- acontecem antes de existir contexto de tenant. Elas usam tokens opacos com hash
-- e consultas estritamente por identificador secreto.

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stored_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE cases FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE observations FORCE ROW LEVEL SECURITY;
ALTER TABLE findings FORCE ROW LEVEL SECURITY;
ALTER TABLE conclusions FORCE ROW LEVEL SECURITY;
ALTER TABLE stored_files FORCE ROW LEVEL SECURITY;
ALTER TABLE imported_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_cases ON cases;
CREATE POLICY tenant_cases ON cases
USING (organization_id = current_setting('app.organization_id', true)
       AND owner_user_id = current_setting('app.user_id', true))
WITH CHECK (organization_id = current_setting('app.organization_id', true)
            AND owner_user_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS tenant_evidence ON evidence;
CREATE POLICY tenant_evidence ON evidence
USING (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = evidence.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = evidence.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
));

DROP POLICY IF EXISTS tenant_observations ON observations;
CREATE POLICY tenant_observations ON observations
USING (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = observations.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = observations.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
));

DROP POLICY IF EXISTS tenant_findings ON findings;
CREATE POLICY tenant_findings ON findings
USING (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = findings.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = findings.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
));

DROP POLICY IF EXISTS tenant_conclusions ON conclusions;
CREATE POLICY tenant_conclusions ON conclusions
USING (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = conclusions.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM cases c
  WHERE c.id = conclusions.case_id
    AND c.organization_id = current_setting('app.organization_id', true)
));

DROP POLICY IF EXISTS tenant_files ON stored_files;
CREATE POLICY tenant_files ON stored_files
USING (organization_id = current_setting('app.organization_id', true)
       AND EXISTS (SELECT 1 FROM cases c WHERE c.id = stored_files.case_id))
WITH CHECK (organization_id = current_setting('app.organization_id', true)
            AND EXISTS (SELECT 1 FROM cases c WHERE c.id = stored_files.case_id));

DROP POLICY IF EXISTS tenant_snapshots ON imported_snapshots;
CREATE POLICY tenant_snapshots ON imported_snapshots
USING (organization_id = current_setting('app.organization_id', true)
       AND EXISTS (SELECT 1 FROM cases c WHERE c.id = imported_snapshots.case_id))
WITH CHECK (organization_id = current_setting('app.organization_id', true)
            AND EXISTS (SELECT 1 FROM cases c WHERE c.id = imported_snapshots.case_id));

DROP POLICY IF EXISTS tenant_audit ON audit_log;
DROP POLICY IF EXISTS tenant_audit_insert ON audit_log;
CREATE POLICY tenant_audit ON audit_log
FOR SELECT USING (organization_id = current_setting('app.organization_id', true)
                  AND user_id = current_setting('app.user_id', true));
CREATE POLICY tenant_audit_insert ON audit_log
FOR INSERT WITH CHECK (
  organization_id = current_setting('app.organization_id', true)
  AND user_id = current_setting('app.user_id', true)
);

-- Relation tables also contain sensitive case links; raw SQL must not bypass
-- the owner policies applied to their parents.

ALTER TABLE finding_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_evidence FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_owner ON finding_evidence;
CREATE POLICY case_owner ON finding_evidence
USING (EXISTS (SELECT 1 FROM findings l JOIN evidence r ON r.case_id = l.case_id WHERE l.id = finding_evidence.finding_id AND r.id = finding_evidence.evidence_id))
WITH CHECK (EXISTS (SELECT 1 FROM findings l JOIN evidence r ON r.case_id = l.case_id WHERE l.id = finding_evidence.finding_id AND r.id = finding_evidence.evidence_id));

ALTER TABLE finding_observation ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_observation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_owner ON finding_observation;
CREATE POLICY case_owner ON finding_observation
USING (EXISTS (SELECT 1 FROM findings l JOIN observations r ON r.case_id = l.case_id WHERE l.id = finding_observation.finding_id AND r.id = finding_observation.observation_id))
WITH CHECK (EXISTS (SELECT 1 FROM findings l JOIN observations r ON r.case_id = l.case_id WHERE l.id = finding_observation.finding_id AND r.id = finding_observation.observation_id));

ALTER TABLE conclusion_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE conclusion_evidence FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_owner ON conclusion_evidence;
CREATE POLICY case_owner ON conclusion_evidence
USING (EXISTS (SELECT 1 FROM conclusions l JOIN evidence r ON r.case_id = l.case_id WHERE l.id = conclusion_evidence.conclusion_id AND r.id = conclusion_evidence.evidence_id))
WITH CHECK (EXISTS (SELECT 1 FROM conclusions l JOIN evidence r ON r.case_id = l.case_id WHERE l.id = conclusion_evidence.conclusion_id AND r.id = conclusion_evidence.evidence_id));

ALTER TABLE conclusion_finding ENABLE ROW LEVEL SECURITY;
ALTER TABLE conclusion_finding FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_owner ON conclusion_finding;
CREATE POLICY case_owner ON conclusion_finding
USING (EXISTS (SELECT 1 FROM conclusions l JOIN findings r ON r.case_id = l.case_id WHERE l.id = conclusion_finding.conclusion_id AND r.id = conclusion_finding.finding_id))
WITH CHECK (EXISTS (SELECT 1 FROM conclusions l JOIN findings r ON r.case_id = l.case_id WHERE l.id = conclusion_finding.conclusion_id AND r.id = conclusion_finding.finding_id));

ALTER TABLE case_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_deadlines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_owner ON case_deadlines;
CREATE POLICY case_owner ON case_deadlines
USING (organization_id = current_setting('app.organization_id', true) AND EXISTS (SELECT 1 FROM cases c WHERE c.id = case_deadlines.case_id))
WITH CHECK (organization_id = current_setting('app.organization_id', true) AND EXISTS (SELECT 1 FROM cases c WHERE c.id = case_deadlines.case_id));

ALTER TABLE deadline_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadline_reminders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_owner ON deadline_reminders;
CREATE POLICY case_owner ON deadline_reminders
USING (EXISTS (SELECT 1 FROM case_deadlines d WHERE d.id = deadline_reminders.deadline_id))
WITH CHECK (EXISTS (SELECT 1 FROM case_deadlines d WHERE d.id = deadline_reminders.deadline_id));
