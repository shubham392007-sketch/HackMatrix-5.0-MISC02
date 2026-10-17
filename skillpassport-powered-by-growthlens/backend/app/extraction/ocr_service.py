import base64
import io
import re
from typing import Dict, Any, Optional, List
from pathlib import Path
import httpx

from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger

logger = get_logger("extraction.ocr")


def clean_text(text: str) -> str:
    """Normalizes whitespace and removes control characters."""
    if not text:
        return ""
    text = re.sub(r"[\r\t\f\v]", " ", text)
    text = re.sub(r" +", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


class UnifiedOCRService:
    """
    Production-grade Optical Character Recognition service.
    Combines:
    1. Local High-Speed Native OCR (Windows.Media.Ocr / winocr) for instant zero-latency processing.
    2. Vision-Language Optical Character Recognition (GLM-OCR / Ollama) for vision reasoning.
    3. Strict error auditing: never invents missing text or hallucinated competencies.
    """

    def __init__(self):
        self.settings = get_settings()
        self.ollama_url = self.settings.ollama_base_url.rstrip("/")
        self.model = getattr(self.settings, "ollama_ocr_model", "glm-ocr")

    async def is_model_available(self) -> bool:
        """Checks if the configured OCR model is pulled and ready in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.ollama_url}/api/tags")
                if resp.status_code == 200:
                    models = resp.json().get("models", [])
                    return any(self.model in m.get("name", "") for m in models)
        except Exception as e:
            logger.warning(f"Ollama tags check failed: {e}")
        return False

    async def _extract_with_winocr(
        self,
        image_bytes: bytes,
        page_number: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """Attempts native Windows Media OCR."""
        try:
            import winocr
            from PIL import Image
            img = Image.open(io.BytesIO(image_bytes))
            res = await winocr.recognize_pil(img, lang="en")
            raw_text = getattr(res, "text", "") or ""
            cleaned = clean_text(raw_text)
            if cleaned:
                logger.info(
                    f"WinOCR succeeded for page {page_number or 'unknown'}: "
                    f"{len(cleaned)} chars, {len(cleaned.split())} words"
                )
                return {
                    "success": True,
                    "text": cleaned,
                    "error": None,
                    "error_category": None,
                    "char_count": len(cleaned),
                    "word_count": len(cleaned.split()),
                    "ocr_engine": "Windows.Media.Ocr",
                }
            else:
                return {
                    "success": True,
                    "text": "",
                    "error": None,
                    "error_category": None,
                    "char_count": 0,
                    "word_count": 0,
                    "ocr_engine": "Windows.Media.Ocr",
                }
        except ImportError:
            logger.debug("winocr package not installed, skipping native OCR")
        except Exception as e:
            logger.debug(f"winocr recognition attempt failed: {e}")
        return None

    async def _extract_with_ollama(
        self,
        image_bytes: bytes,
        page_number: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Attempts Ollama Vision/GLM-OCR model."""
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        prompt = (
            "Extract all text from this document image exactly as written. "
            "Include certificate titles, recipient names, course names, issuing institutions, dates, credential IDs, and logos. "
            "Output ONLY the extracted text verbatim. Do not explain, summarize, or format in markdown."
        )

        try:
            # Keep timeout as None so it waits until Ollama completes entire processing
            async with httpx.AsyncClient(timeout=None) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt,
                                "images": [b64_image],
                            }
                        ],
                        "stream": False,
                        "options": {
                            "temperature": 0.0,
                            "num_predict": 1024,
                        },
                    },
                )

                if resp.status_code == 200:
                    raw_content = resp.json().get("message", {}).get("content", "")
                    cleaned = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
                    cleaned = re.sub(r"^```[a-z]*\s*", "", cleaned)
                    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

                    if cleaned:
                        logger.info(
                            f"Ollama GLM-OCR succeeded for page {page_number or 'unknown'}: "
                            f"{len(cleaned)} chars, {len(cleaned.split())} words"
                        )
                        return {
                            "success": True,
                            "text": cleaned,
                            "error": None,
                            "error_category": None,
                            "char_count": len(cleaned),
                            "word_count": len(cleaned.split()),
                            "ocr_engine": f"Ollama ({self.model})",
                        }
                    else:
                        return {
                            "success": False,
                            "text": "",
                            "error": "OCR model returned empty text for image",
                            "error_category": "EMPTY_OCR_RESULT",
                            "char_count": 0,
                            "word_count": 0,
                        }
                elif resp.status_code == 404:
                    return {
                        "success": False,
                        "text": "",
                        "error": f"OCR model '{self.model}' is not installed in Ollama",
                        "error_category": "OCR_MODEL_NOT_FOUND",
                        "char_count": 0,
                        "word_count": 0,
                    }
                else:
                    return {
                        "success": False,
                        "text": "",
                        "error": f"Ollama HTTP {resp.status_code}: {resp.text[:200]}",
                        "error_category": "OCR_API_ERROR",
                        "char_count": 0,
                        "word_count": 0,
                    }

        except httpx.ConnectError:
            return {
                "success": False,
                "text": "",
                "error": "Ollama service unavailable",
                "error_category": "OLLAMA_UNAVAILABLE",
                "char_count": 0,
                "word_count": 0,
            }
        except httpx.TimeoutException:
            return {
                "success": False,
                "text": "",
                "error": "OCR processing timed out",
                "error_category": "OCR_TIMEOUT",
                "char_count": 0,
                "word_count": 0,
            }
        except Exception as e:
            return {
                "success": False,
                "text": "",
                "error": str(e),
                "error_category": "OCR_INTERNAL_ERROR",
                "char_count": 0,
                "word_count": 0,
            }

    async def extract_text_from_image_bytes(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        page_number: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Executes multi-tier OCR on image bytes:
        Tier 1: Native Windows.Media.Ocr (winocr) - fast and local
        Tier 2: Ollama GLM-OCR vision model
        """
        if not image_bytes:
            return {
                "success": False,
                "text": "",
                "error": "Empty image bytes provided",
                "error_category": "EMPTY_INPUT",
                "char_count": 0,
                "word_count": 0,
            }

        # 1. First try native fast WinOCR (0.05s latency)
        win_res = await self._extract_with_winocr(image_bytes, page_number)
        if win_res is not None:
            return win_res

        # 2. Fallback to Ollama Vision / GLM-OCR only if WinOCR is unavailable (e.g. Linux container)
        ollama_res = None
        if await self.is_model_available():
            ollama_res = await self._extract_with_ollama(image_bytes, page_number)
            if ollama_res and ollama_res["success"]:
                return ollama_res

        # Return the Ollama failure reason or combined failure
        error_msg = ollama_res.get("error") if ollama_res else "OCR unavailable"
        error_cat = ollama_res.get("error_category") if ollama_res else "OCR_UNAVAILABLE"
        return {
            "success": False,
            "text": "",
            "error": error_msg,
            "error_category": error_cat,
            "char_count": 0,
            "word_count": 0,
        }

    async def ocr_fitz_page(self, page, page_number: int) -> Dict[str, Any]:
        """
        Renders a PyMuPDF page to high-DPI image and runs OCR.
        """
        try:
            # 1. If page contains a single dominant high-res background image, try that first
            images = page.get_images()
            if len(images) == 1:
                xref = images[0][0]
                base_img = page.parent.extract_image(xref)
                if base_img and base_img.get("image"):
                    result = await self.extract_text_from_image_bytes(
                        base_img["image"],
                        mime_type=f"image/{base_img.get('ext', 'png')}",
                        page_number=page_number,
                    )
                    if result["success"]:
                        return result

            # 2. Render entire page to pixmap at 150 DPI
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            return await self.extract_text_from_image_bytes(
                img_bytes,
                mime_type="image/png",
                page_number=page_number,
            )
        except Exception as e:
            logger.error(f"Failed to render fitz page {page_number} for OCR: {e}")
            return {
                "success": False,
                "text": "",
                "error": f"Page render failed: {str(e)}",
                "error_category": "RENDER_FAILED",
                "char_count": 0,
                "word_count": 0,
            }


ocr_service = UnifiedOCRService()
