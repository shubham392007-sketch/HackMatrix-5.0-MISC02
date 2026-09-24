"""Employee Management API Endpoints for testing and workbench."""
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.db.client import get_supabase_client

router = APIRouter(prefix="/employees", tags=["Employees"])


class EmployeeCreateRequest(BaseModel):
    name: str = Field(..., description="Full Name")
    email: str = Field(..., description="Unique Work Email")
    role: Optional[str] = Field(default="Software Engineer")
    department: Optional[str] = Field(default="Engineering")


@router.get("")
async def list_employees(limit: int = 50):
    """Retrieve all employees in the system."""
    client = get_supabase_client()
    res = client.table("employees").select("*").order("name").limit(limit).execute()
    return {
        "count": len(res.data or []),
        "employees": res.data or []
    }


@router.post("")
async def create_employee(req: EmployeeCreateRequest):
    """Create a new employee in Supabase."""
    client = get_supabase_client()
    new_id = str(uuid4())
    payload = {
        "id": new_id,
        "name": req.name,
        "email": req.email,
        "role": req.role,
        "department": req.department,
    }
    try:
        res = client.table("employees").insert(payload).execute()
        return res.data[0] if res.data else payload
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{employee_id}")
async def get_employee(employee_id: str):
    """Retrieve a single employee by UUID."""
    client = get_supabase_client()
    res = client.table("employees").select("*").eq("id", employee_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return res.data[0]
