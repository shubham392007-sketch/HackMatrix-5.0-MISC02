import io
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.document import UploadedDocument, DocumentChunk
from backend.app.models.evidence import EvidenceItem
from backend.app.models.readme import RepositoryReadmeSnapshot
from backend.app.models.web_crawl import WebCrawlRecord
from backend.app.models.connection import ConnectedSource, SelectedResource
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.storage.file_storage import storage_manager, LOCAL_STORAGE_BASE

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer sp_demo_alexchen_valid"}
DEMO_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
OTHER_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000099")


@pytest.fixture
def test_vault_data():
    """Sets up genuine test records in the database and cleans up afterward."""
    db = SessionLocal()

    # 1. Uploaded Document for Demo User
    doc_id = uuid.uuid4()
    pdf_bytes = b"%PDF-1.4 Vault Test PDF Content"
    sha256 = storage_manager.calculate_sha256(pdf_bytes)
    storage_key = f"{DEMO_USER_ID}/{sha256[:8]}_{doc_id.hex}.pdf"

    # Save physical file in storage
    local_path = LOCAL_STORAGE_BASE / str(DEMO_USER_ID)
    local_path.mkdir(parents=True, exist_ok=True)
    file_dest = local_path / f"{sha256[:8]}_{doc_id.hex}.pdf"
    with open(file_dest, "wb") as f:
        f.write(pdf_bytes)

    doc = UploadedDocument(
        id=doc_id,
        owner_user_id=DEMO_USER_ID,
        original_filename="vault_certificate.pdf",
        mime_type="application/pdf",
        file_size_bytes=len(pdf_bytes),
        sha256_hash=sha256,
        evidence_category="certificate",
        storage_bucket="evidence-vault",
        private_storage_key=storage_key,
        processing_state="completed",
        extraction_summary="Vault Test Certificate for Senior Architect",
        user_metadata={"title": "Vault Senior Architect Certificate"},
    )
    db.add(doc)

    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc_id,
        page_or_slide_number=1,
        section_title="Page 1",
        chunk_index=0,
        original_text="Vault Test Certificate for Senior Architect",
        normalized_text="Vault Test Certificate for Senior Architect",
        extraction_method="pymupdf",
        chunk_hash=sha256,
    )
    db.add(chunk)

    # 2. Web Crawl Record for Demo User
    crawl_id = uuid.uuid4()
    crawl = WebCrawlRecord(
        id=crawl_id,
        owner_user_id=DEMO_USER_ID,
        submitted_url="https://vault-test.example.com/",
        final_url="https://vault-test.example.com/",
        page_title="Vault Engineering Portfolio",
        content_hash="crawlhash12345",
        crawl_depth=0,
        http_status=200,
        extraction_status="extracted",
        extracted_headings={"headings": ["Cloud Architecture", "Distributed Consensus"]},
        cleaned_content="Vault Engineering Portfolio. Deep experience in high-throughput distributed systems.",
        discovered_links={"source": "seed"},
    )
    db.add(crawl)

    # 3. Repository README Snapshot for Demo User
    # First create ConnectedSource and SelectedResource for foreign key
    conn_id = uuid.uuid4()
    conn = ConnectedSource(
        id=conn_id,
        owner_user_id=DEMO_USER_ID,
        provider="github",
        account_identity="alexchen",
        connection_status="connected",
        encrypted_credentials="enc_token",
    )
    db.add(conn)

    res_id = uuid.uuid4()
    resource = SelectedResource(
        id=res_id,
        connection_id=conn_id,
        external_resource_id="alexchen/distributed-vault",
        name="distributed-vault",
        url="https://github.com/alexchen/distributed-vault",
        is_selected=True,
    )
    db.add(resource)

    readme_id = uuid.uuid4()
    readme = RepositoryReadmeSnapshot(
        id=readme_id,
        owner_user_id=DEMO_USER_ID,
        selected_resource_id=res_id,
        repo_full_name="alexchen/distributed-vault",
        connection_id=conn_id,
        readme_path="README.md",
        raw_content="# Distributed Vault\n\nHigh-performance fault-tolerant storage engine.",
        extracted_summary="High-performance fault-tolerant storage engine.",
        sync_status="success",
        is_current=True,
    )
    db.add(readme)

    # 4. Artifact belonging to OTHER user (for cross-user isolation test)
    other_doc_id = uuid.uuid4()
    other_doc = UploadedDocument(
        id=other_doc_id,
        owner_user_id=OTHER_USER_ID,
        original_filename="confidential_other_user.pdf",
        mime_type="application/pdf",
        file_size_bytes=500,
        sha256_hash="other_hash_500",
        evidence_category="resume",
        storage_bucket="evidence-vault",
        private_storage_key=f"{OTHER_USER_ID}/other.pdf",
        processing_state="completed",
        extraction_summary="Confidential Resume of Other User",
    )
    db.add(other_doc)

    db.commit()

    yield {
        "doc_id": doc_id,
        "crawl_id": crawl_id,
        "readme_id": readme_id,
        "other_doc_id": other_doc_id,
        "file_dest": file_dest,
    }

    # Cleanup
    try:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
        db.query(UploadedDocument).filter(UploadedDocument.id.in_([doc_id, other_doc_id])).delete()
        db.query(WebCrawlRecord).filter(WebCrawlRecord.id == crawl_id).delete()
        db.query(RepositoryReadmeSnapshot).filter(RepositoryReadmeSnapshot.id == readme_id).delete()
        db.query(SelectedResource).filter(SelectedResource.id == res_id).delete()
        db.query(ConnectedSource).filter(ConnectedSource.id == conn_id).delete()
        db.commit()
    except Exception:
        pass
    finally:
        db.close()
        if file_dest.exists():
            file_dest.unlink()


