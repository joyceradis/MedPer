from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text


def test_legacy_migration_preserves_data_and_never_guesses_an_ambiguous_owner(tmp_path):
    engine = create_engine('sqlite:///' + str(tmp_path / 'legacy.db'))
    with engine.begin() as db:
        db.execute(text('CREATE TABLE users (id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36))'))
        db.execute(text('CREATE TABLE cases (id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36), payload TEXT)'))
        db.execute(text('CREATE TABLE audit_log (user_id VARCHAR(36), organization_id VARCHAR(36), entity_id VARCHAR(36), entity_type TEXT, action TEXT)'))
        db.execute(text("INSERT INTO users VALUES ('alice','team'),('bob','team'),('outsider','other')"))
        db.execute(text("INSERT INTO cases VALUES ('known','team','preserved-1'),('ambiguous','team','preserved-2'),('unknown','team','preserved-3'),('foreign','team','preserved-4')"))
        db.execute(text("INSERT INTO audit_log VALUES ('alice','team','known','case','create'),('alice','team','ambiguous','case','create_v2'),('bob','team','ambiguous','case','import'),('outsider','other','foreign','case','create')"))
        spec = spec_from_file_location('case_owner_migration', Path(__file__).resolve().parents[1] / 'alembic/versions/0008_case_owner.py')
        migration = module_from_spec(spec)
        spec.loader.exec_module(migration)
        with Operations.context(MigrationContext.configure(db)):
            migration.upgrade()
            migration.upgrade()  # retry must not reassign or drop anything
        rows = db.execute(text('SELECT id,payload,owner_user_id FROM cases ORDER BY id')).all()
        assert rows == [('ambiguous','preserved-2',None), ('foreign','preserved-4',None),
                        ('known','preserved-1','alice'), ('unknown','preserved-3',None)]
        assert db.scalar(text('SELECT count(*) FROM audit_log')) == 4
