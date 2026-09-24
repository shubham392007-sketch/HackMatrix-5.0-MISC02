"""Service for resolving and registering external identities to GrowthLens employees."""
from typing import Optional, Dict, Any, List
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger
from backend.core.exceptions import IdentityMappingError

logger = get_logger("evidence.identity_resolver")


class IdentityResolver:
    """Handles bidirectional resolution between external platform identities and internal employee UUIDs."""

    def __init__(self):
        self.client = get_supabase_client()

    def resolve_github_employee(self, username: Optional[str], email: Optional[str] = None) -> Optional[str]:
        """Resolves a GitHub username or commit email to an internal employee_id."""
        if not username and not email:
            return None

        # Check by GitHub username
        if username:
            res = (
                self.client.table("integration_identities")
                .select("employee_id")
                .eq("provider", "github")
                .eq("external_username", username)
                .execute()
            )
            if res.data:
                return res.data[0]["employee_id"]

        # Check by email if provided
        if email:
            res = (
                self.client.table("integration_identities")
                .select("employee_id")
                .eq("provider", "github")
                .eq("external_email", email)
                .execute()
            )
            if res.data:
                return res.data[0]["employee_id"]

        return None

    def resolve_jira_employee(self, email: Optional[str], username: Optional[str] = None) -> Optional[str]:
        """Resolves a Jira email address or username/accountId to an internal employee_id."""
        if not email and not username:
            return None

        # Check by Jira email first
        if email:
            res = (
                self.client.table("integration_identities")
                .select("employee_id")
                .eq("provider", "jira")
                .eq("external_email", email)
                .execute()
            )
            if res.data:
                return res.data[0]["employee_id"]

        # Check by external username or accountId
        if username:
            res = (
                self.client.table("integration_identities")
                .select("employee_id")
                .eq("provider", "jira")
                .eq("external_username", username)
                .execute()
            )
            if res.data:
                return res.data[0]["employee_id"]

        return None

    def map_identity(
        self,
        employee_id: str,
        provider: str,
        external_username: Optional[str] = None,
        external_email: Optional[str] = None,
        external_user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Registers or updates an explicit mapping from an external identity to an internal employee."""
        # Verify that the employee actually exists
        emp_check = self.client.table("employees").select("id").eq("id", employee_id).execute()
        if not emp_check.data:
            raise IdentityMappingError(f"Employee with ID '{employee_id}' does not exist.")

        provider_norm = provider.lower().strip()
        payload = {
            "employee_id": employee_id,
            "provider": provider_norm,
            "external_username": external_username,
            "external_email": external_email,
            "external_user_id": external_user_id,
        }

        # Remove keys with None values
        payload = {k: v for k, v in payload.items() if v is not None}

        # Check if mapping already exists to prevent duplicate constraint violation
        query = self.client.table("integration_identities").select("id").eq("provider", provider_norm)
        if external_username:
            query = query.eq("external_username", external_username)
        elif external_email:
            query = query.eq("external_email", external_email)
        
        existing = query.execute()
        if existing.data:
            # Update existing
            row_id = existing.data[0]["id"]
            res = self.client.table("integration_identities").update(payload).eq("id", row_id).execute()
            logger.info(f"Updated identity mapping for employee {employee_id} ({provider_norm})")
            return res.data[0] if res.data else payload
        else:
            # Insert new
            res = self.client.table("integration_identities").insert(payload).execute()
            logger.info(f"Created identity mapping for employee {employee_id} ({provider_norm})")
            return res.data[0] if res.data else payload

    def list_identities(self, employee_id: str) -> List[Dict[str, Any]]:
        """List all external identities registered to an employee."""
        res = (
            self.client.table("integration_identities")
            .select("*")
            .eq("employee_id", employee_id)
            .execute()
        )
        return res.data or []