def test_vault_summary_endpoint(test_vault_data):
    """Test that summary accurately counts genuine persisted user artifacts."""
    res = client.get("/api/v1/vault/summary", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["total_artifacts"] >= 3
    assert data["uploaded_documents"] >= 1
    assert data["web_snapshots"] >= 1
    assert data["repository_artifacts"] >= 1
    assert data["storage_used_bytes"] > 0


def test_vault_list_artifacts_with_filters(test_vault_data):
    """Test listing artifacts with category filters, search, and pagination."""
    # List all
    res = client.get("/api/v1/vault/artifacts", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 3

    # Filter certificates
    res_cert = client.get("/api/v1/vault/artifacts?category=certificates", headers=AUTH_HEADERS)
    assert res_cert.status_code == 200
    cert_items = res_cert.json()["items"]
    assert all(item["category"] == "certificate" for item in cert_items)

    # Filter web snapshots
    res_web = client.get("/api/v1/vault/artifacts?category=web_snapshots", headers=AUTH_HEADERS)
    assert res_web.status_code == 200
    web_items = res_web.json()["items"]
    assert any(item["artifact_type"] == "web_snapshot" for item in web_items)

    # Search query
    res_search = client.get("/api/v1/vault/artifacts?search=Engineering+Portfolio", headers=AUTH_HEADERS)
    assert res_search.status_code == 200
    search_items = res_search.json()["items"]
    assert any("Engineering Portfolio" in item["title"] for item in search_items)


def test_vault_artifact_detail_and_chunks(test_vault_data):
    """Test detailed view of single artifact with extracted chunks and provenance."""
    doc_id = str(test_vault_data["doc_id"])
    res = client.get(f"/api/v1/vault/artifacts/uploaded_document/{doc_id}", headers=AUTH_HEADERS)
    assert res.status_code == 200
    detail = res.json()

    assert detail["id"] == doc_id
    assert detail["artifact_type"] == "uploaded_document"
    assert detail["has_original_file"] is True
    assert len(detail["chunks"]) == 1
    assert "Vault Test Certificate" in detail["chunks"][0]["original_text"]
    assert detail["provenance"]["sha256"] is not None


def test_vault_preview_pdf_stream(test_vault_data):
    """Test preview streaming endpoint returns PDF bytes and inline headers."""
    doc_id = str(test_vault_data["doc_id"])
    res = client.get(f"/api/v1/vault/artifacts/uploaded_document/{doc_id}/preview-file", headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert "application/pdf" in res.headers["content-type"]
    assert "inline" in res.headers["content-disposition"]
    assert res.content == b"%PDF-1.4 Vault Test PDF Content"


def test_vault_download_endpoint(test_vault_data):
    """Test download endpoint returns original bytes with attachment disposition."""
    doc_id = str(test_vault_data["doc_id"])
    res = client.get(f"/api/v1/vault/artifacts/uploaded_document/{doc_id}/download", headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert "attachment" in res.headers["content-disposition"]
    assert res.content == b"%PDF-1.4 Vault Test PDF Content"


def test_vault_web_snapshot_preview_and_download(test_vault_data):
    """Test preview and download of immutable web snapshot."""
    crawl_id = str(test_vault_data["crawl_id"])

    # Preview
    res_prev = client.get(f"/api/v1/vault/artifacts/web_snapshot/{crawl_id}/preview-file", headers=AUTH_HEADERS)
    assert res_prev.status_code == 200
    assert "Vault Engineering Portfolio" in res_prev.text

    # Download
    res_dl = client.get(f"/api/v1/vault/artifacts/web_snapshot/{crawl_id}/download", headers=AUTH_HEADERS)
    assert res_dl.status_code == 200
    assert "attachment" in res_dl.headers["content-disposition"]
    assert "Vault Engineering Portfolio" in res_dl.text


def test_vault_readme_snapshot_preview(test_vault_data):
    """Test preview of repository README snapshot."""
    readme_id = str(test_vault_data["readme_id"])
    res = client.get(f"/api/v1/vault/artifacts/repository_readme/{readme_id}/preview-file", headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert "text/markdown" in res.headers["content-type"]
    assert "# Distributed Vault" in res.text


def test_cross_user_isolation(test_vault_data):
    """Verify that user cannot retrieve or preview an artifact belonging to another user."""
    other_doc_id = str(test_vault_data["other_doc_id"])

    # Attempt to retrieve other user's artifact detail
    res_detail = client.get(f"/api/v1/vault/artifacts/uploaded_document/{other_doc_id}", headers=AUTH_HEADERS)
    assert res_detail.status_code == 404

    # Attempt to preview other user's file
    res_prev = client.get(f"/api/v1/vault/artifacts/uploaded_document/{other_doc_id}/preview-file", headers=AUTH_HEADERS)
    assert res_prev.status_code == 404

    # Attempt to download other user's file
    res_dl = client.get(f"/api/v1/vault/artifacts/uploaded_document/{other_doc_id}/download", headers=AUTH_HEADERS)
    assert res_dl.status_code == 404
