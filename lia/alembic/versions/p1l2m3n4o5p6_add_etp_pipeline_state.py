"""add_etp_pipeline_state

Adiciona colunas para o pipeline ETP multi-etapas ao modelo ETP.
- etp_pipeline_state: JSON com o estado acumulado do pipeline
- passo_pipeline_atual: Inteiro indicando o passo atual (0-6)

Revision ID: p1l2m3n4o5p6
Revises: k7l8m9n0p1q2
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'p1l2m3n4o5p6'
down_revision = '9ecda614cab1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('etps', sa.Column(
        'etp_pipeline_state', sa.JSON(), nullable=True,
        comment='JSON com estado acumulado do pipeline ETP (6 passos)'
    ))
    op.add_column('etps', sa.Column(
        'passo_pipeline_atual', sa.Integer(), nullable=True, server_default='0',
        comment='Passo atual do pipeline: 0=não iniciado, 1-6=em andamento'
    ))


def downgrade() -> None:
    op.drop_column('etps', 'passo_pipeline_atual')
    op.drop_column('etps', 'etp_pipeline_state')
