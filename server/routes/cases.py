from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from db import db, add_security_log, log_audit_event
from auth import get_current_user

router = APIRouter(prefix="/api/cases", tags=["Cases"])


def get_case_record(case_id: str) -> Optional[dict]:
    case_rows = db.query("SELECT * FROM cases WHERE caseId = %s", (case_id,))
    if not case_rows:
        return None

    case_data = case_rows[0]
    officer_rows = db.query("SELECT officerId FROM case_officers WHERE caseId = %s", (case_id,))
    file_rows = db.query("SELECT * FROM uploaded_files WHERE caseId = %s ORDER BY fileId DESC", (case_id,))

    uploaded_files = []
    for f in file_rows:
        version_num = float(f["versionNumber"]) if f.get("versionNumber") is not None else 1.0
        is_latest = bool(f["isLatestVersion"]) if f.get("isLatestVersion") is not None else True
        uploaded_files.append({
            "fileId": f["fileId"],
            "fileName": f["fileName"],
            "fileSize": f["fileSize"],
            "fileType": f["fileType"],
            "fileDataUrl": f"/api/files/{f['fileId']}/download" if f.get("storagePath") else None,
            "uploadedByOfficerId": f["uploadedByOfficerId"],
            "uploadedByOfficerName": f["uploadedByOfficerName"],
            "uploadedByRole": f["uploadedByRole"],
            "uploadTime": f["uploadTime"],
            "category": f["category"],
            "sha256Hash": f["sha256Hash"],
            "description": f["description"],
            "txHash": f.get("txHash"),
            "blockNumber": f.get("blockNumber"),
            "digitalSignature": f.get("digitalSignature"),
            "signerPublicKey": f.get("signerPublicKey"),
            "version": f.get("version") or "v1.0",
            "versionNumber": version_num,
            "parentFileId": f.get("parentFileId"),
            "changeSummary": f.get("changeSummary"),
            "isLatestVersion": is_latest
        })

    return {
        "caseId": case_data["caseId"],
        "title": case_data["title"],
        "incidentLocation": case_data["incidentLocation"],
        "status": case_data["status"],
        "assignedLawyerId": case_data.get("assignedLawyerId"),
        "assignedLawyerName": case_data.get("assignedLawyerName"),
        "assignedOfficerIds": [o["officerId"] for o in officer_rows],
        "uploadedFiles": uploaded_files
    }


class AddCaseRequest(BaseModel):
    caseNumber: str


@router.get("")
def get_all_cases(current_user: dict = Depends(get_current_user)):
    try:
        case_rows = db.query("SELECT caseId FROM cases")
        result: Dict[str, Any] = {}
        for c in case_rows:
            record = get_case_record(c["caseId"])
            if record:
                result[c["caseId"]] = record
        return result
    except Exception as err:
        print("[CASES GET ALL ERROR]", err)
        raise HTTPException(status_code=500, detail={"message": str(err)})


