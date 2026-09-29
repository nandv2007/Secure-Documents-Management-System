import random
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from db import db, add_security_log
from auth import generate_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    officerId: Optional[str] = None
    password: Optional[str] = None


class RegisterRequest(BaseModel):
    id: str
    password: str
    name: str
    rankTitle: Optional[str] = None
    role: str
    department: Optional[str] = None
    station: Optional[str] = None


@router.post("/login")
def login(data: LoginRequest):
    try:
        officer_id = data.officerId
        password = data.password

        if not officer_id:
            return HTTPException(
                status_code=400,
                detail={"status": "INVALID_INPUT", "message": "Officer ID is required."}
            )

        clean_id = str(officer_id).strip().upper()
        clean_pass = str(password or "").strip()

        rows = db.query("SELECT * FROM users WHERE id = %s", (clean_id,))
        if not rows:
            return {
                "status": "NEW_OFFICER_REGISTRATION_REQUIRED",
                "message": f"Officer ID \"{clean_id}\" is not registered in SI-PALMS. Please create an officer account below."
            }

        user = rows[0]

        if user["password"] != clean_pass:
            add_security_log(clean_id, "SYSTEM", "LOGIN_ATTEMPT", "WARNING", "Failed login attempt - Incorrect password")
            return {
                "status": "INVALID_PASSWORD",
                "message": f"Incorrect password for Officer ID \"{clean_id}\"."
            }

        # Fetch assigned case IDs
        case_rows = db.query("SELECT caseId FROM user_cases WHERE userId = %s", (clean_id,))
        assigned_case_ids = [r["caseId"] for r in case_rows]

        token = generate_token({
            "id": user["id"],
            "role": user["role"],
            "prefix": user["prefix"],
            "name": user["name"]
        })

        add_security_log(clean_id, "SYSTEM", "LOGIN_SUCCESS", "SUCCESS", f"Officer {user['name']} signed into workstation")

        user_without_pass = {k: v for k, v in user.items() if k != "password"}
        user_without_pass["assignedCaseIds"] = assigned_case_ids

        return {
            "status": "SUCCESS",
            "token": token,
            "user": user_without_pass
        }
    except Exception as err:
        print("[AUTH LOGIN ERROR]", err)
        raise HTTPException(status_code=500, detail={"status": "ERROR", "message": str(err)})


@router.post("/register")
def register(data: RegisterRequest):
    try:
        if not data.id or not data.password or not data.name or not data.role:
            raise HTTPException(status_code=400, detail={"message": "Missing required fields for officer registration."})

        clean_id = str(data.id).strip().upper()

        role_prefix_map = {
            "POLICE_OFFICER": "PO",
            "INVESTIGATOR": "IN",
            "FORENSIC_OFFICER": "FO",
            "LAWYER": "LW"
        }
        prefix = role_prefix_map.get(data.role, "PO")

        role_clearance_map = {
            "PO": "Level 1 - Case Details & Evidence Upload Access",
            "IN": "Level 2 - Case Evidence & Relational Intelligence",
            "FO": "Level 3 - Forensic Lab Report Upload",
            "LW": "Level 4 - Read-Only Court Evidence Disclosure Vault"
        }
        clearance = role_clearance_map.get(prefix, "Level 1")
        badge_number = f"{prefix}-REG-{random.randint(1000, 9999)}"

        existing = db.query("SELECT * FROM users WHERE id = %s", (clean_id,))
        if existing:
            raise HTTPException(status_code=400, detail={"message": f"Officer ID \"{clean_id}\" is already registered."})

        rank_title = data.rankTitle or "Officer"
        department = data.department or "Precinct"
        station = data.station or "Station Headquarters"

        db.execute(
            """INSERT INTO users (id, password, name, rankTitle, role, prefix, department, station, badgeNumber, clearance)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (clean_id, data.password, data.name, rank_title, data.role, prefix, department, station, badge_number, clearance)
        )

        add_security_log(clean_id, "SYSTEM", "OFFICER_REGISTRATION", "SUCCESS", f"New officer account created for {data.name} ({data.role})")

        token = generate_token({"id": clean_id, "role": data.role, "prefix": prefix, "name": data.name})

        return {
            "status": "SUCCESS",
            "token": token,
            "user": {
                "id": clean_id,
                "password": data.password,
                "name": data.name,
                "rankTitle": rank_title,
                "role": data.role,
                "prefix": prefix,
                "department": department,
                "station": station,
                "badgeNumber": badge_number,
                "clearance": clearance,
                "assignedCaseIds": []
            }
        }
    except HTTPException:
        raise
    except Exception as err:
        print("[AUTH REGISTER ERROR]", err)
        raise HTTPException(status_code=500, detail={"message": str(err)})


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        rows = db.query("SELECT * FROM users WHERE id = %s", (user_id,))
        if not rows:
            raise HTTPException(status_code=404, detail={"message": "User profile not found."})

        user = rows[0]
        case_rows = db.query("SELECT caseId FROM user_cases WHERE userId = %s", (user_id,))
        assigned_case_ids = [r["caseId"] for r in case_rows]

        user_without_pass = {k: v for k, v in user.items() if k != "password"}
        user_without_pass["assignedCaseIds"] = assigned_case_ids

        return {"user": user_without_pass}
    except HTTPException:
        raise
    except Exception as err:
        print("[AUTH ME ERROR]", err)
        raise HTTPException(status_code=500, detail={"message": str(err)})
