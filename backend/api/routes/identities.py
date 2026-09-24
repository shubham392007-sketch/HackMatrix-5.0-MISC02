"""Identity Mapping API Endpoints."""
from fastapi import APIRouter
from backend.evidence.identity_resolver import IdentityResolver
from backend.schemas.integrations import IdentityMapRequest

router = APIRouter(prefix="/integrations/identities", tags=["Identity Mapping"])


@router.post("/map")
async def map_external_identity(req: IdentityMapRequest):
    """Explicitly map an external GitHub username or Jira email to an internal GrowthLens employee."""
    resolver = IdentityResolver()
    result = resolver.map_identity(
        employee_id=req.employee_id,
        provider=req.provider,
        external_username=req.external_username,
        external_email=req.external_email,
        external_user_id=req.external_user_id,
    )
    return {
        "status": "success",
        "message": f"Successfully mapped {req.provider} identity to employee {req.employee_id}",
        "mapping": result
    }


@router.get("/{employee_id}")
async def list_employee_identities(employee_id: str):
    """List all external identities registered for a specific employee."""
    resolver = IdentityResolver()
    identities = resolver.list_identities(employee_id)
    return {
        "employee_id": employee_id,
        "count": len(identities),
        "identities": identities
    }
