"""merge_migration_heads

Revision ID: 44c9c5bdd84c
Revises: 002_consolidated_platform_schema, 010_add_roadmap_gen_meta
Create Date: 2026-10-25 08:19:24.940195

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011_merge_migration_heads'
down_revision: Union[str, None] = ('002_consolidated_platform_schema', '010_add_roadmap_gen_meta')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