@router.post("/{case_id}/open")
def open_case(case_id: str, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        prefix = current_user["prefix"]
        name = current_user["name"]
        clean_case_id = str(case_id).strip().upper()

        case_data = get_case_record(clean_case_id)
        if not case_data:
            return {"success": False, "message": f"Case Number \"{clean_case_id}\" was not found."}

        # Forensic Officer restriction
        if prefix == "FO" and case_data["status"] != "FORENSIC_REVIEW":
            add_security_log(user_id, clean_case_id, "FORENSIC_ACCESS_BLOCKED", "RESTRICTED", f"Forensic Officer {user_id} attempted to access case {clean_case_id} before police dispatch")
            return {
                "success": False,
                "message": f"Case {clean_case_id} has not been sent to the Forensic Lab by a Police Officer yet."
            }

        if prefix == "LW":
            assigned_lawyer_id = case_data.get("assignedLawyerId")
            assigned_lawyer_name = case_data.get("assignedLawyerName")

            if assigned_lawyer_id and assigned_lawyer_id != user_id:
                lawyer_display = f"{assigned_lawyer_name} ({assigned_lawyer_id})" if assigned_lawyer_name else assigned_lawyer_id
                add_security_log(user_id, clean_case_id, "LAWYER_ACCESS_BLOCKED", "RESTRICTED", f"Lawyer {user_id} attempted to access case locked by {lawyer_display}")
                return {
                    "success": False,
                    "message": f"Case {clean_case_id} is currently being handled by Lawyer {lawyer_display}. You cannot view or access this case file."
                }

            if not assigned_lawyer_id:
                db.execute(
                    "UPDATE cases SET assignedLawyerId = %s, assignedLawyerName = %s WHERE caseId = %s",
                    (user_id, name, clean_case_id)
                )
                db.execute("INSERT IGNORE INTO case_officers (caseId, officerId) VALUES (%s, %s)", (clean_case_id, user_id))
                db.execute("INSERT IGNORE INTO user_cases (userId, caseId) VALUES (%s, %s)", (user_id, clean_case_id))
                add_security_log(user_id, clean_case_id, "LAWYER_CASE_CLAIMED", "SUCCESS", f"Lawyer {name} ({user_id}) claimed Case {clean_case_id}")
        else:
            user_cases = db.query("SELECT * FROM user_cases WHERE userId = %s AND caseId = %s", (user_id, clean_case_id))
            case_officers = db.query("SELECT * FROM case_officers WHERE caseId = %s AND officerId = %s", (clean_case_id, user_id))

            if not user_cases and not case_officers:
                add_security_log(user_id, clean_case_id, "UNAUTHORIZED_ACCESS", "RESTRICTED", f"Officer {user_id} attempted unauthorized access to Case {clean_case_id}")
                return {
                    "success": False,
                    "message": f"You are not authorized to access Case {clean_case_id}."
                }

        # AUDIT LOG (Event Type 2: View)
        log_audit_event(
            user_id=f"{user_id} - {name} ({prefix})",
            action="View",
            document_id=clean_case_id
        )

        add_security_log(user_id, clean_case_id, "CASE_OPENED", "SUCCESS", f"Opened Case {clean_case_id}")
        return {"success": True, "case": get_case_record(clean_case_id)}
    except Exception as err:
        print("[CASES OPEN ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.post("/add")
def add_case(data: AddCaseRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        prefix = current_user["prefix"]
        name = current_user["name"]

        if not data.caseNumber:
            return {"success": False, "message": "Enter a case number."}

        clean_case_id = str(data.caseNumber).strip().upper()
        target_case = get_case_record(clean_case_id)

        if not target_case and prefix != "PO":
            return {
                "success": False,
                "message": f"Case {clean_case_id} has not been created by a Police Officer yet."
            }

        if prefix == "FO" and target_case and target_case["status"] != "FORENSIC_REVIEW":
            return {
                "success": False,
                "message": f"Case {clean_case_id} has not been sent to the Forensic Lab by a Police Officer yet."
            }

        if prefix == "LW" and target_case:
            assigned_lawyer_id = target_case.get("assignedLawyerId")
            assigned_lawyer_name = target_case.get("assignedLawyerName")
            if assigned_lawyer_id and assigned_lawyer_id != user_id:
                lawyer_display = f"{assigned_lawyer_name} ({assigned_lawyer_id})" if assigned_lawyer_name else assigned_lawyer_id
                return {
                    "success": False,
                    "message": f"Case {clean_case_id} is currently being handled by Lawyer {lawyer_display}. You cannot view or access this case file."
                }

        # Create new case if missing (for PO)
        if not target_case:
            db.execute(
                """INSERT INTO cases (caseId, title, incidentLocation, status, assignedLawyerId, assignedLawyerName)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (clean_case_id, f"Case Investigation File {clean_case_id}", "Metro Division Precinct", "OPEN_INVESTIGATION", None, None)
            )

            # AUDIT LOG (Event Type 5: Version creation)
            log_audit_event(
                user_id=f"{user_id} - {name} ({prefix})",
                action="Version creation",
                document_id=clean_case_id
            )

            add_security_log(user_id, clean_case_id, "CASE_CREATED", "SUCCESS", f"Police officer created new Case {clean_case_id}")

        if prefix == "LW":
            db.execute(
                "UPDATE cases SET assignedLawyerId = %s, assignedLawyerName = %s WHERE caseId = %s",
                (user_id, name, clean_case_id)
            )

        db.execute("INSERT IGNORE INTO case_officers (caseId, officerId) VALUES (%s, %s)", (clean_case_id, user_id))
        db.execute("INSERT IGNORE INTO user_cases (userId, caseId) VALUES (%s, %s)", (user_id, clean_case_id))

        add_security_log(user_id, clean_case_id, "CASE_ADDED_TO_PORTAL", "SUCCESS", f"Officer {user_id} registered Case {clean_case_id} in portal")

        return {
            "success": True,
            "case": get_case_record(clean_case_id)
        }
    except Exception as err:
        print("[CASES ADD ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.post("/{case_id}/send-to-forensic")
def send_to_forensic(case_id: str, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        prefix = current_user["prefix"]
        clean_case_id = str(case_id).strip().upper()

        if prefix != "PO":
            raise HTTPException(status_code=403, detail={"success": False, "message": "Only Police Officers can dispatch cases to the Forensic Lab."})

        case_data = get_case_record(clean_case_id)
        if not case_data:
            raise HTTPException(status_code=404, detail={"success": False, "message": f"Case {clean_case_id} not found."})

        db.execute("UPDATE cases SET status = %s WHERE caseId = %s", ("FORENSIC_REVIEW", clean_case_id))
        add_security_log(user_id, clean_case_id, "SENT_TO_FORENSIC", "SUCCESS", f"Police Officer {user_id} sent Case {clean_case_id} to Forensic Lab for lab report upload")

        return {
            "success": True,
            "message": f"Case {clean_case_id} has been successfully sent to the Forensic Lab!",
            "case": get_case_record(clean_case_id)
        }
    except HTTPException:
        raise
    except Exception as err:
        print("[SEND TO FORENSIC ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.post("/{case_id}/relinquish")
def relinquish_case(case_id: str, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        prefix = current_user["prefix"]
        clean_case_id = str(case_id).strip().upper()

        if prefix != "LW":
            return {"success": False, "message": "Only lawyers can give up a case assignment."}

        target_case = get_case_record(clean_case_id)
        if not target_case:
            raise HTTPException(status_code=404, detail={"success": False, "message": f"Case {clean_case_id} was not found."})

        if target_case.get("assignedLawyerId") != user_id:
            return {"success": False, "message": f"You are not the assigned lawyer for Case {clean_case_id}."}

        db.execute("UPDATE cases SET assignedLawyerId = NULL, assignedLawyerName = NULL WHERE caseId = %s", (clean_case_id,))
        db.execute("DELETE FROM case_officers WHERE caseId = %s AND officerId = %s", (clean_case_id, user_id))
        db.execute("DELETE FROM user_cases WHERE userId = %s AND caseId = %s", (user_id, clean_case_id))

        add_security_log(user_id, clean_case_id, "CASE_RELINQUISHED", "SUCCESS", f"Lawyer {user_id} gave up assignment for Case {clean_case_id}")

        return {
            "success": True,
            "message": f"You have given up Case {clean_case_id}. It is now available for other lawyers."
        }
    except HTTPException:
        raise
    except Exception as err:
        print("[CASES RELINQUISH ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})
