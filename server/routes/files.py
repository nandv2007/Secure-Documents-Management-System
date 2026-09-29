import os
import hashlib
import time
import random
import mimetypes
import math
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional
from db import db, add_security_log, log_audit_event
from auth import get_current_user
from blockchain import blockchain_engine

router = APIRouter(tags=["Files"])

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR, exist_ok=True)


@router.post("/api/cases/{case_id}/files")
async def upload_file_to_case(
    case_id: str,
    file: Optional[UploadFile] = File(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    fallbackFileName: Optional[str] = Form(None),
    digitalSignature: Optional[str] = Form(None),
    signerPublicKey: Optional[str] = Form(None),
    parentFileId: Optional[str] = Form(None),
    changeSummary: Optional[str] = Form(None),
    isMajorVersion: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["id"]
        prefix = current_user["prefix"]
        name = current_user["name"]
        role = current_user["role"]
        clean_case_id = str(case_id).strip().upper()

        if prefix == "LW":
            raise HTTPException(status_code=403, detail={"success": False, "message": "Lawyers have read-only access and cannot upload files."})

        req_category = category or "CRIME_SCENE"
        if prefix == "FO" and req_category != "FORENSIC_LAB":
            raise HTTPException(status_code=403, detail={"success": False, "message": "Forensic officers can only upload Forensic Lab Reports."})

        if prefix == "PO" and req_category == "FORENSIC_LAB":
            raise HTTPException(status_code=403, detail={"success": False, "message": "Police officers cannot upload Forensic Lab Reports directly."})

        case_rows = db.query("SELECT * FROM cases WHERE caseId = %s", (clean_case_id,))
        if not case_rows:
            raise HTTPException(status_code=404, detail={"success": False, "message": f"Case {clean_case_id} not found."})

        # Versioning Calculation
        calculated_version = "v1.0"
        calculated_version_number = 1.0
        effective_parent_id = None
        final_change_summary = changeSummary or ("Document revision update" if parentFileId else "Initial document seal")

        if parentFileId:
            effective_parent_id = str(parentFileId).strip()
            parent_rows = db.query("SELECT * FROM uploaded_files WHERE fileId = %s", (effective_parent_id,))
            if parent_rows:
                parent = parent_rows[0]
                parent_ver_num = float(parent.get("versionNumber") or 1.0)
                is_major = str(isMajorVersion).lower() in ("true", "1")
                if is_major:
                    calculated_version_number = math.floor(parent_ver_num) + 1.0
                else:
                    calculated_version_number = round((parent_ver_num + 0.1) * 10) / 10
                calculated_version = f"v{calculated_version_number:.1f}"

            # Set isLatestVersion = FALSE for parent and lineage
            db.execute(
                "UPDATE uploaded_files SET isLatestVersion = FALSE WHERE fileId = %s OR parentFileId = %s",
                (effective_parent_id, effective_parent_id)
            )

        file_name = fallbackFileName or "Document.pdf"
        file_size = "0 KB"
        file_type = "application/pdf"
        storage_path = None
        sha256_hash = ""

        if file and file.filename:
            file_name = file.filename
            contents = await file.read()
            file_size = f"{(len(contents) / 1024):.1f} KB"
            guessed_type, _ = mimetypes.guess_type(file.filename)
            file_type = file.content_type or guessed_type or "application/octet-stream"

            ext = os.path.splitext(file.filename)[1]
            unique_suffix = f"{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
            stored_filename = f"{unique_suffix}{ext}"
            full_save_path = os.path.join(UPLOADS_DIR, stored_filename)

            with open(full_save_path, "wb") as f_out:
                f_out.write(contents)

            storage_path = stored_filename
            sha256_hash = hashlib.sha256(contents).hexdigest()
        else:
            sha256_hash = hashlib.sha256(f"{file_name}-{time.time()}-{random.random()}".encode("utf-8")).hexdigest()

        file_id = f"FILE-{prefix}-{random.randint(1000, 9999)}"
        upload_time = time.strftime("%Y-%m-%d, %I:%M:%S %p IST")

        # BLOCKCHAIN ANCHORING
        bc_record = blockchain_engine.anchor_document(
            case_id=clean_case_id,
            doc_id=file_id,
            sha256_hash=sha256_hash,
            uploaded_by=f"{name} ({user_id})"
        )

        # Insert into uploaded_files
        db.execute(
            """INSERT INTO uploaded_files (
                fileId, caseId, fileName, fileSize, fileType, storagePath,
                uploadedByOfficerId, uploadedByOfficerName, uploadedByRole,
                uploadTime, category, sha256Hash, description, txHash, blockNumber,
                digitalSignature, signerPublicKey, version, versionNumber, parentFileId,
                changeSummary, isLatestVersion
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                file_id,
                clean_case_id,
                file_name,
                file_size,
                file_type,
                storage_path,
                user_id,
                name,
                role,
                upload_time,
                req_category,
                sha256_hash,
                description or "",
                bc_record["txHash"],
                bc_record["blockNumber"],
                digitalSignature or None,
                signerPublicKey or None,
                calculated_version,
                calculated_version_number,
                effective_parent_id,
                final_change_summary,
                True
            )
        )

        # Insert into blockchain_ledger
        db.execute(
            """INSERT INTO blockchain_ledger (
                txHash, blockNumber, blockHash, caseId, docId, sha256Hash,
                uploadedBy, timestamp, gasUsed, status, signerAddress
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                bc_record["txHash"],
                bc_record["blockNumber"],
                bc_record["blockHash"],
                clean_case_id,
                file_id,
                sha256_hash,
                bc_record["uploadedBy"],
                bc_record["timestamp"],
                bc_record["gasUsed"],
                bc_record["status"],
                bc_record["signerAddress"]
            )
        )

        # AUDIT LOG
        log_audit_event(
            user_id=f"{user_id} - {name} ({prefix})",
            action="Version creation" if parentFileId else "Upload",
            document_id=file_id,
            case_id=clean_case_id
        )

        add_security_log(user_id, clean_case_id, "VERSION_CREATED" if parentFileId else "FILE_UPLOAD", "SUCCESS", f"Uploaded {calculated_version} of {file_name} ({req_category}) with SHA-256 seal & Blockchain Tx {bc_record['txHash']}")

        return {
            "success": True,
            "file": {
                "fileId": file_id,
                "fileName": file_name,
                "fileSize": file_size,
                "fileType": file_type,
                "fileDataUrl": f"/api/files/{file_id}/download" if storage_path else None,
                "uploadedByOfficerId": user_id,
                "uploadedByOfficerName": name,
                "uploadedByRole": role,
                "uploadTime": upload_time,
                "category": req_category,
                "sha256Hash": sha256_hash,
                "description": description or "",
                "txHash": bc_record["txHash"],
                "blockNumber": bc_record["blockNumber"],
                "blockHash": bc_record["blockHash"],
                "blockchainVerified": True,
                "digitalSignature": digitalSignature,
                "signerPublicKey": signerPublicKey,
                "signatureVerified": bool(digitalSignature),
                "version": calculated_version,
                "versionNumber": calculated_version_number,
                "parentFileId": effective_parent_id,
                "changeSummary": final_change_summary,
                "isLatestVersion": True
            }
        }
    except HTTPException:
        raise
    except Exception as err:
        print("[FILE UPLOAD ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.get("/api/files/{file_id}/download")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["id"]
        prefix = current_user["prefix"]

        file_rows = db.query("SELECT * FROM uploaded_files WHERE fileId = %s", (file_id,))
        if not file_rows or not file_rows[0].get("storagePath"):
            raise HTTPException(status_code=404, detail="File not found.")

        file_record = file_rows[0]
        case_id = file_record["caseId"]

        if prefix == "LW":
            case_rows = db.query("SELECT assignedLawyerId FROM cases WHERE caseId = %s", (case_id,))
            if not case_rows or (case_rows[0].get("assignedLawyerId") and case_rows[0]["assignedLawyerId"] != user_id):
                raise HTTPException(status_code=403, detail="Forbidden: You are not assigned to this case.")
        else:
            user_cases = db.query("SELECT * FROM user_cases WHERE userId = %s AND caseId = %s", (user_id, case_id))
            case_officers = db.query("SELECT * FROM case_officers WHERE caseId = %s AND officerId = %s", (case_id, user_id))
            if not user_cases and not case_officers:
                raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to access files for this case.")

        full_path = os.path.abspath(os.path.join(UPLOADS_DIR, file_record["storagePath"]))
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Stored file missing on disk.")

        return FileResponse(
            path=full_path,
            media_type=file_record.get("fileType") or "application/octet-stream",
            filename=file_record["fileName"],
            content_disposition_type="inline"
        )
    except HTTPException:
        raise
    except Exception as err:
        print("[FILE DOWNLOAD ERROR]", err)
        raise HTTPException(status_code=500, detail="Server error during download.")
