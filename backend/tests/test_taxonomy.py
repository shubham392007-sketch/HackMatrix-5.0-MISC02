from unittest.mock import MagicMock
from backend.services.taxonomy import TaxonomyService, SYNONYM_MAP


def test_taxonomy_synonym_normalization():
    svc = TaxonomyService()
    assert svc.normalize_skill_name("py") == "Python"
    assert svc.normalize_skill_name("postgres") == "PostgreSQL"
    assert svc.normalize_skill_name("k8s") == "Kubernetes"
    assert svc.normalize_skill_name("fast-api") == "FastAPI"


def test_resolve_skill_matched():
    svc = TaxonomyService()
    svc.client = MagicMock()
    # Mock skill query returning match
    mock_res = MagicMock()
    mock_res.execute.return_value.data = [{"id": "sk-101", "name": "Python", "competency_id": "comp-201"}]
    svc.client.table.return_value.select.return_value.ilike.return_value = mock_res

    skill_id, comp_id = svc.resolve_skill("python3")
    assert skill_id == "sk-101"
    assert comp_id == "comp-201"


def test_resolve_skill_unmapped():
    svc = TaxonomyService()
    svc.client = MagicMock()
    # Mock skill query returning empty
    mock_res = MagicMock()
    mock_res.execute.return_value.data = []
    svc.client.table.return_value.select.return_value.ilike.return_value = mock_res

    # Mock unmapped insert
    mock_insert = MagicMock()
    mock_insert.execute.return_value.data = [{"id": "unmapped-1"}]
    svc.client.table.return_value.insert.return_value = mock_insert

    skill_id, comp_id = svc.resolve_skill("quantum-teleportation-sdk", evidence_id="ev-999")
    assert skill_id is None
    assert comp_id is None
    svc.client.table.assert_called_with("unmapped_skill_candidates")
