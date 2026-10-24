import os
import sys
import uuid
from pathlib import Path

# Ensure paths
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.evidence import EvidenceItem
from backend.app.models.document import UploadedDocument, DocumentChunk
from backend.app.models.taxonomy import EvidenceCompetencyMapping
from backend.app.rag.chroma import chroma_store

def run_test():
    client = TestClient(app)
    db = SessionLocal()
    user_id = "00000000-0000-0000-0000-000000000001"

    print("=== Step 1: Health Check ===")
    res = client.get("/api/v1/health/live")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("Health check OK:", res.json().get("status"))

    print("\n=== Step 2: Upload a Test Document ===")
    test_content = (
        b"Software Engineer Resume\n\n"
        b"Expert in Python, FastAPI, Docker, and PostgreSQL.\n"
        b"Built distributed RAG microservices and managed cloud deployments with Kubernetes.\n"
        b"Implemented CI/CD pipelines and automated integration tests."
    )
    files = {
        "file": ("skill_passport_test_doc.txt", test_content, "text/plain")
    }
    data = {
        "category": "resume",
        "title": "Software Engineer Resume Test",
    }

    upload_res1 = client.post("/api/v1/documents/upload", files=files, data=data)
    print("Upload 1 Status:", upload_res1.status_code)
    assert upload_res1.status_code == 200, f"Upload 1 failed: {upload_res1.text}"
    upload_data1 = upload_res1.json()
    print("Upload 1 Result:", upload_data1.get("status"), "Doc ID:", upload_data1.get("document_id"), "Evidence ID:", upload_data1.get("evidence_id"))

    doc_id_1 = upload_data1.get("document_id")
    ev_id_1 = upload_data1.get("evidence_id")
    assert doc_id_1 is not None, "Document ID missing"
    assert ev_id_1 is not None, "Evidence ID missing"

    # Verify DB state
    db_item = db.query(EvidenceItem).filter(EvidenceItem.id == uuid.UUID(ev_id_1)).first()
    assert db_item is not None, "EvidenceItem not found in DB"
    db_doc = db.query(UploadedDocument).filter(UploadedDocument.id == uuid.UUID(doc_id_1)).first()
    assert db_doc is not None, "UploadedDocument not found in DB"
    db_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == uuid.UUID(doc_id_1)).all()
    print(f"Verified DB: 1 EvidenceItem, 1 UploadedDocument, {len(db_chunks)} chunks")

    # Verify ChromaDB has vector
    chroma_hits = chroma_store.search_evidence("Python FastAPI Docker", user_id, n_results=5)
    print(f"ChromaDB hits before delete: {len(chroma_hits)}")

    print("\n=== Step 3: Delete Evidence via DELETE /api/v1/evidence/{evidence_id} ===")
    del_res = client.delete(f"/api/v1/evidence/{ev_id_1}")
    print("Delete Status:", del_res.status_code)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    del_json = del_res.json()
    print("Delete Response:", del_json)
    assert del_json.get("status") == "deleted"

    # Verify evidence item is completely gone from DB
    db.expire_all()
    db_item_after = db.query(EvidenceItem).filter(EvidenceItem.id == uuid.UUID(ev_id_1)).first()
    assert db_item_after is None, "EvidenceItem still exists in DB after deletion!"
    
    # Verify document is cleaned up
    db_doc_after = db.query(UploadedDocument).filter(UploadedDocument.id == uuid.UUID(doc_id_1)).first()
    assert db_doc_after is None, "UploadedDocument still exists in DB after deletion!"

    # Verify chunks are gone
    db_chunks_after = db.query(DocumentChunk).filter(DocumentChunk.document_id == uuid.UUID(doc_id_1)).all()
    assert len(db_chunks_after) == 0, "DocumentChunks still exist after deletion!"

    # Verify mappings are gone
    db_mappings_after = db.query(EvidenceCompetencyMapping).filter(EvidenceCompetencyMapping.evidence_id == uuid.UUID(ev_id_1)).all()
    assert len(db_mappings_after) == 0, "Competency mappings still exist after deletion!"

    print("Verified DB: All relational records and document chunks cleanly deleted.")

    print("\n=== Step 4: Re-upload the EXACT SAME file ===")
    files2 = {
        "file": ("skill_passport_test_doc.txt", test_content, "text/plain")
    }
    data2 = {
        "category": "resume",
        "title": "Software Engineer Resume Test Re-upload",
    }
    upload_res2 = client.post("/api/v1/documents/upload", files=files2, data=data2)
    print("Upload 2 Status:", upload_res2.status_code)
    assert upload_res2.status_code == 200, f"Re-upload failed: {upload_res2.text}"
    upload_data2 = upload_res2.json()
    print("Upload 2 Result:", upload_data2.get("status"), "Doc ID:", upload_data2.get("document_id"), "Evidence ID:", upload_data2.get("evidence_id"))

    assert upload_data2.get("status") == "success", f"Expected 'success' but got {upload_data2.get('status')}"
    ev_id_2 = upload_data2.get("evidence_id")
    doc_id_2 = upload_data2.get("document_id")
    assert ev_id_2 is not None, "New Evidence ID missing on re-upload"
    assert doc_id_2 is not None, "New Document ID missing on re-upload"

    # Verify new DB records
    db.expire_all()
    db_item_2 = db.query(EvidenceItem).filter(EvidenceItem.id == uuid.UUID(ev_id_2)).first()
    assert db_item_2 is not None, "New EvidenceItem not found in DB"
    assert db_item_2.title == "Software Engineer Resume Test Re-upload"

    print("\n=== Step 5: Verify Evidence Listing Endpoint ===")
    list_res = client.get("/api/v1/evidence")
    assert list_res.status_code == 200
    items = list_res.json().get("items", [])
    print(f"Evidence list returned {len(items)} items")
    assert any(i["id"] == ev_id_2 for i in items), "Re-added evidence item not in list results"

    print("\n=== Step 6: Clean up test record ===")
    cleanup_res = client.delete(f"/api/v1/evidence/{ev_id_2}")
    assert cleanup_res.status_code == 200
    print("Cleaned up re-uploaded test record. Database left clean.")

    db.close()
    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_test()
