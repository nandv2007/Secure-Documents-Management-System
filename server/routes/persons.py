from fastapi import APIRouter, Depends, Query, HTTPException
from db import db
from auth import get_current_user
import hashlib

router = APIRouter(prefix="/api/persons", tags=["Persons & Case Search"])


def _authorized_case_ids(user: dict) -> set[str]:
    user_id = user["id"]
    prefix = user.get("prefix")
    if prefix == "LW":
        rows = db.query("SELECT caseId FROM cases WHERE assignedLawyerId = %s", (user_id,))
    else:
        rows = db.query(
            "SELECT caseId FROM user_cases WHERE userId = %s UNION "
            "SELECT caseId FROM case_officers WHERE officerId = %s",
            (user_id, user_id),
        )
    case_ids = {row["caseId"] for row in rows}
    if prefix == "FO":
        dispatched = db.query("SELECT caseId FROM cases WHERE status = 'FORENSIC_REVIEW'")
        dispatched_ids = {row["caseId"] for row in dispatched}
        case_ids &= dispatched_ids
    return case_ids


def _case_summary(case: dict, officers: list[dict], files: list[dict]) -> dict:
    return {
        "caseId": case["caseId"],
        "title": case.get("title") or case["caseId"],
        "incidentLocation": case.get("incidentLocation") or "",
        "status": case.get("status") or "",
        "assignedLawyerId": case.get("assignedLawyerId"),
        "assignedLawyerName": case.get("assignedLawyerName"),
        "assignedOfficerIds": [row["officerId"] for row in officers],
        "fileCount": len(files),
    }


def _indexed_results(user: dict, query: str = "") -> list[dict]:
    case_ids = _authorized_case_ids(user)
    if not case_ids:
        return []

    cases = db.query("SELECT * FROM cases")
    cases = [case for case in cases if case["caseId"] in case_ids]
    case_map = {case["caseId"]: case for case in cases}
    files = db.query("SELECT * FROM uploaded_files")
    files = [file for file in files if file["caseId"] in case_ids]

    users = db.query(
        "SELECT id, name, rankTitle, role, prefix, department, station, badgeNumber, clearance FROM users"
    )
    results = []
    query_lower = query.casefold().strip()

    for person in users:
        person_id = person["id"]
        assigned_rows = db.query(
            "SELECT caseId FROM user_cases WHERE userId = %s UNION "
            "SELECT caseId FROM case_officers WHERE officerId = %s UNION "
            "SELECT caseId FROM cases WHERE assignedLawyerId = %s",
            (person_id, person_id, person_id),
        )
        involved_case_ids = {row["caseId"] for row in assigned_rows} & case_ids
        if not involved_case_ids and person_id != user["id"]:
            continue

        name = person.get("name") or person_id
        searchable = " ".join((
            name, person_id, person.get("rankTitle") or "", person.get("role") or "",
            person.get("badgeNumber") or "", person.get("department") or "", person.get("station") or "",
        )).casefold()
        matching_case_ids = {
            case_id for case_id in involved_case_ids
            if query_lower and query_lower in " ".join((
                case_map[case_id].get("caseId") or "", case_map[case_id].get("title") or "",
                case_map[case_id].get("incidentLocation") or "",
            )).casefold()
        }
        if query_lower and query_lower not in searchable and not matching_case_ids:
            continue

        person_cases = []
        for case_id in sorted(involved_case_ids):
            case = case_map[case_id]
            case_files = [file for file in files if file["caseId"] == case_id]
            officers = db.query("SELECT officerId FROM case_officers WHERE caseId = %s", (case_id,))
            case_info = _case_summary(case, officers, case_files)
            case_info["roleInCase"] = "Assigned case personnel"
            case_info["matchReason"] = "Officer profile is linked to this case."
            case_info["matchingFiles"] = [
                {key: file.get(key) for key in ("fileId", "fileName", "category", "uploadTime", "description")}
                for file in case_files
                if file.get("uploadedByOfficerId") == person_id
            ]
            person_cases.append(case_info)

        results.append({
            "id": person_id,
            "name": name,
            "rankTitle": person.get("rankTitle") or person.get("role") or "Personnel",
            "role": person.get("role") or "",
            "prefix": person.get("prefix") or "",
            "category": "Official Personnel",
            "department": person.get("department") or "",
            "station": person.get("station") or "",
            "badgeNumber": person.get("badgeNumber") or "",
            "clearance": person.get("clearance") or "",
            "totalCasesInvolved": len(person_cases),
            "cases": person_cases,
        })

    if query_lower:
        matching_files = [file for file in files if query_lower in " ".join((
            file.get("fileName") or "", file.get("description") or "", file.get("category") or "",
        )).casefold()]
        by_case = {}
        for file in matching_files:
            case = case_map.get(file["caseId"])
            if not case:
                continue
            case_id = case["caseId"]
            if case_id not in by_case:
                officers = db.query("SELECT officerId FROM case_officers WHERE caseId = %s", (case_id,))
                by_case[case_id] = _case_summary(case, officers, [f for f in files if f["caseId"] == case_id])
                by_case[case_id].update({
                    "roleInCase": "Matching evidence record",
                    "matchReason": "Search text appears in the file name, category, or description.",
                    "matchingFiles": [],
                })
            by_case[case_id]["matchingFiles"].append({
                key: file.get(key) for key in ("fileId", "fileName", "category", "uploadTime", "description")
            })

        if by_case:
            reference_id = "MATCH-" + hashlib.sha256(query_lower.encode("utf-8")).hexdigest()[:12]
            results.append({
                "id": reference_id,
                "name": f'Files matching “{query.strip()}”',
                "rankTitle": "Case evidence search result",
                "role": "DOCUMENT_MATCH",
                "prefix": "DOC",
                "category": "Document references",
                "department": "Authorized case records",
                "station": "",
                "badgeNumber": "",
                "clearance": "",
                "totalCasesInvolved": len(by_case),
                "cases": list(by_case.values()),
            })

    return results


@router.get("/all")
def get_all_indexed_persons(current_user: dict = Depends(get_current_user)):
    try:
        people = _indexed_results(current_user)
        return {"success": True, "count": len(people), "persons": people}
    except Exception as err:
        print("[PERSONS ALL ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})


@router.get("/search")
def search_person_cases(q: str = Query("", min_length=1), current_user: dict = Depends(get_current_user)):
    try:
        query = q.strip()
        if not query:
            raise HTTPException(status_code=422, detail={"success": False, "message": "Enter a name, officer ID, case number, or evidence keyword."})
        results = _indexed_results(current_user, query)
        return {"success": True, "query": query, "count": len(results), "results": results}
    except HTTPException:
        raise
    except Exception as err:
        print("[PERSONS SEARCH ERROR]", err)
        raise HTTPException(status_code=500, detail={"success": False, "message": str(err)})
