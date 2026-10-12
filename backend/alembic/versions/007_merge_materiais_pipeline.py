"""Unifica as revisoes de materiais e do pipeline sem modificar o esquema."""

revision = "007_merge_materiais_pipeline"
down_revision = ("006", "002_materiais")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
