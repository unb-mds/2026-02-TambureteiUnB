from sqlalchemy import Column, Integer, MetaData, String, Table

views_metadata = MetaData()

mv_evasao_campus = Table(
    "mv_evasao_campus",
    views_metadata,
    Column("campus", String(100), primary_key=True),
    Column("ano", Integer, primary_key=True),
    Column("total_cursos", Integer, nullable=False),
    Column("matriculados", Integer, nullable=False),
    Column("desvinculados", Integer, nullable=False),
)
