from fastapi import APIRouter, HTTPException
import hashlib
import os
import shutil
from db import db
from blockchain import blockchain_engine
from auth import get_current_user
from fastapi import Depends

router = APIRouter(prefix="/api/blockchain", tags=["Blockchain"])


@router.get("/verify/{file_id}")
def verify_file(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        file_rows = db.query("SELECT * FROM uploaded_files WHERE fileId = %s", (file_id,))
        if not file_rows:
            raise HTTPException(status_code=404, detail={"success": False, "message": f"File ID \"{file_id}\" not found in database."})

        file_rec = file_rows[0]
        user_id = current_user["id"]
        case_id = file_rec["caseId"]
        if current_user.get("prefix") == "LW":
            case_rows = db.query("SELECT assignedLawyerId FROM cases WHERE caseId = %s", (case_id,))
            if not case_rows or (case_rows[0].get("assignedLawyerId") and case_rows[0]["assignedLawyerId"] != user_id):
                raise HTTPException(status_code=403, detail="Not assigned to this case.")
        else:
            access = db.query("SELECT * FROM user_cases WHERE userId = %s AND caseId = %s", (user_id, case_id))
            officer = db.query("SELECT * FROM case_officers WHERE caseId = %s AND officerId = %s", (case_id, user_id))
            if not access and not officer:
                raise HTTPException(status_code=403, detail="Not authorized for this case.")
        # Verify the bytes currently stored on disk, not the database's copy of the seal.
        current_hash = file_rec["sha256Hash"]
        storage_path = file_rec.get("storagePath")
        if storage_path:
            uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
            full_path = os.path.abspath(os.path.join(uploads_dir, storage_path))
            if not full_path.startswith(uploads_dir + os.sep) or not os.path.isfile(full_path):
                raise HTTPException(status_code=404, detail={"success": False, "message": "Stored file is missing."})
            with open(full_path, "rb") as stored_file:
                current_hash = hashlib.sha256(stored_file.read()).hexdigest()

        ledger_rows = db.query("SELECT * FROM blockchain_ledger WHERE docId = %s", (file_id,))
        ledger_record = ledger_rows[0] if ledger_rows else None

        verification_result = blockchain_engine.verify_document(file_id, current_hash)

        if ledger_record:
            hashes_match = ledger_record["sha256Hash"].lower() == current_hash.lower()
            return {
                "success": True,
                "verification": {
                    "isValid": hashes_match,
                    "docId": file_id,
                    "caseId": file_rec["caseId"],
                    "fileName": file_rec["fileName"],
                    "currentHash": current_hash,
                    "onChainHash": ledger_record["sha256Hash"],
                    "uploadedBy": ledger_record["uploadedBy"],
                    "timestamp": ledger_record["timestamp"],
                    "txHash": ledger_record["txHash"],
                    "blockNumber": ledger_record["blockNumber"],
                    "blockHash": ledger_record["blockHash"],
                    "signerAddress": ledger_record["signerAddress"],
                    "contractAddress": blockchain_engine.get_contract_address(),
                    "gasUsed": ledger_record["gasUsed"],
                    "verificationMessage": (
                        "CRYPTOGRAPHIC MATCH CONFIRMED: On-chain ledger state matches document SHA-256 fingerprint perfectly."
                        if hashes_match else
                        f"TAMPER WARNING: Current file hash does NOT match the immutable on-chain record anchored in Block #{ledger_record['blockNumber']}!"
                    )
                }
            }

        return {
            "success": True,
            "verification": {
                **verification_result,
                "fileName": file_rec["fileName"],
                "contractAddress": blockchain_engine.get_contract_address()
            }
        }
    except HTTPException:
        raise
    except Exception as err:
        print("[BLOCKCHAIN VERIFY ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.post("/demo-tamper/{file_id}")
def simulate_tamper(file_id: str, current_user: dict = Depends(get_current_user)):
    """Jury demo control: make a reversible-by-reupload change to stored bytes."""
    try:
        rows = db.query("SELECT * FROM uploaded_files WHERE fileId = %s", (file_id,))
        if not rows or not rows[0].get("storagePath"):
            raise HTTPException(status_code=404, detail={"success": False, "message": "A stored upload is required for the tamper demo."})
        rec = rows[0]
        user_id = current_user["id"]
        case_id = rec["caseId"]
        if current_user.get("prefix") == "LW":
            case_rows = db.query("SELECT assignedLawyerId FROM cases WHERE caseId = %s", (case_id,))
            if not case_rows or (case_rows[0].get("assignedLawyerId") and case_rows[0]["assignedLawyerId"] != user_id):
                raise HTTPException(status_code=403, detail="Not assigned to this case.")
        else:
            access = db.query("SELECT * FROM user_cases WHERE userId = %s AND caseId = %s", (user_id, case_id))
            officer = db.query("SELECT * FROM case_officers WHERE caseId = %s AND officerId = %s", (case_id, user_id))
            if not access and not officer:
                raise HTTPException(status_code=403, detail="Not authorized for this case.")
        uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
        full_path = os.path.abspath(os.path.join(uploads_dir, rec["storagePath"]))
        if not full_path.startswith(uploads_dir + os.sep) or not os.path.isfile(full_path):
            raise HTTPException(status_code=404, detail="Stored file is missing.")
        backup_path = full_path + ".demo-original"
        if os.path.exists(backup_path):
            raise HTTPException(status_code=409, detail={"success": False, "message": "Demo tampering is already active. Restore the original file before simulating it again."})
        shutil.copy2(full_path, backup_path)
        with open(full_path, "ab") as stored_file:
            stored_file.write(b"\n[DEMO TAMPER: unauthorized edit]\n")
        from db import add_security_log
        add_security_log(user_id, case_id, "TAMPER_SIMULATED", "WARNING", f"Jury demo changed stored bytes of {rec['fileName']} ({file_id})")
        return {"success": True, "message": "Demo alteration applied. Run verification to detect the changed file."}
    except HTTPException:
        raise
    except Exception as err:
        print("[DEMO TAMPER ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.post("/demo-restore/{file_id}")
def restore_demo_file(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        rows = db.query("SELECT * FROM uploaded_files WHERE fileId = %s", (file_id,))
        if not rows or not rows[0].get("storagePath"):
            raise HTTPException(status_code=404, detail={"success": False, "message": "Stored upload not found."})
        rec = rows[0]
        user_id = current_user["id"]
        case_id = rec["caseId"]
        if current_user.get("prefix") == "LW":
            case_rows = db.query("SELECT assignedLawyerId FROM cases WHERE caseId = %s", (case_id,))
            if not case_rows or (case_rows[0].get("assignedLawyerId") and case_rows[0]["assignedLawyerId"] != user_id):
                raise HTTPException(status_code=403, detail="Not assigned to this case.")
        else:
            access = db.query("SELECT * FROM user_cases WHERE userId = %s AND caseId = %s", (user_id, case_id))
            officer = db.query("SELECT * FROM case_officers WHERE caseId = %s AND officerId = %s", (case_id, user_id))
            if not access and not officer:
                raise HTTPException(status_code=403, detail="Not authorized for this case.")
        uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
        full_path = os.path.abspath(os.path.join(uploads_dir, rec["storagePath"]))
        backup_path = full_path + ".demo-original"
        if not full_path.startswith(uploads_dir + os.sep) or not os.path.isfile(backup_path):
            raise HTTPException(status_code=404, detail="No demo alteration is waiting to be restored.")
        shutil.move(backup_path, full_path)
        from db import add_security_log
        add_security_log(user_id, case_id, "TAMPER_DEMO_RESTORED", "SUCCESS", f"Restored original demo bytes for {rec['fileName']} ({file_id})")
        return {"success": True, "message": "Original demo file restored. Verify again to confirm the seal matches."}
    except HTTPException:
        raise
    except Exception as err:
        print("[DEMO RESTORE ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.get("/ledger")
def get_ledger():
    try:
        rows = db.query("SELECT * FROM blockchain_ledger ORDER BY blockNumber DESC LIMIT 50")
        records = rows if rows else blockchain_engine.get_all_records()
        return {
            "success": True,
            "blockHeight": blockchain_engine.get_block_height(),
            "contractAddress": blockchain_engine.get_contract_address(),
            "signerAddress": blockchain_engine.get_signer_address(),
            "totalRecords": len(records),
            "ledger": records
        }
    except Exception:
        all_records = blockchain_engine.get_all_records()
        return {
            "success": True,
            "blockHeight": blockchain_engine.get_block_height(),
            "contractAddress": blockchain_engine.get_contract_address(),
            "signerAddress": blockchain_engine.get_signer_address(),
            "totalRecords": len(all_records),
            "ledger": all_records
        }


@router.get("/stats")
def get_stats():
    try:
        count_rows = db.query("SELECT COUNT(*) as count FROM blockchain_ledger")
        total_anchored = count_rows[0]["count"] if count_rows and count_rows[0].get("count") else len(blockchain_engine.get_all_records())
        return {
            "success": True,
            "stats": {
                "network": "Ethereum Private Layer-2 Proof-of-Authority (PoA)",
                "chainId": 1337,
                "contractAddress": blockchain_engine.get_contract_address(),
                "signerAddress": blockchain_engine.get_signer_address(),
                "blockHeight": blockchain_engine.get_block_height(),
                "totalAnchoredDocuments": total_anchored,
                "consensusProtocol": "Cryptographic SHA-256 Proof-of-Authority",
                "status": "OPERATIONAL"
            }
        }
    except Exception:
        return {
            "success": True,
            "stats": {
                "network": "Ethereum Private Layer-2 Proof-of-Authority (PoA)",
                "chainId": 1337,
                "contractAddress": blockchain_engine.get_contract_address(),
                "signerAddress": blockchain_engine.get_signer_address(),
                "blockHeight": blockchain_engine.get_block_height(),
                "totalAnchoredDocuments": len(blockchain_engine.get_all_records()),
                "consensusProtocol": "Cryptographic SHA-256 Proof-of-Authority",
                "status": "OPERATIONAL"
            }
        }
