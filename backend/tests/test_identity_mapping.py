from unittest.mock import MagicMock
import pytest
from backend.evidence.identity_resolver import IdentityResolver
from backend.core.exceptions import IdentityMappingError


def test_resolve_github_employee_missing():
    resolver = IdentityResolver()
    resolver.client = MagicMock()
    # Mock table.select.eq.eq.execute returning empty
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = []
    resolver.client.table.return_value.select.return_value.eq.return_value.eq.return_value = mock_execute

    emp_id = resolver.resolve_github_employee("unknown-ghost-user")
    assert emp_id is None


def test_resolve_github_employee_found():
    resolver = IdentityResolver()
    resolver.client = MagicMock()
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{"employee_id": "emp-uuid-42"}]
    resolver.client.table.return_value.select.return_value.eq.return_value.eq.return_value = mock_execute

    emp_id = resolver.resolve_github_employee("octocat")
    assert emp_id == "emp-uuid-42"


def test_map_identity_invalid_employee():
    resolver = IdentityResolver()
    resolver.client = MagicMock()
    # Mock employee table check returning empty
    mock_emp = MagicMock()
    mock_emp.execute.return_value.data = []
    resolver.client.table.return_value.select.return_value.eq.return_value = mock_emp

    with pytest.raises(IdentityMappingError):
        resolver.map_identity("non-existent-emp-id", "github", external_username="octocat")
