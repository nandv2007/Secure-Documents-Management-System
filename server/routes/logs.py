from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import db, log_audit_event
from auth import get_current_user

router = APIRouter(prefix="/api/logs", tags=["Logs"])


class AuditLogRequest(BaseModel):
    action: str
    document_id: Optional[str] = None
    case_id: Optional[str] = None


@router.get("")
def get_security_logs(current_user: dict = Depends(get_current_user)):
    try:
        logs = db.query("SELECT * FROM security_logs ORDER BY id DESC LIMIT 100")
        return logs
    except Exception as err:
        print("[LOGS GET ERROR]", err)
        raise HTTPException(status_code=500, detail={"message": str(err)})


@router.get("/audit-logs")
def get_audit_logs(current_user: dict = Depends(get_current_user)):
    try:
        logs = db.query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200")
        return logs
    except Exception as err:
        print("[AUDIT LOGS GET ERROR]", err)
        raise HTTPException(status_code=500, detail={"message": str(err)})


@router.post("/audit-logs")
def create_audit_log(data: AuditLogRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get("id", "UNKNOWN")
        name = current_user.get("name", "Officer")
        prefix = current_user.get("prefix", "PO")

        if not data.action:
            raise HTTPException(status_code=400, detail={"message": "Action is required."})

        formatted_user_id = f"{user_id} - {name} ({prefix})"
        log_audit_event(
            user_id=formatted_user_id,
            action=data.action,
            document_id=data.document_id,
            case_id=data.case_id
        )

        return {"success": True}
    except HTTPException:
        raise
    except Exception as err:
        print("[POST AUDIT LOG ERROR]", err)
        raise HTTPException(status_code=500, detail={"message": str(err)})
