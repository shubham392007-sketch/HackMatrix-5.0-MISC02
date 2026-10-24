import os
import hashlib
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger

logger = get_logger("storage")

# Default local storage location
LOCAL_STORAGE_BASE = Path(__file__).resolve().parent.parent.parent / "data" / "evidence_vault"


class StorageManager:
    def __init__(self):
        self.settings = get_settings()
        self.bucket_name = "evidence-vault"
        LOCAL_STORAGE_BASE.mkdir(parents=True, exist_ok=True)

    def calculate_sha256(self, file_bytes: bytes) -> str:
        """Calculates SHA-256 hash of byte content."""
        return hashlib.sha256(file_bytes).hexdigest()

    async def save_file(
        self,
        file_bytes: bytes,
        original_filename: str,
        mime_type: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Stores file bytes persistently.
        Saves locally in a structured directory and attempts Supabase Storage if available.
        """
        sha256 = self.calculate_sha256(file_bytes)
        file_size = len(file_bytes)
        ext = Path(original_filename).suffix.lower()
        file_uuid = uuid.uuid4().hex
        
        # User-partitioned storage key
        storage_key = f"{user_id}/{sha256[:8]}_{file_uuid}{ext}"
        
        # Always write to local vault for immediate fast access and resilience
        local_path = LOCAL_STORAGE_BASE / user_id
        local_path.mkdir(parents=True, exist_ok=True)
        file_dest = local_path / f"{sha256[:8]}_{file_uuid}{ext}"
        
        with open(file_dest, "wb") as f:
            f.write(file_bytes)
            
        logger.info(f"Saved file {original_filename} ({file_size} bytes) to local storage {file_dest}")

        # Attempt Supabase Storage upload if credentials exist
        supabase_uploaded = False
        try:
            from supabase import create_client
            if self.settings.supabase_url and self.settings.supabase_service_role_key:
                supabase = create_client(self.settings.supabase_url, self.settings.supabase_service_role_key)
                # Upload to bucket
                res = supabase.storage.from_(self.bucket_name).upload(
                    path=storage_key,
                    file=file_bytes,
                    file_options={"content-type": mime_type, "upsert": "true"}
                )
                supabase_uploaded = True
                logger.info(f"File uploaded to Supabase Storage: {storage_key}")
        except Exception as e:
            logger.warning(f"Supabase Storage upload skipped/failed (using local vault): {e}")

        return {
            "storage_bucket": self.bucket_name,
            "private_storage_key": storage_key,
            "sha256_hash": sha256,
            "file_size_bytes": file_size,
            "local_path": str(file_dest),
            "supabase_uploaded": supabase_uploaded,
        }

    def retrieve_file(self, storage_key: str) -> Optional[bytes]:
        """Retrieves raw file bytes by storage key."""
        # Try local first
        parts = storage_key.split("/")
        if len(parts) == 2:
            local_target = LOCAL_STORAGE_BASE / parts[0] / parts[1]
            if local_target.exists():
                with open(local_target, "rb") as f:
                    return f.read()

        # Try searching local storage
        for file in LOCAL_STORAGE_BASE.glob(f"**/*{Path(storage_key).name}"):
            if file.is_file():
                with open(file, "rb") as f:
                    return f.read()

        # Try Supabase Storage download if credentials available
        try:
            from supabase import create_client
            if self.settings.supabase_url and self.settings.supabase_service_role_key:
                supabase = create_client(self.settings.supabase_url, self.settings.supabase_service_role_key)
                file_bytes = supabase.storage.from_(self.bucket_name).download(storage_key)
                if file_bytes:
                    return file_bytes
        except Exception as e:
            logger.debug(f"Supabase Storage download fallback skipped/failed for {storage_key}: {e}")

        return None

    def delete_file(self, storage_key: str) -> bool:
        """Deletes file from local storage and Supabase Storage if present."""
        deleted = False
        try:
            parts = storage_key.split("/")
            if len(parts) == 2:
                local_target = LOCAL_STORAGE_BASE / parts[0] / parts[1]
                if local_target.exists():
                    local_target.unlink()
                    deleted = True

            for file in LOCAL_STORAGE_BASE.glob(f"**/*{Path(storage_key).name}"):
                if file.is_file():
                    try:
                        file.unlink()
                        deleted = True
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"Error removing local file for {storage_key}: {e}")

        try:
            from supabase import create_client
            if self.settings.supabase_url and self.settings.supabase_service_role_key:
                supabase = create_client(self.settings.supabase_url, self.settings.supabase_service_role_key)
                supabase.storage.from_(self.bucket_name).remove([storage_key])
        except Exception as e:
            logger.debug(f"Supabase Storage deletion skipped/failed: {e}")

        return deleted


storage_manager = StorageManager()
